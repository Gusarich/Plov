#! /usr/bin/env node

const yargs = require("yargs")
const utils = require('./utils.js')

const usage = "Plov CLI\n\nUsage: plov [command] [options]"
const options = yargs
    .usage(usage)
    /*.option("l", {
          alias: "languages",
          describe: "List all supported languages.",
          type: "boolean",
          demandOption: false
    })*/
    .help(true)
    .argv

if (yargs.argv._[0] == null) {
    utils.help()
}

const command = yargs.argv._[0]

if (command == 'status') {
    utils.status()
}
