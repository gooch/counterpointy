
var util = require('util');
var express = require('express');
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
    title: null
});

app.dynamicHelpers({
    session: function(req) { return req.session; }
});


app.get('/', function (req, res, next) {
    res.render('welcome');
});

app.get('/signup', function (req, res, next) {
    res.render('signup', {
        title: 'Sign up'
    });
});

app.post('/signup', function (req, res, next) {
    var errmsg;
    var fullname = req.body.fullname;
    var email = req.body.email;
    var password = req.body.password;
    if (!fullname || !email || !password) {
        errmsg = 'All fields are required.';
    }
    else if (password !== req.body.password2) {
        errmsg = 'Passwords do not match.';
    }
    else if (!emailregexp.test('' + email)) {
        errmsg = 'A valid email address is required.';
    }
    if (errmsg) {
        return res.send(errmsg, 400);  // FIXME
    }
    fullname = '' + fullname;
    email = '' + email;
    password = '' + password;
    db.add_user(fullname, email, password, function (err, user_id) {
        if (err) {
            return next(err);
        }
        if (isNaN(user_id)) {
            // FIXME
            return res.send('That email address is already registered.', 400);
        }
        req.session.regenerate(function () {
            req.session.user = {
                user_id: user_id,
                fullname: fullname,
                email: email
            }
            res.render('signup_success', {
                title: 'Welcome ' + fullname
            });
        });
    });
});

app.get('/login', function (req, res, next) {
    res.render('login', {
        title: 'Log in'
    });
});

app.post('/login', function (req, res, next) {
    var email = '' + req.body.email;
    var password = '' + req.body.password;
    db.authenticate_user(email, password, function (err, user) {
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
    db.get_point(hash, function (err, point) {
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
            res.render('point', {
                title: point.text,
                point: point,
                supporting: reasons.filter(function (r) { return r.supports; }),
                opposing:   reasons.filter(function (r) { return !r.supports; })
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


app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
