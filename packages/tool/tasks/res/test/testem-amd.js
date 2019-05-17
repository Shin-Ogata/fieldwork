/* eslint-disable camelcase */

const { config } = require('@cdp/tasks');
const settings   = require('./testem.json');

const test_root = `${config.dir.temp}/testem`;

const require_paths = [];
for (const key of Object.keys(settings.require_config.paths)) {
    require_paths.push({ name: key, path: settings.require_config.paths[key] });
}

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
    test_root,
    test_page: `${test_root}/testem.index.mustache`,
    require_paths,
};

module.exports = Object.assign({}, testem, settings);
