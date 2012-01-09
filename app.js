
var util = require('util');
var express = require('express');
var gravatar = require('gravatar');
var async = require('async');
var daemon = require('daemon');
var db = require('./db');
var DbStore = require('./db-store')(express);
var config = require('./config');
var emailregexp = require('./emailregexp');
var linkify = require('./linkify');
var ms = require('./ms');

var app = module.exports = express.createServer();

require('./helpers')(app);

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session({
        secret: config.session_secret,
        store: new DbStore
    }));
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(require('./resetpassapp'));
});

app.configure('development', function(){
  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.static(__dirname + '/public', { maxAge: ms('10m') }));
  app.use(express.errorHandler()); 
});


app.get('/', function (req, res, next) {
    var username = req.session && req.session.user && req.session.user.username;
    db.get_featured_points(username, function (err, featured_points) {
        if (err) {
            return next(err);
        }
        if (!req.session || !req.session.user) {
            return res.render('welcome', {
                featured_points: featured_points
            });
        }
        db.get_recent_points(username, function (err, recent_points) {
            if (err) {
                return next(err);
            }
            res.render('home', {
                featured_points: featured_points,
                recent_points: recent_points
            });
        });
    });
});

app.get('/signup', function (req, res, next) {
    res.render('signup', {
        title: 'Sign up'
    });
});

app.post('/signup', function (req, res, next) {
    var errmsg;
    var username = req.body.username;
    var fullname = req.body.fullname;
    var email = req.body.email;
    var password = req.body.password;
    if (!username || !fullname || !username || !email || !password) {
        errmsg = 'All fields are required.';
    }
    else if (!db.valid_username.test(username)) {
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

app.get('/p/:hashprefix', function (req, res, next) {
    var hashprefix = '' + req.params.hashprefix;
    if (!db.valid_hashprefix.test(hashprefix)) {
        return res.send(404);
    }
    var username = req.session && req.session.user && req.session.user.username;
    db.get_points_with_stance(hashprefix, username, function (err, points) {
        if (err) {
            return next(err);
        }
        if (!points || !points.length) {
            return res.send(404);
        }
        if (points.length > 1) {
            return res.render('hashprefix_disambiguation', {
                points: points,
                hashprefix: hashprefix
            });
        }
        var point = points[0];
        var hash = point.hash;
        db.get_premises_for_conclusion(hash, username, function (err, premises) {
            if (err) {
                return next(err);
            }
            db.get_conclusions_for_premise(hash, username, function (err, related) {
                if (err) {
                    return next(err);
                }
                db.get_opinions(hash, function (err, opinions) {
                    if (err) {
                        return next(err);
                    }
                    db.get_my_outgoing_edit(username, hash, function (err, preferred) {
                        if (err) {
                            return next(err);
                        }
                        db.get_other_outgoing_edits(username, hash, preferred && preferred.hash, function (err, outgoing) {
                            if (err) {
                                return next(err);
                            }
                            res.render('point_and_related', {
                                title: point.text,
                                point: point,
                                agree:    opinions.filter(function (o) { return o.stance > 0; }),
                                disagree: opinions.filter(function (o) { return o.stance < 0; }),
                                supporting: premises.filter(function (r) { return r.supports; }),
                                opposing:   premises.filter(function (r) { return !r.supports; }),
                                related: related,
                                outgoing: outgoing,
                                preferred: preferred,
                                meta: [
                                    [ 'og:title', point.text ],
                                    [ 'og:description', 'Arguments and opinions for and against' ],
                                    [ 'og:type', 'article' ],
                                    [ 'og:url', config.rooturl + '/p/' + point.hash ],
                                    [ 'og:image', config.rooturl + '/cp-logo.png' ]
                                ]
                            });
                        });
                    });
                });
            });
        });
    });
});

app.post('/p/:hash/add_premise/:supports', needuser, function (req, res, next) {
    var conclusion_hash = req.params.hash;
    var supports = { 'support': 1, 'oppose': 0 }[req.params.supports];
    if (undefined === supports) {
        return res.send('support or oppose expected', 404);
    }
    var premise_text = req.body.text;
    if (!premise_text) {
        return res.send("Premise text is required.", 400);
    }
    premise_text = '' + premise_text;
    var stance = { 'agree': 1, 'disagree': -1 }[req.body.stance];
    var username = req.session.user.username;

    db.get_point(conclusion_hash, function (err, point) {
        if (err) {
            return next(err);
        }
        if (!point) {
            return res.send(404);
        }
        db.add_premise(
            conclusion_hash, premise_text, supports, username,
            function (err, premise_hash) {
                if (err) {
                    return next(err);
                }
                db.set_pstance(username, premise_hash, stance, function (err) {
                    if (err) {
                        return next(err);
                    }
                    res.redirect('/p/' + conclusion_hash);
                });
            }
        );
    });
});

app.post('/new_point', needuser, function (req, res, next) {
    var username = req.session.user.username;
    var stance = { 'agree': 1, 'disagree': -1 }[req.body.stance];
    db.create_point(req.body.text, function (err, point_hash) {
        if (err) {
            return next(err);
        }
        db.set_pstance(username, point_hash, stance, function (err) {
            if (err) {
                return next(err);
            }
            res.redirect('/p/' + point_hash);
        });
    });
});

function needuser(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.send('Must be logged in.', 400);
    }
    return next();
}

app.post('/p/:hash/pstance', needuser, function (req, res, next) {
    var hash = req.params.hash;
    var stance = { 'agree': 1, 'disagree': -1 }[req.body.stance];
    var username = req.session.user.username;
    db.set_pstance(username, hash, stance, function (err) {
        if (err) {
            return next(err);
        }
        res.redirect('/p/' + hash);
    });
});

app.get('/search', function (req, res, next) {
    var query = '' + (req.query.q || '');
    db.search(query, function (err, points) {
        if (err) {
            return next(err);
        }
        res.render('search', {
            query: query,
            points: points
        });
    });
});

app.get('/u/:other_username', function (req, res, next) {
    var other_username = req.params.other_username;
    var my_username = req.session && req.session.user && req.session.user.username;
    db.get_user(other_username, function (err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.send(404);
        }
        db.get_other_user_stances(my_username, other_username, function (err, points) {
            if (err) {
                return next(err);
            }
            res.render('user', {
                user: user,
                points: points
            });
        });
    });
});

app.post('/p/:hash/premises/:supports', needuser, function (req, res, next) {
    var hash = req.params.hash;
    var username = req.session.user.username;
    var supports = { 'support': 1, 'oppose': 0 }[req.params.supports];
    if (undefined === supports) {
        return res.send('support or oppose expected', 404);
    }
    var premises = [].concat(req.body.premises);
    var action;
    if (req.body.remove) {
        action = function (premise_hash, done) {
            db.set_relevance_vote(username, hash, premise_hash, supports, 0, done);
        }
    } else if (req.body.keep) {
        action = function (premise_hash, done) {
            db.set_relevance_vote(username, hash, premise_hash, supports, 1, done);
        }
    } else if (req.body.agree) {
        action = function (premise_hash, done) {
            db.set_pstance(username, premise_hash, 1, done);
        }
    } else if (req.body.disagree) {
        action = function (premise_hash, done) {
            db.set_pstance(username, premise_hash, -1, done);
        }
    } else {
        return res.send('keep, remove, agree or disagree expected', 400);
    }
    async.forEachSeries(premises, action, function (err) {
        if (err) {
            return next(err);
        }
        return res.redirect('/p/' + hash);
    });
});

app.post('/p/:old_hash/edit', needuser, function (req, res, next) {
    var old_hash = req.params.old_hash; // FIXME validate
    var username = req.session.user.username;
    db.create_point(req.body.text, function (err, new_hash) {
        if (err) {
            return next(err);
        }
        carry_to_edit(username, old_hash, new_hash, function (err) {
            if (err) {
                return next(err);
            }
            res.redirect('/p/' + new_hash);
        });
    });
});

app.post('/p/:old_hash/alternatives', needuser, function (req, res, next) {
    var old_hash = req.params.old_hash; // FIXME validate
    var username = req.session.user.username;
    if (req.body.adopt) {
        var new_hash = req.body.premises;
        if (!db.valid_hash.test(new_hash)) {
            return res.send('You need to select one wording to adopt.', 400);
        }
        // FIXME validate new_hash exists
        carry_to_edit(username, old_hash, new_hash, function (err) {
            if (err) {
                return next(err);
            }
            res.redirect('/p/' + new_hash);
        });
    } else if (req.body.reject) {
        return res.send('Sorry, reject not implemented yet', 500);  // FIXME
    } else {
        return res.send('adopt or reject expected', 400);
    }
});

function carry_to_edit(username, old_hash, new_hash, callback)
{
    if (old_hash === new_hash) {
        return callback();
    }
    db.carry_stance(username, old_hash, new_hash, function (err) {
        if (err) {
            return callback(err);
        }
        db.create_edit(username, old_hash, new_hash, function (err) {
            if (err) {
                return callback(err);
            }
            db.carry_alternative_votes(username, old_hash, new_hash, callback);
        });
    });
}

if (config.crashtest) {
    app.get('/crash', function (req, res, next) {
        console.log('About to crash.');
        setTimeout(function () {
            throw new Error('Crash test.');
        }, 100);
    });
}


if (config.daemonize) {
    daemon.daemonize(config.logfile, config.pidfile, function (err, pid) {
        if (err) {
            return console.log('Error starting daemon: ' + err);
        }
        if (config.set_user) {
            err = daemon.setreuid(config.set_user);
            if (err !== true) {
                return console.log('Error setting user to ' + config.set_user + ': ' + err);
            }
        }
        console.log('Daemon started successfully with pid: ' + pid);
    });
}

app.listen(config.listen_port);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
