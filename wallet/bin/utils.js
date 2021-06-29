var http = require('http')

function help () {
    console.log('Use "plov --help" to get more information.')
}

function status (node) {
    http.request(options, (res) => {
        res.on('data', () => )
    }).end()
    console.log(`Current time: 123
Last block: 321`)
}

module.exports = {
    help: help,
    status: status
}
