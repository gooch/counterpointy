// https://github.com/felixge/node-mysql

var mysql = require('mysql');
var config = require('./config');



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
