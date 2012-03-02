// https://github.com/felixge/node-mysql

var mysql = require('mysql');
var bcrypt = require('bcrypt');
var crypto = require('crypto');
var config = require('./config');
var sha256 = require('./sha256');

var db = exports;

db.valid_username = /^[a-z0-9_]{3,15}$/i;
db.valid_hash = /^[0-9a-f]{64}$/i;
db.valid_hashprefix = /^[0-9a-f]{12,64}$/i;

var client = mysql.createClient(config.db);

db.end = function () {
    client.end();
};

db.get_point = function (hash, callback) {
    client.query(
        'SELECT hash, text FROM Points WHERE hash = ?',
        [ hash ],
        function (err, results, fields) {
            callback(err, results && results[0]);
        }
    );
};

// callback(err, points)
db.get_point_and_stance = function (hash, username, callback) {
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

// callback(err, points)
db.get_points_and_stances = function (hashprefix, username, callback) {
    hashprefix = '' + hashprefix;
    // require at least 48 bits of hash
    if (hashprefix.length < 12) {
        return callback(null, []);
    }
    client.query(
        'SELECT p.hash AS hash, p.text AS text, ps.stance AS stance ' +
        '  FROM Points p LEFT OUTER JOIN ' +
        '    (SELECT * FROM PStances WHERE username = ?) ps ' +
        '  ON p.hash = ps.point_hash ' +
        '  WHERE p.hash LIKE ?',
        [ username, hashprefix + '%' ],
        callback
    );
};

// callback(err, points)
db.get_featured_points = function (username, callback) {
    client.query(
        'SELECT p.hash, p.text, ps.stance ' +
        '  FROM FeaturedPoints f ' +
        '  JOIN Points p ON f.point_hash = p.hash ' +
        '  LEFT OUTER JOIN ' +
        '    (SELECT * FROM PStances WHERE username = ?) ps ' +
        '  ON p.hash = ps.point_hash ',
        [ username ],
        callback
    );
};

// callback(err, points)
db.get_recent_points = function (username, callback) {
    client.query(
        'SELECT p.hash, p.text, ps.stance ' +
        '  FROM Points p ' +
        '  LEFT OUTER JOIN ' +
        '    (SELECT * FROM PStances WHERE username = ?) ps ' +
        '    ON ps.point_hash = p.hash ' +
        '  ORDER BY p.create_time DESC' +
        '  LIMIT 10',
        [ username ],
        function (err, results, fields) {
            callback(err, results);
        }
    );
};

db.get_premises_for_conclusion = function (conclusion_hash, username, callback) {
    client.query(
        'SELECT p.hash AS hash ' +
        '     , p.text AS text ' +
        '     , rs.supports AS supports ' +
        '     , ps.stance AS stance ' +
        '     , rs.myupvotes as myupvotes ' +
        '     , rs.mydownvotes as mydownvotes ' +
        '     , rs.upvotes as upvotes ' +
        '     , rs.downvotes as downvotes ' +
        '  FROM RelevanceScores rs ' +
        '  JOIN Points p ON rs.premise_hash = p.hash ' +
        '  LEFT OUTER JOIN ' +
        '    (SELECT * FROM PStances WHERE username = ?) ps ' +
        '    ON ps.point_hash = p.hash ' +
        '  WHERE ' +
        '    rs.username = ? ' +
        '    AND rs.conclusion_hash = ? ' +
        '    AND rs.upvotes ' + // 'AND NOT rs.mydownvotes ' +
        '  ORDER BY myupvotes - mydownvotes DESC, upvotes - downvotes DESC',
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

// callback(err, pvotes)
db.count_pvotes = function (hash, callback) {
    client.query(
        'SELECT SUM(stance > 0) AS truecount ' +
        '     , SUM(stance < 0) AS falsecount ' +
        '  FROM PStances ' +
        '  WHERE point_hash = ? ',
        [ hash ],
        function (err, results) {
            callback(err, {
                truecount: results[0].truecount || 0,
                falsecount: results[0].falsecount || 0
            });
        }
    );
};

db.add_premise = function (conclusion_hash, text, supports, username, callback) {
    db.create_point(text, username, function (err, premise_hash) {
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

// callback(err, password_hash)
db.hash_password = function (password, callback) {
    var salt = bcrypt.gen_salt_sync(10);
    bcrypt.encrypt(password, salt, callback);
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
        db.hash_password(password, function (err, password_hash) {
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

// callback(err)
db.set_user_password = function (username, password, callback) {
    db.hash_password(password, function (err, password_hash) {
        if (err) {
            return callback(err);
        }
        client.query(
            'UPDATE Users SET ' +
            '  password_hash = ? ' +
            '  WHERE username = ? LIMIT 1',
            [ password_hash, username ],
            callback
        );
    });
};

// callback(err, user or falsy)
db.get_user = function (username, callback) {
    if (!db.valid_username.test(username)) {
        return callback();
    }
    client.query(
        'SELECT username, fullname, email, password_hash ' +
        '  FROM Users WHERE username = ?',
        [ username ],
        function (err, results, fields) {
            callback(err, results && results[0]);
        }
    );
};

// callback(err, user or falsy)
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
        [ username, hash, stance ],
        callback
    );
};

// callback(err)
db.default_pstance = function (username, hash, stance, callback) {
    if (!stance) {
        return callback();
    }
    client.query(
        'INSERT INTO PStances ' +
        '  SET username = ?, point_hash = ?, stance = ? ' +
        '  ON DUPLICATE KEY UPDATE username = username',
        [ username, hash, stance ],
        callback
    );
};

// callback(err)
db.delete_pstance = function (username, hash, callback) {
    client.query(
        'DELETE FROM PStances ' +
        '  WHERE username = ? AND point_hash = ? ' +
        '  LIMIT 1',
        [ username, hash ],
        callback
    );
};

// callback(err, hash)
db.create_point = function (text, username, callback) {
    text = ('' + text).trim().replace(/\s+/g, ' ');
    var hash = sha256(text);
    client.query(
        'INSERT INTO Points SET hash = ?, text = ?, username = ? ' +
        ' ON DUPLICATE KEY UPDATE hash = hash',
        [ hash, text, username ],
        function (err) {
            callback(err, hash);
        }
    );
};

// callback(err, points)
// http://www.slideshare.net/billkarwin/practical-full-text-search-with-my-sql
db.search = function (username, query, callback) {
    client.query(
        'SELECT p.hash, p.text, ps.stance ' +
        '  FROM Points p ' +
        '  LEFT OUTER JOIN ' +
        '    (SELECT * FROM PStances WHERE username = ?) ps ' +
        '    ON ps.point_hash = p.hash ' +
        '  WHERE MATCH(text) AGAINST(?)',
        [ username, '' + query ],
        callback
    );
};

function escapeSqlRegex(str)
{
    return str.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

// callback(err, points)
db.points_with_prefix = function (prefix, callback) {
    client.query(
        'SELECT text FROM Points WHERE text LIKE ? LIMIT 10',
        [ escapeSqlRegex(prefix) + '%' ],
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
        // FIXME why accept username falsy?
        callback
    );
};

// callback(err)
db.delete_relevance_vote = function (username, conclusion_hash, premise_hash, supports, callback) {
    client.query(
        'DELETE FROM RelevanceVotes WHERE ' +
        '  conclusion_hash = ? AND ' +
        '  premise_hash = ? AND ' +
        '  username = ? AND ' +
        '  supports = ? ' +
        '  LIMIT 1',
        [ conclusion_hash, premise_hash, username, supports ],
        callback
    );
};

// callback(err, token)
db.create_password_reset_token = function (username, callback) {
    crypto.randomBytes(16, function (err, buf) {
        if (err) {
            return callback(err);
        }
        var token = buf.toString('hex');
        client.query(
            'INSERT INTO PasswordResetTokens SET ' +
            '  username = ?, token = ?',
            [ username, token ],
            function (err) {
                callback(err, token);
            }
        );
    });
};

// callback(err, username)
db.get_password_reset_token = function (token, callback) {
    client.query(
        'SELECT username FROM PasswordResetTokens ' +
        '  WHERE token = ?',
        [ token ],
        function (err, results) {
            callback(err, results && results.length && results[0].username);
        }
    );
};

// callback(err)
db.delete_password_reset_token = function (token, callback) {
    client.query(
        'DELETE FROM PasswordResetTokens ' +
        '  WHERE token = ?',
        [ token ],
        callback
    );
};

// callback(err)
db.carry_stance = function (username, old_hash, new_hash, callback) {
    if (old_hash === new_hash) {
        return callback();
    }
    client.query(
        'REPLACE INTO PStances (username, point_hash, stance)' +
        'SELECT username AS username' +
        '     , ? AS point_hash ' +
        '     , stance AS stance ' +
        'FROM PStances ' +
        'WHERE point_hash = ? AND username = ?',
        [ new_hash, old_hash, username ],
        callback
    );
};

// callback(err)
db.carry_alternative_votes = function (username, old_hash, new_hash, callback) {
    if (old_hash === new_hash) {
        return callback();
    }
    client.query(
        'INSERT INTO RelevanceVotes ' +
        '  (conclusion_hash, premise_hash, username, relevant, supports) ' +
        'SELECT ? AS conclusion_hash ' +
        '     , premise_hash AS premise_hash ' +
        '     , username AS username ' +
        '     , NOT mydownvotes AS relevant ' +
        '     , supports AS supports ' +
        'FROM RelevanceScores ' +
        'WHERE conclusion_hash = ? AND username = ?' +
        'ON DUPLICATE KEY UPDATE username = VALUES(username)',
        [ new_hash, old_hash, username],
        function (err) {
            if (err) {
                return callback(err);
            }
            client.query(
                'INSERT INTO RelevanceVotes ' +
                '  (conclusion_hash, premise_hash, username, relevant, supports) ' +
                'SELECT conclusion_hash AS conclusion_hash ' +
                '     , ? AS premise_hash ' +
                '     , username AS username ' +
                '     , NOT mydownvotes AS relevant ' +
                '     , supports AS supports ' +
                'FROM RelevanceScores ' +
                'WHERE premise_hash = ? AND username = ?' +
                'ON DUPLICATE KEY UPDATE username = VALUES(username)',
                [ new_hash, old_hash, username],
                function (err) {
                    if (err) {
                        return callback(err);
                    }
                    client.query(
                        'DELETE FROM RelevanceVotes ' +
                        'WHERE premise_hash = ? AND username = ? AND relevant',
                        [ old_hash, username ],
                        callback
                    );
                }
            );
        }
    );
};

// callback(err)
db.create_edit = function (username, old_hash, new_hash, callback) {
    if (old_hash === new_hash) {
        return callback();
    }
    client.query(
        'REPLACE INTO Edits SET ' +
        '  username = ?, old_hash = ?, new_hash = ?',
        [ username, old_hash, new_hash ],
        function (err) {
            if (err) {
                return callback(err);
            }
            client.query(
                'UPDATE Edits ' +
                'SET new_hash = ? ' +
                'WHERE new_hash = ? AND username = ?',
                [ new_hash, old_hash, username ],
                function (err) {
                    if (err) {
                        return callback(err);
                    }
                    client.query(
                        'DELETE FROM Edits ' +
                        'WHERE new_hash = ? AND old_hash = new_hash AND username = ?',
                        [ new_hash, username ],
                        callback
                    );
                }
            );
        }
    );
};

// callback(err, points)
db.get_other_outgoing_edits = function (username, old_hash, preferred_hash, callback) {
    client.query(
        'SELECT p.hash AS hash ' +
        '     , p.text AS text ' +
        '     , ps.stance AS stance ' +
        //'     , COUNT(*) AS count ' +
        'FROM Edits e ' +
        'JOIN Points p ON e.new_hash = p.hash ' +
        'LEFT OUTER JOIN (' +
        '  SELECT * FROM PStances WHERE username = ? ' +
        ') ps ' +
        'ON p.hash = ps.point_hash ' +
        'WHERE e.old_hash = ? AND e.new_hash != ? ' +
        'GROUP BY e.old_hash',
        [ username, old_hash, preferred_hash || '' ],
        callback
    );
};

// callback(err, point or falsy)
db.get_my_outgoing_edit = function (username, old_hash, callback) {
    client.query(
        'SELECT p.hash AS hash ' +
        '     , p.text AS text ' +
        '     , ps.stance AS stance ' +
        'FROM Edits e ' +
        'JOIN Points p ON e.new_hash = p.hash ' +
        'LEFT OUTER JOIN (' +
        '  SELECT * FROM PStances WHERE username = ? ' +
        ') ps ' +
        'ON p.hash = ps.point_hash ' +
        'WHERE e.username = ? AND e.old_hash = ?',
        [ username, username, old_hash ],
        function (err, results) {
            callback(err, results && results[0]);
        }
    );
};

// callback(err, points)
db.get_other_user_stances = function (my_username, other_username, callback) {
    client.query(
        'SELECT p.hash AS hash ' +
        '     , p.text AS text ' +
        '     , mps.stance AS stance ' +
        '     , ops.stance AS other_stance ' +
        'FROM PStances ops ' +
        'JOIN Points p ' +
        'ON p.hash = ops.point_hash ' +
        'LEFT OUTER JOIN (' +
        '  SELECT * FROM PStances WHERE username = ? ' +
        ') mps ' +
        'ON p.hash = mps.point_hash ' +
        'WHERE ops.username = ? AND ops.stance != 0',
        [ my_username, other_username ],
        callback
    );
};

// Find an argument (conclusion and premise) where:
//
// I have a stance on the conclusion;
// I have no vote on the relevance of the premise; and
// I have no stance on the premise,
//     or a stance that contradicts my stance on the conclusion.
//
// callback(err, arg)
db.get_point_to_consider = function (username, callback) {
    client.query(
        'SELECT rs.conclusion_hash  AS conclusion_hash ' +
        '     , cp.text             AS conclusion_text ' +
        '     , cps.stance          AS conclusion_stance ' +
        '     , rs.supports         AS supports ' +
        '     , rs.premise_hash     AS hash ' +
        '     , pps.stance          AS stance ' +
        '     , rs.myupvotes        AS myupvotes ' +
        '     , rs.mydownvotes      AS mydownvotes ' +
        '     , rs.upvotes          AS upvotes ' +
        '     , rs.downvotes        AS downvotes ' +
        '     , pp.text             AS text ' +
        'FROM PStances cps ' +
        '  JOIN RelevanceScores rs ON cps.point_hash = rs.conclusion_hash ' +
        '                         AND cps.username = rs.username ' +
        '  LEFT OUTER JOIN PStances pps ON pps.point_hash = rs.premise_hash ' +
        '                              AND pps.username = cps.username ' +
        '  JOIN Points cp ON cp.hash = rs.conclusion_hash ' +
        '  JOIN Points pp ON pp.hash = rs.premise_hash ' +
        'WHERE cps.username = ? ' +
        '  AND ((cps.stance > 0 AND !rs.supports) ' +
        '    OR (cps.stance < 0 AND rs.supports)) ' +
        '  AND rs.upvotes ' +
        '  AND !rs.myupvotes ' +
        '  AND !rs.mydownvotes ' +
        '  AND (pps.stance IS NULL OR pps.stance >= 0) ' +
        'LIMIT 1',
        [ username ],
        function (err, results) {
            callback(err, results && results[0]);
        }
    );
};

// callback(err, rvotes)
db.get_rvotes = function (conclusion_hash, supports, premise_hash, callback) {
    client.query(
        'SELECT rv.username ' +
        '     , rv.relevant ' +
        '     , rv.create_time ' +
        '     , u.fullname ' +
        '     , u.email ' +
        '  FROM RelevanceVotes rv ' +
        '  JOIN Users u ON u.username = rv.username ' +
        '  WHERE rv.conclusion_hash = ? ' +
        '    AND rv.supports = ? ' +
        '    AND rv.premise_hash = ?',
        [ conclusion_hash, supports, premise_hash ],
        callback
    );
};

// callback(err, rvote)
db.get_one_rvote = function (conclusion_hash, supports, premise_hash, username, callback) {
    client.query(
        'SELECT relevant ' +
        '  FROM RelevanceVotes ' +
        '  WHERE conclusion_hash = ? ' +
        '    AND supports = ? ' +
        '    AND premise_hash = ? ' +
        '    AND username = ?',
        [ conclusion_hash, supports, premise_hash, username ],
        function (err, results) {
            callback(err, results && results[0]);
        }
    );
};

// callback(err, users)
db.get_all_users = function (callback) {
    client.query(
        'SELECT username, fullname, email, create_time ' +
        '  FROM Users ORDER BY create_time DESC',
        [],
        callback
    );
};

// callback(err, points)
db.get_all_points = function (callback) {
    client.query(
        'SELECT hash, text from Points',
        [],
        callback
    );
};

// callback(err, relscores)
db.get_all_relscores = function (callback) {
    client.query(
        'SELECT conclusion_hash, premise_hash, supports, upvotes, downvotes ' +
        '  FROM RelevanceScores ' +
        '  WHERE username = ""',
        [],
        callback
    );
};

