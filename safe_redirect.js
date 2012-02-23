var assert = require('assert');

var safe_redirect = module.exports = function safe_redirect(path) {
    // stay on this site - path only, no protocol or host.
    path = '' + path;
    if (!path || /\/\//.test(path) || path[0] !== '/') {
        return '/';
    }
    return path;
};

var tests = [
    [ undefined, '/'],
    [ '', '/' ],
    [ '/', '/' ],
    [ '/foo', '/foo' ],
    [ '//foo', '/' ],
    [ '///foo', '/' ],
    [ '//foo/bar', '/' ],
    [ '/foo+bar', '/foo+bar' ],
    [ 'foo/bar', '/' ]
];

function runTests() {
    tests.forEach(function (test) {
        assert.deepEqual(safe_redirect(test[0]), test[1]);
    });
}
