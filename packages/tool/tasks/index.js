'use strict';

const { format }    = require('util');
const chalk         = require('chalk');
const command       = require('./command');
const config        = require('./config');
const banner        = require('./banner');
const cli           = require('./lib/cli-command-parser');

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
    console.error(chalk.red(`${format(err)}`));
    process.exit(1);
}

module.exports = {
    main,
    command,
    config,
    banner,
};
