const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const nacl = require('tweetnacl')
const decodeUTF8 = require('tweetnacl-util').decodeUTF8
const BigNumber = require('bignumber.js')
const homedir = require('os').homedir()


function exportUint8Array (array) {
    let hex = [...new Uint8Array(array)].map(x => x.toString(16).padStart(2, '0')).join('')
    return new BigNumber(hex, 16).toString(36)
}

function importUint8Array (string) {
    let num = new BigNumber(string, 36)
    let array = []
    while (num.gte(256)) {
        array.push(num.mod(256).toNumber())
        num = num.idiv(256)
    }
    array.push(num.toNumber())
    return new Uint8Array(array.reverse())
}

function signMessage (message, secretKey) {
    return exportUint8Array(nacl.sign.detached(decodeUTF8(message), secretKey))
}

function getTransactionHash (transaction) {
    return exportUint8Array(nacl.hash(decodeUTF8(getTransactionString(transaction))))
}

function getTransactionString (transaction) {
    return transaction.fromPublicKey + transaction.toPublicKey + transaction.amount.toString() + transaction.nonce.toString
}


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
        let publicKey = exportUint8Array(keypair.publicKey)
        let secretKey = exportUint8Array(keypair.secretKey)

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
    if (account.length < 50) {
        // Keypair filename
        fs.readFile(path.join(homedir, '.plov', account), 'utf8' , (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            publicKey = data.split('\n')[0]
            secretKey = importUint8Array(data.split('\n')[1])

            let transaction = {
                fromPublicKey: publicKey,
                toPublicKey: recipient,
                amount: amount,
                nonce: 1 // TODO
            }
            transaction.hash = getTransactionHash(transaction)
            transaction.signature = signMessage(transaction.hash, secretKey)

            fetch(node + '/sendTx', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(transaction)
            })
              .then(res => res.json())
              .then(json => {
                  if (json.ok) {
                      console.log(json.data)
                  }
                  else {
                      console.log('Error!')
                  }
              })
        })
    }
}

module.exports = {
    help: help,
    status: status,
    balance: balance,
    generateKeyPair: generateKeyPair,
    transfer: transfer
}
