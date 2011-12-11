// https://github.com/felixge/node-mysql

var mysql = require('mysql');
var bcrypt = require('bcrypt');
var config = require('./config');
var sha256 = require('./sha256');

var db = exports;


var client = mysql.createClient(config.db);

db.get_point = function (hash, callback) {
    client.query(
        'SELECT hash, text FROM Points WHERE hash = ?',
        [ hash ],
        function (err, results, fields) {
            callback(err, results && results[0]);
        }
    );
};

db.get_point_with_stance = function (hash, username, callback) {
    client.query(
        'SELECT p.hash AS hash, p.text AS text, ps.stance AS stance ' +
        '  FROM Points p LEFT OUTER JOIN ' +
        '    (SELECT * FROM PStances WHERE username = ?) ps ' +
        '  ON p.hash = ps.point_hash ' +
        '  WHERE p.hash = ?',
        [ username, hash ],
        function (err, results, fields) {
            callback(err, results && results[0]);
        }
    );
};

db.get_recent_points = function (username, callback) {
    client.query(
        'SELECT p.hash, p.text, ps.stance ' +
        '  FROM Points p ' +
        '  LEFT OUTER JOIN ' +
        '    (SELECT * FROM PStances WHERE username = ?) ps ' +
        '    ON ps.point_hash = p.hash ' +
        '  ORDER BY p.create_time DESC',
        [ username ],
        function (err, results, fields) {
            callback(err, results);
        }
    );
};

db.get_premises_for_conclusion = function (conclusion_hash, username, callback) {
    client.query(
        'SELECT p.hash, p.text, rs.supports, ps.stance ' +
        '  FROM RelevanceScores rs ' +
        '  JOIN Points p ON rs.premise_hash = p.hash ' +
        '  LEFT OUTER JOIN ' +
        '    (SELECT * FROM PStances WHERE username = ?) ps ' +
        '    ON ps.point_hash = p.hash ' +
        '  WHERE ' +
        '    rs.username = ? ' +
        '    AND rs.conclusion_hash = ? ' +
        '    AND rs.upvotes AND NOT rs.mydownvotes',
        [ username, username || '', conclusion_hash ],
        callback
    );
};

db.get_conclusions_for_premise = function (premise_hash, username, callback) {
    client.query(
        'SELECT p.hash, p.text, rs.supports, ps.stance ' +
        '  FROM RelevanceScores rs ' +
        '  JOIN Points p ON rs.conclusion_hash = p.hash ' +
        '  LEFT OUTER JOIN ' +
        '    (SELECT * FROM PStances WHERE username = ?) ps ' +
        '    ON ps.point_hash = p.hash ' +
        '  WHERE ' +
        '    rs.username = ? ' +
        '    AND rs.premise_hash = ? ' +
        '    AND rs.upvotes AND NOT rs.mydownvotes',
        [ username, username || '', premise_hash ],
        callback
    );
};

// callback(err, opinions)
db.get_opinions = function (hash, callback) {
    client.query(
        'SELECT u.username, u.fullname, u.email, ps.stance ' +
        '  FROM PStances ps JOIN Users u ' +
        '  ON ps.username = u.username ' +
        '  WHERE ps.point_hash = ?',
        [ hash ],
        callback
    );
};

db.add_premise = function (conclusion_hash, text, supports, username, callback) {
    db.create_point(text, function (err, premise_hash) {
        if (err) {
            return callback(err);
        }
        db.set_relevance_vote(
            username, conclusion_hash, premise_hash, supports, 1,
            function (err) {
                callback(err, premise_hash);
            }
        );
    });
};

db.normalise_email = function (email) {
    return email.trim().toLowerCase();
};

// callback(err, username_exists)
db.add_user = function (username, fullname, email, password, callback) {
    email = db.normalise_email(email);
    db.get_user(username, function (err, user) {
        if (err) {
            return callback(err);
        }
        if (user) {
            // username already registered
            return callback(null, true);
        }
        var salt = bcrypt.gen_salt_sync(10);
        bcrypt.encrypt(password, salt, function (err, password_hash) {
            if (err) {
                return callback(err);
            }
            client.query(
                'INSERT INTO Users SET ' +
                '  username = ?, fullname = ?, email = ?, password_hash = ?',
                [ username, fullname, email, password_hash ],
                function (err) {
                    callback(err, false);
                }
            );
        });
    });
};

// callback(err, user or null)
db.get_user = function (username, callback) {
    client.query(
        'SELECT username, fullname, email, password_hash ' +
        '  FROM Users WHERE username = ?',
        [ username ],
        function (err, results, fields) {
            callback(err, results && results[0]);
        }
    );
};

// callback(err, user or null)
db.authenticate_user = function (username, password, callback) {
    db.get_user(username, function (err, user) {
        if (err || !user) {
            return callback(err);
        }
        bcrypt.compare(password, user.password_hash, function(err, result) {
            callback(err, result ? user : null);
        });
    });
};

// callback(err)
db.set_pstance = function (username, hash, stance, callback) {
    client.query(
        'REPLACE INTO PStances ' +
        '  SET username = ?, point_hash = ?, stance = ?',
        [ username, hash, stance || 0 ],
        callback
    );
};

// callback(err, hash)
db.create_point = function (text, callback) {
    text = ('' + text).trim().replace(/\s+/g, ' ');
    var hash = sha256(text);
    client.query(
        'INSERT INTO Points SET hash = ?, text = ? ' +
        ' ON DUPLICATE KEY UPDATE hash = hash',
        [ hash, text ],
        function (err) {
            callback(err, hash);
        }
    );
};

// callback(err, points)
// http://www.slideshare.net/billkarwin/practical-full-text-search-with-my-sql
db.search = function (query, callback) {
    client.query(
        'SELECT hash, text FROM Points WHERE MATCH(text) AGAINST(?)',
        [ '' + query ],
        callback
    );
};

// callback(err)
db.set_relevance_vote = function (username, conclusion_hash, premise_hash, supports, relevant, callback) {
    client.query(
        'REPLACE INTO RelevanceVotes SET ' +
        '  conclusion_hash = ?, ' +
        '  premise_hash = ?, ' +
        '  username = ?, ' +
        '  supports = ?, ' +
        '  relevant = ?',
        [ conclusion_hash, premise_hash, username || '', supports, relevant ],
        callback
    );
};
