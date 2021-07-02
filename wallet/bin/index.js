#! /usr/bin/env node

const yargs = require('yargs')
const utils = require('./utils.js')

const options = yargs
    .usage('Usage: plov <command> [options]')
    .command('status', 'Get current blockchain status', yargs => {
        yargs.demandOption(['node'])
        utils.status(yargs.argv.node)
    })
    .command('keypair', 'Keypair actions', yargs => {
        argv = yargs
            .usage('Usage: node account <command> [options]')
            .command('generate', 'Generate a new keypair', yargs => {
                utils.generateKeyPair()
            })
            .help(true)
            .argv
        if (argv._[1] == null) utils.help('plov keypair')
    })
    .command('balance', 'Get balance of existing account', yargs => {
        yargs.demandOption(['node', 'account'])
        utils.balance(yargs.argv.account, yargs.argv.node)
    })
    .nargs('node', 1)
    .describe('node', 'Remote node address')
    .help(true)
    .version(false)

if (yargs.argv._[0] == null) utils.help('plov')
