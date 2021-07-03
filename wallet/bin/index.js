#! /usr/bin/env node

const yargs = require('yargs')
const utils = require('./utils.js')

const options = yargs
    .parserConfiguration({'parse-positional-numbers': false})
    .usage('Usage: plov <command> [options]')
    .command('status', 'Get current blockchain status', yargs => {
        yargs.demandOption(['node'])
        utils.status(yargs.argv.node)
    })
    .command('keypair', 'Keypair actions', yargs => {
        argv = yargs
            .usage('Usage: node account <command> [options]')
            .command('generate', 'Generate a new keypair', yargs => {
                argv = yargs
                    .option('path')
                    .argv
                utils.generateKeyPair(argv.path)
            })
            .help(true)
            .argv
        if (argv._[1] == null) utils.help('plov keypair')
    })
    .command('balance', 'Get balance of existing account', yargs => {
        yargs.demandOption(['node', 'account'])
        utils.balance(yargs.argv.account, yargs.argv.node)
    })
    .command('transfer', 'Transfer Plov to another account', yargs => {
        argv = yargs
            .usage('Usage: node transfer <amount> <recipient> [options]')
            .positional('amount', {type: 'string'})
            .positional('recipient', {type: 'string'})
            .demandOption(['node', 'account'])
            .argv
        console.log(argv)
        if (argv._[2] == null) utils.help('plov transfer')
        else utils.transfer(argv._[1], argv._[2], argv.node, argv.account)
    })
    .nargs('node', 1)
    .describe('node', 'Remote node address')
    .describe('account', 'Public key / Secret key / Keypair filename')
    .describe('path', 'Path to file')
    .help(true)
    .version(false)

if (yargs.argv._[0] == null) utils.help('plov')
