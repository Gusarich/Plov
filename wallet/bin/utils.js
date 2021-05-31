function help () {
    console.log('Use "plov --help" to get more information.')
}

function status (words) {
    console.log(`Current time: 123
Last block: 321`)
}

module.exports = {
    help: help,
    status: status
}
