// https://github.com/felixge/node-mysql

var mysql = require('mysql');
var config = require('./config');



var client = mysql.createClient(config.db);

exports.get_point = function (hash, callback) {
    var query = client.query('SELECT text FROM Point WHERE hash = ?', [ hash ]);
    query.on('error', function (err) {
        callback(err);
    });
    query.on('row', function (row) {
        callback(null, row);
    });
};


