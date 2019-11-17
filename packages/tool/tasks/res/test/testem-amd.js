/* eslint-disable camelcase */

const { config } = require('@cdp/tasks');
const settings   = require('./testem.json');

const testem = {
    framework: 'jasmine2',
    launch_in_dev: ['chrome'],
    launch_in_ci: ['chrome'],
    browser_args: {
        chrome: {
            dev: [
                '--auto-open-devtools-for-tabs'
            ],
            ci: [
                '--headless',
                '--remote-debugging-port=9222',
                '--disable-gpu'
            ],
        },
    },
    test_page: `${config.dir.temp}/testem/testem.index.mustache`,
    require_config: JSON.stringify(settings.requirejs_config),
};

module.exports = Object.assign({}, testem, settings);
