'use strict';

const { resolve }   = require('path');
const fs            = require('fs-extra');
const glob          = require('glob');
const { merge }     = require('lodash');

function cleanEmptyDir(target) {
    const list = glob.sync('**', {
        cwd: target,
        nodir: false,
    });
    for (let i = list.length - 1; i >= 0; i--) {
        const filePath = resolve(target, list[i]);
        if (fs.statSync(filePath).isDirectory()) {
            if (0 === fs.readdirSync(filePath).length) {
                fs.removeSync(filePath);
            }
        }
    }
}

module.exports = {
    cleanEmptyDir,
    merge,
};
