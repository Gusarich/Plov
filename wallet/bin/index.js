#! /usr/bin/env node

const yargs = require('yargs')
const utils = require('./utils.js')

const options = yargs
    .usage('Usage: plov <command> [options]')
    .command('status', 'Get current blockchain status', yargs => {
        yargs.demandOption(['node'])
        utils.status(yargs.argv.node)
    })
    .nargs('node', 1)
    .describe('node', 'Remote node address')
    .help(true)
    .version(false)

if (yargs.argv._[0] == null) utils.help()
