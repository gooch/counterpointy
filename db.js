// https://github.com/felixge/node-mysql

var mysql = require('mysql');
var config = require('./config');
var sha1 = require('sha1');



var client = mysql.createClient(config.db);

exports.get_point = function (hash, callback) {
    client.query(
        'SELECT hash, text FROM Points WHERE hash = ?',
        [ hash ],
        function (err, results, fields) {
            callback(err, results && results[0]);
        }
    );
};

exports.get_reasons_for_conclusion = function (conclusion_hash, callback) {
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

exports.add_premise = function (conclusion_hash, text, supports, callback) {
    var premise_hash = sha1('' + text);
    var reason_hash = sha1(premise_hash + supports + conclusion_hash);
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
