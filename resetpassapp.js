
var util = require('util');
var express = require('express');
var db = require('./db');
var config = require('./config');
var email = require('./email');

var app = module.exports = express.createServer();

require('./helpers')(app);

app.get('/forgot_passwd', function (req, res){
    res.render('resetpass');
});        

app.post('/forgot_passwd', function (req, res, next){
    var username = ('' + req.body.username).trim();
    db.get_user(username, function (err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.send('Username not found', 400);
        }
        username = user.username;
        db.create_password_reset_token(username, function (err, token) {
            if (err) {
                return next(err);
            }
            email.sendSMTP({
                host: config.smtp.host,
                port: config.smtp.port,
                domain: config.smtp.domain,
                from: config.smtp.noreply,
                to: user.email,
                content: [
                    'Subject: Counterpointy password reset',
                    '',
                    'Dear ' + username + ',',
                    '',
                    'To reset your password go to:',
                    '',
                    config.rooturl + '/reset/' + token
                ]
            });
            res.render('resetpass/email_sent', { username: username });
        });
    });
});

// FIXME tokens should be expired.

app.get('/reset/:token', function(req, res, next) {
    var token = req.params.token;
    db.get_password_reset_token(token, function (err, username) {
        if (err) {
            return next(err);
        }
        if (!username) {
            return res.send(404);
        }
        res.render('resetpass/reset', {
            username: username
        });
    });
});

app.post('/reset/:token', function(req, res, next) {
    var token = req.params.token;
    var password = req.body.password;
    if (!password) {
        return res.send('password required', 400);
    }
    password = '' + password;
    if (password != req.body.password2) {
        return res.send('passwords do not match', 400);
    }
    db.get_password_reset_token(token, function (err, username) {
        if (err) {
            return next(err);
        }
        if (!username) {
            return res.send(404);
        }
        db.set_user_password(username, password, function (err) {
            if (err) {
                return next(err);
            }
            db.delete_password_reset_token(token, function (err) {
                if (err) {
                    return next(err);
                }
                res.render('resetpass/success');
            });
        });
    });
});
