var gravatar = require('gravatar');
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
        linkify: linkify,
        shorthash: shorthash,
        rooturl : config.rooturl
    });

    app.dynamicHelpers({
        session: function(req) { return req.session; }
    });

};
