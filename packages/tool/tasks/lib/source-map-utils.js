'use strict';

const path      = require('path');
const fs        = require('fs-extra');
const chalk     = require('chalk');
const convert   = require('convert-source-map');

function detectSourceMap(src) {
    try {
        const code = fs.readFileSync(src).toString();
        // try from inline
        if (convert.commentRegex.test(code)) {
            return convert.fromComment(code).toObject();
        }
        // retry from map file
        if (convert.mapFileCommentRegex.test(code)) {
            return convert.fromMapFileComment(code, path.dirname(src)).toObject();
        }
    } catch (error) {
        console.log(chalk.red(`    ERROR: cannot detect source-map for ${src}.`));
    }
}

function dropSourceMap(src) {
    try {
        const code = src.includes('\n') ? src : fs.readFileSync(src).toString();
        return convert.removeMapFileComments(convert.removeComments(code));
    } catch (error) {
        console.log(chalk.red(`    ERROR: cannot drop source-map for ${src}.`));
    }
}

module.exports = {
    detectSourceMap,
    dropSourceMap,
};
