// http://daringfireball.net/2010/07/improved_regex_for_matching_urls

module.exports = function (text) {
    var re = /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi;
    var arr = [];
    var index = 0;
    var matches;
    while (matches = re.exec(text)) {
        var leading = text.slice(index, matches.index);
        var url = matches[0];
        arr.push(
            escape(leading),
            '<a rel="nofollow" target="_blank" href="', url, '">',
            escape(url),
            '</a>'
        );
        index = re.lastIndex;
    }
    arr.push(escape(text.slice(index)));
    return arr.join('');
};

function escape(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
