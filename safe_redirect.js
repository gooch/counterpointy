var url = require('url');
var assert = require('assert');

var safe_redirect = module.exports = function safe_redirect(path) {
    // stay on this site - path only, no protocol or host.
    var safepath = url.parse(path || '').path || '/';
    if (/\/\//.test(safepath)) {
        safepath = '/';
    }
    console.log(path + ' => ' + safepath);
    return safepath;
};

var tests = [
    [ undefined, '/'],
    [ '', '/' ],
    [ '/', '/' ],
    [ '/foo', '/foo' ],
    [ '//foo', '/' ],
    [ '///foo', '/' ],
    [ '//foo/bar', '/' ],
    [ '/foo+bar', '/foo+bar' ]
];

function runTests() {
    tests.forEach(function (test) {
        assert.deepEqual(safe_redirect(test[0]), test[1]);
    });
}
