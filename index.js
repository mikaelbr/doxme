var util = require('./util.js'),
    table = require('markdown-table'),
    reformat = util.reformat,
    getTag = util.getTag,
    getTags = util.getTags,
    u = require('util');

/**
 * A [Markdown](http://daringfireball.net/projects/markdown/) formatter
 * for [dox](https://github.com/tj/dox). Takes dox's JSON output as stdin
 * and writes Markdown to stdout.
 *
 * ## CLI Usage
 *
 *     dox -r < index.js | doxme
 *
 * ## See Also
 *
 * * [gulp-doxme](https://github.com/tomekwi/gulp-doxme) runs doxme within a
 *   [Gulp](http://gulpjs.com/) pipeline
 *
 * @module doxme
 * @param {Object} dox the output of dox as a parsed JSON object
 * @param {boolean} readme whether to output a readme or just docs
 * @param {Object} package a parsed package.json
 * @param {boolean} travis whether to output a travis badge along with docs
 * @returns {String} documentation
 * @example
 * var fs = require('fs');
 * var dox = require('dox');
 * var doxme = require('doxme');
 *
 * var sourceCode = fs.readFileSync('./index.js', 'utf8');
 * var documentation = doxme(dox.parseComments(sourceCode));
 */

module.exports = function(dox, readme, pkg, travis) {

    var output = '';

    function log() {
        output += u.format.apply(u, arguments) + '\n';
    }

    if (readme) {
        log('# ' + pkg.name + '\n');

        if (travis) {
            var orgRepo = pkg.repository.url.match(/([^(.|\/|:)]+)\/([^(.|\/|:)]+).git$/);
            var org = orgRepo[1], repo = orgRepo[2];
            log('[![build status](https://secure.travis-ci.org/%s/%s.png)](http://travis-ci.org/%s/%s)\n',
                 org, repo, org, repo);
        }

        log(pkg.description + '\n');
    }

    dox.filter(not(isPrivate)).forEach(print);

    log('## Private members \n');
    dox.filter(isPrivate).forEach(print);

    function isPrivate (d) {
        return getTags(d.tags, 'api')[0].visibility === 'private';
    }

    function not (fn) {
        return function () {
            return !fn.apply(fn, arguments);
        };
    }

    function print (d) {
        var alias, returns;
        var name = '', mod;
        if (alias = getTag(d.tags, 'alias')) {
            name = alias.string;
        } else if (mod = getTag(d.tags, 'module')) {
            name = mod.string.replace('/', '.');
        } else {
            name = d.ctx && d.ctx.name;
        }
        if (name !== '') {
            var args = getTags(d.tags, 'param').map(function(p) {
                return p.name;
            }).join(', ');
            if (args) {
                log('\n### `%s(%s)`\n', name, args);
            } else {
                log('\n### `%s`\n', name);
            }
            if (d.description) {
                log('%s\n', reformat(d.description.full));
            }

            printTable(d, 'param', 'Parameters')
            printTable(d, 'property', 'Properties')

            var examples = getTags(d.tags, 'example');
            if (examples.length) {
                log('### Example');
                examples.forEach(function(p) {
                    log('\n```js\n%s\n```\n', p.string);
                });
            }

            if (returns = getTag(d.tags, 'returns')) {
                log('\n**Returns** `%s`, %s\n', returns.types.join(','), reformat(returns.description));
            }
        }
    }

    if (readme) {
        log('## Installation\n');
        log('Requires [nodejs](http://nodejs.org/).\n');
        log('```sh\n$ npm install ' + pkg.name + '\n```\n');

        if (pkg.scripts && pkg.scripts.test) {
            log('## Tests\n\n```sh\n$ npm test\n```\n');
        }
    }

    return output;

    function printTable (d, props, name) {
        var properties = getTags(d.tags, props);
        if (properties.length) {
            log('### %s\n', name);
            log(table(
                [[props, 'type', 'description']]
                    .concat(properties.map(function(p) {
                        var type = p.typesDescription.match(/^{/) ?
                            p.typesDescription.replace(/\|/g, '/') :
                            p.types.join(',');
                        return ['`' + p.name + '`', type,
                            (p.optional ? '_optional:_ ' : '') +
                            reformat(p.description)];
                    }))
            ));
            log('\n');
        }
    }
};

