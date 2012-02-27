var Showdown = require('showdown').Showdown;
var showdown = new Showdown.converter();

// FIXME consider https://github.com/visionmedia/node-discount instead

exports.compile = function(str, options){
    var html = showdown.makeHtml(str);
    return function(locals){
        return html.replace(/\{([^}]+)\}/g, function(_, name){
            return locals[name];
        });
    };
};
