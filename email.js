var net = require('net');
var emitlines = require('./emitlines');
var emailregexp = require('./emailregexp');

// Extract an email address from a string in which
// the address may be wrapped in angle brackets and/or whitespace.
// If angle brackets exist, text outside the brackets is discarded.
// Returns null if the address is invalid.
//
exports.extractEmailAddress = function extractEmailAddress(address)
{
    var match = /<([^>]+)>/.exec(address);
    if (match) {
        address = match[1];
    }
    address = address.trim();
    return emailregexp.test(address) ? address : null;
};

function assertValidEmailAddress(address)
{
    if (!emailregexp.test(address)) {
        throw new Error('Invalid email address <' + address + '>');
    }
    return address;
}
exports.assertValidEmailAddress = assertValidEmailAddress;

// Wait for a matching line to be received on stream.
//
// proceed: regexp, match causes fn(null) to be called.
// ignore: regexp, matching lines are ignored.
// callback: function (err) {}
//
// Any unmatched line causes callback(line) to be called.
//
function expect(stream, proceed, ignore, callback)
{
    stream.once('lines', function (lines) {
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (proceed && proceed.test(line)) {
                return callback(null);
            }
            if (ignore && ignore.test(line)) {
                continue;
            }
            // Unmatched line is an error.
            return callback(line);
        }
        // We ignored all the lines. Keep waiting expectantly.
        expect(stream, proceed, ignore, callback);
    });
}

// Send an email message using an SMTP server.
//
//  options = {
//      domain: 'localhost',
//      from: 'me@example.com',
//      to: ['alice@example.com', 'bob@example.org'],
//      content: ['Subject: Test', '', 'Line 1', 'Line 2']
//  };
//  callback(err) is optional, called on success or error.
//
// Content must conform to RFC2822, i.e.:
//  * header lines, empty line, body lines
//  * 7-bit ASCII
//  * lines MUST be <= 998 chars, and SHOULD be <= 78 chars
//
// FIXME: Content should be streamed in, not passed in one hit.
//
exports.sendSMTP = function sendSMTP(options, callback)
{
    var to = options.to;
    if (typeof to === 'string') {
        to = [to];
    }
    callback = callback || function () {};

    assertValidEmailAddress(options.from);

    var commands = [
        'HELO ' + options.domain,
        'MAIL FROM:<' + options.from + '>'
    ].concat(
        to.map(function (addr) {
            assertValidEmailAddress(addr);
            return 'RCPT TO:<' + addr + '>';
        }), 
        'DATA'
    );

    var stream = net.createConnection(options.port, options.host);
    emitlines(stream, 'ascii', '\r\n');

    var ok        = /^[23]\d\d[^\-]/;  // '250 Ok', '354 Start Input'
    var multiline = /^\d\d\d-/;        // '250-SIZE'

    var cmdi = 0;
    expect(stream, ok, multiline, function ready(err) {
        if (err) {
            return callback(err);
        }
        if (cmdi < commands.length) {
            stream.write(commands[cmdi++] + '\r\n', 'ascii');
            expect(stream, ok, multiline, ready);
        } else {
            for (var i = 0; i < options.content.length; i++) {
                var line = options.content[i];
                // Escape leading . on any line
                if (/^\./.test(line)) {
                    stream.write('.', 'ascii');
                }
                stream.write(line + '\r\n', 'ascii');
            }
            stream.write('.\r\n', 'ascii');
            expect(stream, ok, multiline, function (err) {
                stream.end('QUIT\r\n', 'ascii');
                callback(err);
            });
        }
    });
};
