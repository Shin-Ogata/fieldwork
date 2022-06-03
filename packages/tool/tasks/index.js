'use strict';

const { format } = require('util');
const command    = require('./command');
const config     = require('./config');
const banner     = require('./banner');
const utils      = require('./utils');
const colors     = require('./colors');
const cli        = require('./lib/cli-command-parser');
const {
    merge,
    includes,
    copy,
    del,
} = require('./lib/misc');

const plugins = cli.loadPlugins();

async function main() {
    try {
        const cmd = cli.parseCommand();
        const { action } = cmd;
        await plugins[action].exec(cmd[action]);
    } catch (e) {
        onError(e);
    }
}

function onError(err) {
    console.error(colors.red(`${format(err)}`));
    process.exit(1);
}

module.exports = {
    main,
    command,
    config,
    banner,
    utils,
    merge,
    includes,
    copy,
    del,
};
