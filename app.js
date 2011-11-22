
var util = require('util');
var express = require('express');
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
    res.render('welcome');
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
                point: point,
                supporting: reasons.filter(function (r) { return r.supports; }),
                opposing:   reasons.filter(function (r) { return !r.supports; })
            });
        });
    });
});


app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
