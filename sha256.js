var crypto = require('crypto');

module.exports = function sha256(message) {
    return crypto.createHash('sha256').update(message).digest('hex');
};
