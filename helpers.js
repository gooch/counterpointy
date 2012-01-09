var gravatar = require('gravatar');
var linkify = require('./linkify');

module.exports = function (app) {

    app.helpers({
        title: null,
        query: null,
        meta: [],
        showCheckbox: false,
        gravatar: gravatar,
        linkify: linkify
    });

    app.dynamicHelpers({
        session: function(req) { return req.session; }
    });

};
