'use strict';

const { readFile } = require('fs');
const { detectSourceMap: detect } = require('./lib/source-map-utils');

function detectSourceMap() {
    return {
        name: 'source-map-detect',
        load(id) {
            return new Promise(resolve => {
                readFile(id, 'utf8', (err, code) => {
                    if (err) {
                        resolve(null);
                    } else {
                        const map = detect(id);
                        if (null == map) {
                            resolve(code);
                        } else {
                            resolve({ code, map });
                        }
                    }
                });
            });
        },
    };
}

module.exports = detectSourceMap;
