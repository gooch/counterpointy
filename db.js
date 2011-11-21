// https://github.com/felixge/node-mysql

var mysql = require('mysql');
var config = require('./config');



var client = mysql.createClient(config.db);

exports.get_point = function (hash, callback) {
    var query = client.query(
        'SELECT text FROM Points WHERE hash = ?',
        [ hash ],
        function (err, results, fields) {
            callback(err, results && results[0] && results[0].text);
        }
    );
};


