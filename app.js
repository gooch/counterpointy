
var util = require('util');
var express = require('express');
var gravatar = require('gravatar');
var db = require('./db');
var config = require('./config');
var emailregexp = require('./emailregexp');

var app = module.exports = express.createServer();


app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({ secret: config.session_secret }));
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

app.helpers({
    title: null,
    gravatar: gravatar
});

app.dynamicHelpers({
    session: function(req) { return req.session; }
});


app.get('/', function (req, res, next) {
    db.get_all_points(function (err, points) {
        if (err) {
            return next(err);
        }
        res.render('all_points', {
            points: points
        });
    });
});

app.get('/signup', function (req, res, next) {
    res.render('signup', {
        title: 'Sign up'
    });
});

var valid_username = /^[a-z0-9_]{3,15}$/i;

app.post('/signup', function (req, res, next) {
    var errmsg;
    var username = req.body.username;
    var fullname = req.body.fullname;
    var email = req.body.email;
    var password = req.body.password;
    if (!username || !fullname || !username || !email || !password) {
        errmsg = 'All fields are required.';
    }
    else if (!valid_username.test(username)) {
        errmsg = 'Username must be 3-15 ascii chars.';
    }
    else if (password !== req.body.password2) {
        errmsg = 'Passwords do not match.';
    }
    else if (!emailregexp.test(email)) {
        errmsg = 'A valid email address is required.';
    }
    if (errmsg) {
        return res.send(errmsg, 400);  // FIXME
    }
    fullname = ('' + fullname).trim();
    email = ('' + email).trim();
    password = '' + password;
    db.add_user(username, fullname, email, password, function (err, username_exists) {
        if (err) {
            return next(err);
        }
        if (username_exists) {
            // FIXME
            return res.send('That username is already registered.', 400);
        }
        req.session.regenerate(function () {
            req.session.user = {
                username: username,
                fullname: fullname,
                email: email
            }
            res.redirect('/');
        });
    });
});

app.get('/login', function (req, res, next) {
    res.render('login', {
        title: 'Log in'
    });
});

app.post('/login', function (req, res, next) {
    var username = '' + req.body.username;
    var password = '' + req.body.password;
    db.authenticate_user(username, password, function (err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.render('login_failed');
        }
        req.session.regenerate(function () {
            req.session.user = user;
            res.redirect('/');
        });
    });
});

app.get('/resetpass', function (req, res, next) {
    res.render('resetpass', {
        title: 'Reset password'
    });
});

app.get('/options', function (req, res, next) {
    res.render('options', {
        title: 'Options'
    });
});

app.get('/logout', function (req, res, next) {
    req.session.regenerate(function () {
        res.redirect('/');
    });
});

app.get('/point/:hash', function (req, res, next) {
    var hash = req.params.hash;
    var username = req.session && req.session.user && req.session.user.username;
    db.get_point_with_stance(hash, username, function (err, point) {
        if (err) {
            return next(err);
        }
        if (!point) {
            return res.send(404);
        }
        db.get_reasons_for_conclusion(hash, function (err, reasons) {
            if (err) {
                return next(err);
            }
            db.get_opinions(hash, function (err, opinions) {
                if (err) {
                    return next(err);
                }
                res.render('point', {
                    title: point.text,
                    point: point,
                    agree:    opinions.filter(function (o) { return o.stance > 0; }),
                    disagree: opinions.filter(function (o) { return o.stance < 0; }),
                    supporting: reasons.filter(function (r) { return r.supports; }),
                    opposing:   reasons.filter(function (r) { return !r.supports; })
                });
            });
        });
    });
});

app.post('/point/:hash/add_premise/:stance', function (req, res, next) {
    var conclusion_hash = req.params.hash;
    var stance = req.params.stance;
    var stances = { 'support': 1, 'oppose': 0 };
    if (stance in stances) {
        var supports = stances[stance];
    } else {
        return res.send("Invalid stance", 404);
    }
    var premise_text = req.body.text;
    if (!premise_text) {
        return res.send("Premise text is required.", 400);
    }
    premise_text = '' + premise_text;

    db.get_point(conclusion_hash, function (err, point) {
        if (err) {
            return next(err);
        }
        if (!point) {
            return res.send(404);
        }
        db.add_premise(
            conclusion_hash, premise_text, supports,
            function (err, premise_hash, reason_hash) {
                if (err) {
                    return next(err);
                }
                res.redirect('/point/' + premise_hash);
            }
        );
    });
});

app.post('/new_point', function (req, res, next) {
    db.create_point(req.body.text, function (err, hash) {
        if (err) {
            return next(err);
        }
        res.redirect('/point/' + hash);
    });
});

app.post('/point/:hash/pstance', function (req, res, next) {
    var hash = req.params.hash;
    var stance = { 'agree': 1, 'disagree': -1 }[req.body.stance];
    if (!req.session || !req.session.user) {
        return res.send("Must be logged in.", 400);
    }
    var username = req.session.user.username;
    db.set_pstance(username, hash, stance, function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/point/' + hash);
    });
});


app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
