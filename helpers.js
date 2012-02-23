var gravatar = require('gravatar');
var querystring = require('querystring');
var linkify = require('./linkify');
var shorthash = require('./shorthash');
var config = require('./config');

module.exports = function (app) {

    app.helpers({
        title: null,
        query: null,
        meta: [],
        opt: {},
        gravatar: gravatar,
        querystring: querystring,
        linkify: linkify,
        shorthash: shorthash,
        rooturl : config.rooturl
    });

    app.dynamicHelpers({
        this_url: function(req) { return req.url.split('?')[0]; },
        session: function(req) { return req.session; }
    });

};
