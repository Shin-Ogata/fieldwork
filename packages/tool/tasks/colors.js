'use strict';

function bold(src) {
    return `\x1B[1m${src}\x1B[22m`;
}

function italic(src) {
    return `\x1B[3m${src}\x1B[23m`;
}

function underline(src) {
    return `\x1B[4m${src}\x1B[24m`;
}

function strikethrough(src) {
    return `\x1B[9m${src}\x1B[29m`;
}

function inverse(src) {
    return `\x1B[7m${src}\x1B[27m`;
}

function create(seed) {
    const base = function(src) {
        return `${this[0]}${src}${this[1]}`; // eslint-disable-line no-invalid-this
    };
    const color = base.bind(seed);
    color.bold          = (src) => bold(color(src));
    color.italic        = (src) => italic(color(src));
    color.underline     = (src) => underline(color(src));
    color.strikethrough = (src) => strikethrough(color(src));
    color.inverse       = (src) => inverse(color(src));
    return color;
}

const black   = create(['\u001b[30m', '\u001b[0m']);
const red     = create(['\u001b[31m', '\u001b[0m']);
const green   = create(['\u001b[32m', '\u001b[0m']);
const yellow  = create(['\u001b[33m', '\u001b[0m']);
const blue    = create(['\u001b[34m', '\u001b[0m']);
const magenta = create(['\u001b[35m', '\u001b[0m']);
const cyan    = create(['\u001b[36m', '\u001b[0m']);
const white   = create(['\u001b[37m', '\u001b[0m']);
const gray    = create(['\u001b[90m', '\u001b[0m']);

module.exports = {
    bold,
    italic,
    underline,
    strikethrough,
    inverse,
    black,
    red,
    green,
    yellow,
    blue,
    magenta,
    cyan,
    white,
    gray,
};
