/**

# ms.js - https://gist.github.com/1503944

No more painful `setTimeout(fn, 60 * 4 * 3 * 2 * 1 * Infinity * NaN * '☃')`.

    ms('2d')      // 172800000
    ms('1.5h')    // 5400000
    ms('1h')      // 3600000
    ms('1m')      // 60000
    ms('5s')      // 5000
    ms('500ms')   // 500
    ms('100')     // 100
    ms(100)       // 100

**/

(function () {
  var _ = {}
  _.ms = 1;
  _.s = 1000;
  _.m = _.s * 60;
  _.h = _.m * 60;
  _.d = _.h * 24;

  function ms (s) {
    if ('number' == typeof s || s == Number(s)) return Number(s);
    var p = s.toLowerCase().match(/([0-9\.]+)([a-z]+)/);
    if (!_[p[2]]) throw new Error('Unknown time unit: ' + p[2]);
    return p[1] * _[p[2]];
  }

  if ('object' == typeof window) {
    window.ms = ms;
  } else {
    module.exports = ms;
  }
})();
