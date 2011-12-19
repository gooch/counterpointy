// Based on connect-redis.js
// https://github.com/visionmedia/connect-redis/blob/master/lib/connect-redis.js

var mysql = require('mysql');
var config = require('./config');

var maxAge = 10 * 365 * 24 * 60 * 60 * 1000;

module.exports = function(connect){
    var Store = connect.session.Store;

    function DbStore(options) {
        Store.call(this, options);
        this.client = mysql.createClient(config.db);
    };

    DbStore.prototype.__proto__ = Store.prototype;

    DbStore.prototype.get = function (sid, callback) {
        this.client.query(
            'SELECT u.username, u.fullname, u.email, u.password_hash ' +
            '  FROM Users u JOIN Sessions s ' +
            '  ON u.username = s.username ' +
            '  WHERE s.session_key = ?',
            [ sid ],
            function (err, results, fields) {
                callback(err, results && {
                    user: results[0],
                    cookie: {
                        maxAge: maxAge
                    }
                });
            }
        );
    };

    DbStore.prototype.set = function (sid, sess, callback) {
        if (!sess.user || !sess.user.username) {
            return callback();
        }
        this.client.query(
            'REPLACE INTO Sessions SET ' +
            '  session_key = ?, username = ?',
            [ sid, sess.user.username ],
            callback
        );
    };

    DbStore.prototype.destroy = function (sid, callback) {
        this.client.query(
            'DELETE FROM Sessions WHERE session_key = ?',
            [ sid ],
            callback
        );
    };

    return DbStore;
};
