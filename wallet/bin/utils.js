const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const homedir = require('os').homedir()

function help () {
    console.log('Use "plov --help" to get more information.')
}

function status (node) {
    fetch(node + '/getBlockchainHeight')
        .then(res => res.json())
        .then(json => {
            if (json.ok) {
                console.log('Current block:', json.data)
                console.log('Current timestamp:', json.timestamp)
            }
            else {
                console.log('Error!')
            }
        })
}

function generateKeyPair () {
    fs.mkdir(path.join(homedir, '.plov'), (err) => {
        if (err) return console.error(err)
        console.log('Directory created successfully!')
    })
}

module.exports = {
    help: help,
    status: status
}
