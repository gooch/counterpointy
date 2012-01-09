var gravatar = require('gravatar');
var linkify = require('./linkify');
var shorthash = require('./shorthash');

module.exports = function (app) {

    app.helpers({
        title: null,
        query: null,
        meta: [],
        showCheckbox: false,
        gravatar: gravatar,
        linkify: linkify,
        shorthash: shorthash
    });

    app.dynamicHelpers({
        session: function(req) { return req.session; }
    });

};
