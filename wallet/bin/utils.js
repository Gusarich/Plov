const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const nacl = require('tweetnacl')
const decodeUTF8 = require('tweetnacl-util').decodeUTF8
const BigNumber = require('bignumber.js')
const homedir = require('os').homedir()

function help (command) {
    console.log('Use "' + command + ' --help" to get more information.')
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

function balance (account, node) {
    fetch(node + '/getAccount?account=' + account)
        .then(res => res.json())
        .then(json => {
            if (json.ok) {
                console.log(json.data.balance)
            }
            else {
                console.log('Error!')
            }
        })
}

function generateKeyPair () {
    fs.mkdir(path.join(homedir, '.plov'), err => {
        if (err && err.errno != -17) return console.error(err)
        // .plov Directory created
        let hex
        let keypair = nacl.sign.keyPair()
         hex = [...new Uint8Array(keypair.publicKey)].map(x => x.toString(16).padStart(2, '0')).join('')
        let publicKey = new BigNumber(hex, 16).toString(36)
        hex = [...new Uint8Array(keypair.secretKey)].map(x => x.toString(16).padStart(2, '0')).join('')
        let secretKey = new BigNumber(hex, 16).toString(36)

        fs.readdir(path.join(homedir, '.plov'), (err, files) => {
            let index = 0
            files.forEach(file => {
                if (file.startsWith('keypair')) {
                    let num = parseInt(file.slice(7))
                    if (num > index) index = num
                }
            })
            index += 1
            fs.writeFile(path.join(homedir, '.plov', 'keypair' + index.toString()), publicKey + '\n' + secretKey + '\n', err => {
                if (err) return console.error(err)
                console.log('Keypair generated!')
            })
        })
    })
}

function transfer (amount, recipient, node, account) {
    if (account.length < 30) {
        // Keypair filename
        fs.readFile(path., 'utf8' , (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            console.log(data)
        })
    }
}

module.exports = {
    help: help,
    status: status,
    balance: balance,
    generateKeyPair: generateKeyPair
}
