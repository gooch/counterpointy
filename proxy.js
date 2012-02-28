var httpProxy = require('http-proxy');

var routingProxy = new httpProxy.RoutingProxy();

module.exports = function (map) {
    return function (req, res, next) {
        var host = req.headers.host;
        var to = (host in map) ? map[host] : map['default'];
        if (to) {
            routingProxy.proxyRequest(req, res, to);
        } else {
            next();
        }
    };
};
