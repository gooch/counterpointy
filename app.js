
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
var shorthash = require('./shorthash');
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
    var my_username = req.session && req.session.user && req.session.user.username;
    db.get_featured_points(my_username, function (err, featured_points) {
        if (err) {
            return next(err);
        }
        if (!req.session || !req.session.user) {
            return res.render('welcome', {
                opt: { layout_complex: true },
                featured_points: featured_points
            });
        }
        db.get_recent_points(my_username, function (err, recent_points) {
            if (err) {
                return next(err);
            }
            res.render('home', {
                opt: { layout_complex: true },
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

// For backward compatibility: point URLs used to be of this form:
app.get('/point/:hashprefix', function (req, res, next) {
    var hashprefix = req.params.hashprefix;
    if (!db.valid_hashprefix.test(hashprefix)) {
        return next();
    }
    res.redirect('/' + hashprefix);
});

// callback(err, point)
//
// hashprefix must match db.valid_hashprefix
//
// If err and point are falsy a response has already been sent:
// either a 404 or a list of the points matching hashprefix.
//
function disambiguate(hashprefix, req, res, callback)
{
    var my_username = req.session && req.session.user && req.session.user.username;
    db.get_points_with_stance(hashprefix, my_username, function (err, points) {
        if (err) {
            return callback(err);
        }
        if (!points || !points.length) {
            res.send(404);
            return callback();
        }
        if (points.length > 1) {
            res.render('hashprefix_disambiguation', {
                opt: { layout_complex: true },
                points: points,
                hashprefix: hashprefix
            });
            return callback();
        }
        return callback(null, points[0]);
    });
}

app.get('/:hashprefix', function (req, res, next) {
    var hashprefix = req.params.hashprefix;
    if (!db.valid_hashprefix.test(hashprefix)) {
        return next();
    }
    var my_username = req.session && req.session.user && req.session.user.username;
    disambiguate(hashprefix, req, res, function (err, point) {
        if (err) {
            return next(err);
        }
        if (!point) {
            return;
        }
        var hash = point.hash;
        db.get_premises_for_conclusion(hash, my_username, function (err, premises) {
            if (err) {
                return next(err);
            }
            db.get_conclusions_for_premise(hash, my_username, function (err, related) {
                if (err) {
                    return next(err);
                }
                db.count_pvotes(hash, function (err, pvotes) {
                    if (err) {
                        return next(err);
                    }
                    point.truecount = pvotes.truecount;
                    point.falsecount = pvotes.falsecount;
                    db.get_my_outgoing_edit(my_username, hash, function (err, preferred) {
                        if (err) {
                            return next(err);
                        }
                        db.get_other_outgoing_edits(my_username, hash, preferred && preferred.hash, function (err, outgoing) {
                            if (err) {
                                return next(err);
                            }
                            res.render('point_and_related', {
                                opt: { layout_complex: true },
                                title: point.text,
                                point: point,
                                supporting: premises.filter(function (r) { return r.supports; }),
                                opposing:   premises.filter(function (r) { return !r.supports; }),
                                related: related,
                                outgoing: outgoing,
                                preferred: preferred,
                                meta: [
                                    [ 'og:title', point.text ],
                                    [ 'og:description', 'Arguments and opinions for and against' ],
                                    [ 'og:type', 'article' ],
                                    [ 'og:url', config.rooturl + '/' + point.hash ],
                                    [ 'og:image', config.rooturl + '/logo.png' ]
                                ]
                            });
                        });
                    });
                });
            });
        });
    });
});

app.get('/:hashprefix/votes', function (req, res, next) {
    var hashprefix = req.params.hashprefix;
    if (!db.valid_hashprefix.test(hashprefix)) {
        return next();
    }
    var my_username = req.session && req.session.user && req.session.user.username;
    disambiguate(hashprefix, req, res, function (err, point) {
        if (err) {
            return next(err);
        }
        if (!point) {
            return;
        }
        db.get_opinions(point.hash, function(err, pvotes) {
            if (err) {
                return next(err);
            }
            var truevotes = pvotes.filter(function(v){return v.stance > 0;});
            var falsevotes = pvotes.filter(function(v){return v.stance < 0;});
            point.truecount = truevotes.length;
            point.falsecount = falsevotes.length;
            return res.render('pvotes', {
                opt: { layout_complex: true },
                point: point,
                truevotes: truevotes,
                falsevotes: falsevotes,
            });
        });
    });
});


app.post('/:hash/add_premise/:supports', needuser, function (req, res, next) {
    var conclusion_hash = req.params.hash;
    if (!db.valid_hash.test(conclusion_hash)) {
        return next();
    }
    var supports = { 'support': 1, 'oppose': 0 }[req.params.supports];
    if (undefined === supports) {
        return res.send('support or oppose expected', 404);
    }
    var premise_text = req.body.text;
    if (!premise_text) {
        return res.send("Premise text is required.", 400);
    }
    premise_text = '' + premise_text;
    var my_username = req.session.user.username;

    db.get_point(conclusion_hash, function (err, point) {
        if (err) {
            return next(err);
        }
        if (!point) {
            return res.send(404);
        }
        db.add_premise(
            conclusion_hash, premise_text, supports, my_username,
            function (err, premise_hash) {
                if (err) {
                    return next(err);
                }
                res.redirect('/' + shorthash(conclusion_hash));
            }
        );
    });
});

app.post('/new_point', needuser, function (req, res, next) {
    var my_username = req.session.user.username;
    db.create_point(req.body.text, my_username, function (err, point_hash) {
        if (err) {
            return next(err);
        }
        res.redirect('/' + shorthash(point_hash));
    });
});

function needuser(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.send('Must be logged in.', 400);
    }
    return next();
}

app.post('/:hash/pstance', needuser, function (req, res, next) {
    var hash = req.params.hash;
    if (!db.valid_hash.test(hash)) {
        return next();
    }
    var my_username = req.session.user.username;
    var stance = {
        'true': 1,
        'neutral': 0,
        'false': -1,
        'undecided': null
    }[req.body.stance];
    if (undefined === stance) {
        console.log(req.body);
        return res.send('invalid stance', 400);
    }
    (function (done) {
        if (null === stance) {
            db.delete_pstance(my_username, hash, done);
        } else {
            db.set_pstance(my_username, hash, stance, done);
        }
    })(function (err) {
        if (err) {
            return next(err);
        }
        res.send(200);
    });
});

app.get('/search', function (req, res, next) {
    var query = '' + (req.query.q || '');
    var my_username = req.session && req.session.user && req.session.user.username;
    db.search(my_username, query, function (err, points) {
        if (err) {
            return next(err);
        }
        res.render('search', {
            opt: { layout_complex: true },
            query: query,
            points: points
        });
    });
});

app.get('/suggest.json', function (req, res, next) {
    var query = '' + (req.query.term || '');
    db.points_with_prefix(query, function (err, points) {
        if (err) {
            return next(err);
        }
        res.send(points.map(function (p) { return p.text; }));
    });
});

app.get('/~:username', function (req, res, next) {
    var username = req.params.username;
    var my_username = req.session && req.session.user && req.session.user.username;
    db.get_user(username, function (err, user) {
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.send(404);
        }
        db.get_other_user_stances(my_username, username, function (err, points) {
            if (err) {
                return next(err);
            }
            res.render('user', {
                opt: { layout_complex: true },
                user: user,
                points: points
            });
        });
    });
});

app.post('/:hash/:supports/:premise_hash', needuser, function (req, res, next) {
    var hash = req.params.hash;
    if (!db.valid_hash.test(hash)) {
        return next();
    }
    var premise_hash = req.params.premise_hash;
    if (!db.valid_hash.test(premise_hash)) {
        return next();
    }
    var my_username = req.session.user.username;
    var supports = { 'supporting': 1, 'opposing': 0 }[req.params.supports];
    if (undefined === supports) {
        return next();
    }
    if (req.body.vote === 'none') {
        db.delete_relevance_vote(
            my_username, hash, premise_hash, supports, function (err) {
                if (err) {
                    return next(err);
                }
                res.send(200);
            }
        );
    } else {
        var relevant = {
            'up': 1,
            'down': 0
        }[req.body.vote];
        if (undefined === relevant) {
            return res.send('vote not recognised', 400);
        }
        db.set_relevance_vote(
            my_username, hash, premise_hash, supports, relevant, function (err){
                if (err) {
                    return next(err);
                }
                res.send(200);
            }
        );
    }
});

app.post('/:old_hash/edit', needuser, function (req, res, next) {
    var old_hash = req.params.old_hash; // FIXME validate
    if (!db.valid_hash.test(old_hash)) {
        return next();
    }
    var my_username = req.session.user.username;
    db.create_point(req.body.text, my_username, function (err, new_hash) {
        if (err) {
            return next(err);
        }
        carry_to_edit(my_username, old_hash, new_hash, function (err) {
            if (err) {
                return next(err);
            }
            res.redirect('/' + shorthash(new_hash));
        });
    });
});

app.post('/:old_hash/alternatives', needuser, function (req, res, next) {
    var old_hash = req.params.old_hash; // FIXME validate
    if (!db.valid_hash.test(old_hash)) {
        return next();
    }
    var my_username = req.session.user.username;
    if (req.body.adopt) {
        var new_hash = req.body.premises;
        if (!db.valid_hash.test(new_hash)) {
            return res.send('You need to select one wording to adopt.', 400);
        }
        // FIXME validate new_hash exists
        carry_to_edit(my_username, old_hash, new_hash, function (err) {
            if (err) {
                return next(err);
            }
            res.redirect('/' + shorthash(new_hash));
        });
    } else if (req.body.reject) {
        return res.send('Sorry, reject not implemented yet', 500);  // FIXME
    } else {
        return res.send('adopt or reject expected', 400);
    }
});

function carry_to_edit(my_username, old_hash, new_hash, callback)
{
    if (old_hash === new_hash) {
        return callback();
    }
    db.carry_stance(my_username, old_hash, new_hash, function (err) {
        if (err) {
            return callback(err);
        }
        db.create_edit(my_username, old_hash, new_hash, function (err) {
            if (err) {
                return callback(err);
            }
            db.carry_alternative_votes(my_username, old_hash, new_hash, callback);
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
