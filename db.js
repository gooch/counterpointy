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

db.get_point_with_stance = function (hash, user_id, callback) {
    client.query(
        'SELECT p.hash AS hash, p.text AS text, ps.stance AS stance ' +
        '  FROM Points p LEFT OUTER JOIN ' +
        '    (SELECT * FROM PStances WHERE user_id = ?) ps ' +
        '  ON p.hash = ps.point_hash ' +
        '  WHERE p.hash = ?',
        [ user_id, hash ],
        function (err, results, fields) {
            callback(err, results && results[0]);
        }
    );
};

db.get_all_points = function (callback) {
    client.query(
        'SELECT hash, text FROM Points',
        [],
        function (err, results, fields) {
            callback(err, results);
        }
    );
};

db.get_reasons_for_conclusion = function (conclusion_hash, callback) {
    client.query(
        'SELECT p.hash, p.text, r.supports ' +
        ' FROM Reasons r JOIN Points p ' +
        ' ON r.premise_hash = p.hash ' +
        ' WHERE r.conclusion_hash = ?',
        [ conclusion_hash ],
        function (err, results, fields) {
            callback(err, results);
        }
    );
};

db.add_premise = function (conclusion_hash, text, supports, callback) {
    text = text.trim();
    var premise_hash = sha256('' + text);
    var reason_hash = sha256(premise_hash + supports + conclusion_hash);
    client.query(
        'INSERT INTO Points SET hash = ?, text = ? ' +
        ' ON DUPLICATE KEY UPDATE hash = hash',
        [ premise_hash, text ],
        function (err) {
            if (err) {
                return callback(err);
            }
            client.query(
                'INSERT INTO Reasons SET ' +
                '  reason_hash = ?, ' +
                '  premise_hash = ?, ' +
                '  conclusion_hash = ?, ' +
                '  supports = ? ' +
                '  ON DUPLICATE KEY UPDATE reason_hash = reason_hash',
                [ reason_hash, premise_hash, conclusion_hash, supports ],
                function (err) {
                    callback(err, premise_hash, reason_hash);
                }
            );
        }
    );
};

db.normalise_email = function (email) {
    return email.trim().toLowerCase();
};

// callback(err, user_id)
db.add_user = function (fullname, email, password, callback) {
    email = db.normalise_email(email);
    db.get_user_by_email(email, function (err, user) {
        if (err) {
            return callback(err);
        }
        if (user) {
            // email already registered
            return callback(null, 'already registered' );
        }
        var salt = bcrypt.gen_salt_sync(10);
        bcrypt.encrypt(password, salt, function (err, password_hash) {
            if (err) {
                return callback(err);
            }
            client.query(
                'INSERT INTO Users SET ' +
                '  fullname = ?, email = ?, password_hash = ?',
                [ fullname, email, password_hash ],
                function (err, info) {
                    callback(err, info.insertId);
                }
            );
        });
    });
};

// callback(err, user or null)
db.get_user_by_email = function (email, callback) {
    email = db.normalise_email(email);
    client.query(
        'SELECT user_id, fullname, email, password_hash ' +
        '  FROM Users WHERE email = ?',
        [ email ],
        function (err, results, fields) {
            callback(err, results && results[0]);
        }
    );
};

// callback(err, user or null)
db.authenticate_user = function (email, password, callback) {
    db.get_user_by_email(email, function (err, user) {
        if (err || !user) {
            return callback(err);
        }
        bcrypt.compare(password, user.password_hash, function(err, result) {
            callback(err, result ? user : null);
        });
    });
};

