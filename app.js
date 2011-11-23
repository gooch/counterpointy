
var util = require('util');
var express = require('express');
var sha1 = require('sha1');
var db = require('./db');

var app = module.exports = express.createServer();


app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
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


app.get('/', function (req, res, next) {
    res.render('welcome', {
        title: 'Counterpointy'
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
                title: 'Counterpointy: ' + point.text,
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
