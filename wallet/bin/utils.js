const fetch = require('sync-fetch')
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
    return transaction.action + transaction.fromPublicKey + transaction.toPublicKey + transaction.amount.toFixed(12, 1) + transaction.nonce.toString()
}

function getKeypairFilePath (keypair) {
    let filePath = path.join(homedir, '.plov', keypair)
    if (!fs.existsSync(filePath) && fs.existsSync(keypair)) filePath = keypair
    return filePath
}

function help (command) {
    console.log('Use "' + command + ' --help" to get more information.')
}

function status (node) {
    json = fetch(node + '/getBlockchainHeight').json()
    if (json.ok) {
        console.log('Current block:', json.data)
        console.log('Current timestamp:', json.timestamp)
    }
    else console.log('Error!')
}

function balance (account, node) {
    json = fetch(node + '/getAccount?account=' + account).json()
    if (json.ok) console.log(json.data.balance)
    else console.log('Error!')
}

function generateKeyPair (filePath, noFile) {
    let hex
    let keypair = nacl.sign.keyPair()
    let publicKey = exportUint8Array(keypair.publicKey)
    let secretKey = exportUint8Array(keypair.secretKey)

    if (noFile) {
        console.log('Keypair generated!\nPublic key:\n' + publicKey + '\nSecret key:\n' + secretKey)
    }

    else if (!filePath) {
        fs.mkdir(path.join(homedir, '.plov'), err => {
            if (err && err.errno != -17) return console.error(err)
            // .plov Directory created

            fs.readdir(path.join(homedir, '.plov'), (err, files) => {
                let index = 0
                files.forEach(file => {
                    if (file.startsWith('keypair')) {
                        let num = parseInt(file.slice(7))
                        if (num > index) index = num
                    }
                })
                index += 1
                filePath = path.join(homedir, '.plov', 'keypair' + index.toString())
                fs.writeFile(filePath, publicKey + '\n' + secretKey + '\n', err => {
                    if (err) return console.error(err)
                    console.log('Keypair generated! (keypair' + index.toString() + ')\nPublic key:\n' + publicKey)
                })
            })
        })
    }

    else {
        fs.writeFile(filePath, publicKey + '\n' + secretKey + '\n', err => {
            if (err) return console.error(err)
            console.log('Keypair generated! (' + filePath + ')\nPublic key:\n' + publicKey)
        })
    }
}

function send_transaction (transaction, node, account) {
    let publicKey, secretKey
    if (fs.existsSync(account)) {
        let data = fs.readFileSync(getKeypairFilePath(account), 'utf8')
        publicKey = data.split('\n')[0]
        secretKey = importUint8Array(data.split('\n')[1])
    }
    else {
        secretKey = account
        keypair = nacl.sign.keyPair.fromSecretKey(importUint8Array(secretKey))
        secretKey = keypair.secretKey
        publicKey = exportUint8Array(keypair.publicKey)
    }

    json = fetch(node + '/getAccount?account=' + publicKey).json()
    if (json.ok) {
        nonce = json.data.nonce + 1
        transaction.fromPublicKey = publicKey
        transaction.nonce = nonce
        transaction.hash = getTransactionHash(transaction)
        transaction.signature = signMessage(transaction.hash, secretKey)

        ok = fetch(node + '/sendTx', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(transaction)
        }).json().ok
        if (ok) console.log('Success!')
        else console.log('Error!')
    }
    else console.log('Error!')
}

function transfer (amount, recipient, node, account) {
    amount = new BigNumber(amount)
    let transaction = {
        action: 'transfer',
        toPublicKey: recipient,
        amount: amount
    }
    send_transaction(transaction, node, account)
}

function stake (amount, node, account) {
    amount = new BigNumber(amount)
    let transaction = {
        action: 'stake',
        amount: amount
    }
    send_transaction(transaction, node, account)
}

function unstake (amount, node, account) {
    amount = new BigNumber(amount)
    let transaction = {
        action: 'unstake',
        amount: amount
    }
    send_transaction(transaction, node, account)
}

function allocate (amount, node, account) {
    amount = new BigNumber(amount)
    let transaction = {
        action: 'allocate',
        amount: amount
    }
    send_transaction(transaction, node, account)
}

function deallocate (amount, node, account) {
    amount = new BigNumber(amount)
    let transaction = {
        action: 'deallocate',
        amount: amount
    }
    send_transaction(transaction, node, account)
}

module.exports = {
    help: help,
    status: status,
    balance: balance,
    generateKeyPair: generateKeyPair,
    transfer: transfer,
    stake: stake,
    unstake: unstake,
    allocate: allocate,
    deallocate: deallocate
}
