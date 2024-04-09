'use strict';

const path    = require('node:path');
const fs      = require('node:fs');
const convert = require('convert-source-map');
const colors  = require('../colors');

function detectSourceMap(src) {
    try {
        const code = fs.readFileSync(src).toString();
        // try from inline
        if (convert.commentRegex.test(code)) {
            return convert.fromComment(code).toObject();
        }
        // retry from map file
        if (convert.mapFileCommentRegex.test(code)) {
            // convert-source-map v2.+
            // https://github.com/thlorenz/convert-source-map/pull/76/files
            return convert.fromMapFileComment(code, (file) => {
                return fs.readFileSync(path.resolve(path.dirname(src), file), 'utf-8');
            }).toObject();
        }
    } catch (e) {
        console.log(colors.red(`    ERROR: cannot detect source-map for ${src}.`));
        console.log(colors.red(`    ${e}.`));
    }
}

function dropSourceMap(src) {
    try {
        const code = src.includes('\n') ? src : fs.readFileSync(src).toString();
        return convert.removeMapFileComments(convert.removeComments(code)).replace(/[\n\s]*$/, '\n');
    } catch (e) {
        console.log(colors.red(`    ERROR: cannot drop source-map for ${src}.`));
        console.log(colors.red(`    ${e}.`));
    }
}

function appendInlineSourceMap(src, map) {
    return dropSourceMap(src) + convert.fromObject(map).toComment();
}

module.exports = {
    detectSourceMap,
    dropSourceMap,
    appendInlineSourceMap,
};
