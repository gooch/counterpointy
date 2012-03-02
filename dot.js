var db = require('./db');
var shorthash = require('./shorthash');

function echo()
{
    console.log(Array.prototype.join.call(arguments, '\n'));
}

function die(err)
{
    throw err;
}

function escape(label)
{
    return label.replace(/(["])/g, '\\$1');
}


echo(
    'digraph G {',
    'node [ shape=box ];',
    ''
);

db.get_all_points(function (err, points) {
    if (err) {
        die(err);
    }
    points.forEach(function (point) {
        echo(
            'p' + point.hash +
            '[label="' + escape(point.text) + '" ' +
            'URL="http://counterpointy.org/' + shorthash(point.hash) + '"];'
        );
    });

    db.get_all_relscores(function (err, relscores) {
        if (err) {
            die(err);
        }
        relscores.forEach(function (rel) {
            echo('p' + rel.premise_hash + ' -> p' + rel.conclusion_hash +
                ' [arrowhead=' + (rel.supports ? 'odot' : 'dot') + '];'
            );
        });
        echo('}');
        db.end();
    });
});
