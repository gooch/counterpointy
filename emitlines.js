//
// emitlines(stream, encoding='utf8', separator='\n')
//
// Cause a stream to emit 'lines' events when complete lines are received.
//
// Event: 'lines'
// function (line) {}
// lines is an array of strings with the line-terminator stripped.
//
// stream: an EventEmitter instance conforming to Stream.
// encoding: 'utf', 'ascii' or 'base64'. Default 'utf8'.
// separator: the line separator string. Default '\n'.
//
// This function calls stream.setEncoding(encoding), which causes
// all 'data' events to pass strings in that encoding.
//
module.exports = function emitlines(stream, encoding, separator)
{
    var partial = '';

    stream.setEncoding(encoding || 'utf8');
    separator = separator || '\n';

    stream.on('data', function (data) {
        var lines = data.split(separator);
        lines[0] = partial + lines[0];
        partial = lines.pop(1);
        if (lines.length > 0) {
            stream.emit('lines', lines);
        }
    });
};
