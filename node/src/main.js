//============Cryptography=============//
const BigNumber = require('bignumber.js')

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
//============Cryptography=============//


//=============Blockchain==============//
const nacl = require('tweetnacl')
const decodeUTF8 = require('tweetnacl-util').decodeUTF8

function getCurrentTimestamp () {
    return Math.round(new Date().getTime() / 1000)
}

function getBlockHash (block) {
    return exportUint8Array(nacl.hash(decodeUTF8(getBlockString(block))))
}

function getBlockString (block) {
    let transactionsString = ''
    for (let i = 0; i < block.transactions.length; i += 1) transactionsString += block.transactions[i].hash
    return block.index.toString() + block.timestamp.toString() + transactionsString + block.producer
}

class Block {
    constructor (index, transactions, keypair) {
        this.index = index
        this.timestamp = getCurrentTimestamp()
        this.transactions = transactions
        this.producer = exportUint8Array(keypair.publicKey)
        this.hash = getBlockHash(this)
        this.signature = signMessage(this.hash, keypair.secretKey)
    }
}

function createNewBlock (transactions, keypair) {
    return new Block (
        blockchainState.height,
        transactions,
        keypair
    )
}

function broadcastBlock (block) {
    let message = {
        action: Actions.BROADCAST_BLOCK,
        data: block
    }
    broadcast(message)
}

function broadcastTransaction (transaction) {
    let message = {
        action: Actions.BROADCAST_TRANSACTION,
        data: transaction
    }
    broadcast(message)
}

function pushBlock (block) {
    lastBlock = block
    blockchainState.height = block.index + 1
    transactionPool = transactionPool.filter(transaction => !block.transactions.includes(transaction))
    for (let i = 0; i < block.transactions.length; i += 1) {
        let tx = block.transactions[i]
        blockchainState.accounts[tx.fromPublicKey].balance = blockchainState.accounts[tx.fromPublicKey].balance.minus(tx.amount)
        if (!(tx.toPublicKey in blockchainState.accounts)) {
            blockchainState.accounts[tx.toPublicKey] = {
                nonce: 0,
                balance: new BigNumber(0)
            }
        }
        blockchainState.accounts[tx.toPublicKey].balance = blockchainState.accounts[tx.toPublicKey].balance.plus(tx.amount)
        blockchainState.accounts[tx.fromPublicKey].nonce += 1
    }
}

function verifyBlock (block) {
    try {
        for (let i = 0; i < block.transactions.length; i += 1) {
            if (!verifyTransaction(block.transactions[i])) return false
        }
        return (block.index == blockchainState.height) &&
               (block.hash == getBlockHash(block)) &&
               (verifySignature(block.hash, block.signature, importUint8Array(block.producer)))
    }
    catch {
        return false
    }
}

function generateKeyPair () {
    return nacl.sign.keyPair()
}

function signMessage (message, secretKey) {
    return exportUint8Array(nacl.sign.detached(decodeUTF8(message), secretKey))
}

function verifySignature (message, signature, publicKey) {
    try {
        return nacl.sign.detached.verify(decodeUTF8(message), importUint8Array(signature), publicKey)
    }
    catch {
        return false
    }
}

function getTransactionHash (transaction) {
    return exportUint8Array(nacl.hash(decodeUTF8(getTransactionString(transaction))))
}

function getTransactionString (transaction) {
    return transaction.fromPublicKey + transaction.toPublicKey + transaction.amount.toFixed(12, 1) + transaction.nonce.toString()
}

function verifyTransaction (transaction) {
    transaction.amount = new BigNumber(transaction.amount)
    try {
        return (transaction.fromPublicKey in blockchainState.accounts) &&
               (transaction.nonce == blockchainState.accounts[transaction.fromPublicKey].nonce + 1) &&
               (transaction.hash == getTransactionHash(transaction)) &&
               (verifySignature(transaction.hash, transaction.signature, importUint8Array(transaction.fromPublicKey))) &&
               (transaction.amount.gte(0)) &&
               (transaction.amount.dp() <= 12) &&
               (transaction.amount.lte(blockchainState.accounts[transaction.fromPublicKey].balance))
    }
    catch {
        return false
    }
}

var lastBlock
var blockchainState = {
    height: 0,
    accounts: {
        '9nh9cw98fwkdwupzcw6kmnlqvesbxwh56azgan58ryjbfqk53': {
            nonce: 0,
            balance: new BigNumber('1000')
        }
    }
}
var transactionPool = []
//=============Blockchain==============//


//==============HTTP=API===============//
const express = require('express')
const bodyParser = require('body-parser')

function httpResponse(ok, data) {
    let response = {
        ok: ok,
        timestamp: getCurrentTimestamp()
    }
    if (data == undefined) return JSON.stringify(response)
    response.data = data
    return JSON.stringify(response)
}

function initHTTPServer (port) {
    var app = express()
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({extended: true}))

    app.get('/getBlockchainHeight', (req, res) => res.send(httpResponse(true, blockchainState.height)))
    app.get('/getPeers', (req, res) => res.send(httpResponse(true, getPeers())))
    app.get('/getAccount', (req, res) => {
        if (!req.query.account) res.send(httpResponse(false))
        else {
            let account = blockchainState.accounts[req.query.account]
            if (account) res.send(httpResponse(true, account))
            else res.send(httpResponse(true, {
                balance: 0,
                nonce: 0
            }))
        }
    })

    app.post('/sendTx', (req, res) => {
        console.log(req.body)
        if (verifyTransaction(req.body)) {
            transactionPool.push(req.body)
            broadcastTransaction(req.body)
            res.send(httpResponse(true))
        }
        else res.send(httpResponse(false))
    })

    app.listen(port)
}
//==============HTTP=API===============//


//============WebSocket=P2P============//
const WebSocket = require('ws')
const Actions = {
    QUERY_BLOCKCHAIN_STATE: 1,
    QUERY_LAST_BLOCK: 2,
    QUERY_PEERS: 3,

    RESPONSE_BLOCKCHAIN_STATE: 4,
    RESPONSE_LAST_BLOCK: 5,
    RESPONSE_PEERS: 6,

    BROADCAST_BLOCK: 7,
    BROADCAST_TRANSACTION: 8
}
const PEERS_TO_KEEP_CONNECTED = 3

var peers = []
var peersQueue = new Set()

function getPeers () {
    let peersList = []
    for (let i = 0; i < peers.length; i += 1) {
        if (peers[i].url) peersList.push(peers[i].url)
    }
    return peersList
}

function initP2PServer (port) {
    const wsServer = new WebSocket.Server({ port: port })
    wsServer.on('connection', (ws) => initConnection(ws, true))
}

function send (ws, message) {
    ws.send(JSON.stringify(message))
}

function broadcast (message) {
    for (let i = 0; i < peers.length; i += 1) send(peers[i], message)
}

function initConnection (ws, client) {
    peers.push(ws)

    if (!client) {
        send(ws, {action: Actions.QUERY_PEERS})
        send(ws, {action: Actions.QUERY_BLOCKCHAIN_STATE})
    }

    ws.on('message', (data) => {
        let message = JSON.parse(data)
        switch (message.action) {
            case Actions.QUERY_BLOCKCHAIN_STATE:
                send(ws, {
                    action: Actions.RESPONSE_BLOCKCHAIN_STATE,
                    data: blockchainState
                })
                break

            case Actions.QUERY_LAST_BLOCK:
                send(ws, {
                    action: Actions.RESPONSE_LAST_BLOCK,
                    data: lastBlock
                })
                break

            case Actions.QUERY_PEERS:
                send(ws, {
                    action: Actions.RESPONSE_PEERS,
                    data: getPeers()
                })
                break

            case Actions.RESPONSE_BLOCKCHAIN_STATE:
                if (message.data.height > blockchainState.height) {
                    send(ws, {action: Actions.QUERY_LAST_BLOCK})
                    blockchainState = message.data
                }
                break

            case Actions.RESPONSE_LAST_BLOCK:
                if (verifyBlock(message.data)) lastBlock = message.data
                break

            case Actions.RESPONSE_PEERS:
                if (ws.url) {
                    let index = message.data.indexOf(ws.url)
                    if (index >= 0) message.data.splice(message.data.indexOf(ws.url), 1)
                }
                peersQueue = new Set([...peersQueue, ...message.data])
                break

            case Actions.BROADCAST_BLOCK:
                if (verifyBlock(message.data)) {
                    pushBlock(message.data)
                    broadcastBlock(message.data)
                }

            case Actions.BROADCAST_TRANSACTION:
                if (verifyTransaction(message.data)) {
                    transactionPool.push(message.data)
                    broadcastTransaction(message.data)
                }
        }
    })

    ws.on('close', () => closeConnection(ws))
    ws.on('error', () => closeConnection(ws))
}

function closeConnection (ws) {
    peers.splice(peers.indexOf(ws), 1)
}

function connectToPeer (peer) {
    if (!getPeers().includes(peer)) {
        peersQueue.delete(peer)
        let ws = new WebSocket(peer)
        ws.on('open', () => initConnection(ws, false))
    }
}

setInterval(() => {
    if (peers.length < PEERS_TO_KEEP_CONNECTED && peersQueue.size > 0) {
        connectToPeer(peersQueue.values().next().value)
    }
}, 1000)
//============WebSocket=P2P============//


const keypair = generateKeyPair()

var wsPort
var httpPort
var firstConnection
var genesis

for (let i = 0; i < process.argv.length - 1; i += 1) {
    if (process.argv[i] == '--ws-port') {
        wsPort = Number(process.argv[i + 1])
    }
    if (process.argv[i] == '--http-port') {
        httpPort = Number(process.argv[i + 1])
    }
    if (process.argv[i] == '--peer') {
        firstConnection = process.argv[i + 1]
    }
    if (process.argv[i] == '--genesis') {
        genesis = true
    }
}
if (process.argv[process.argv.length - 1] == '--genesis') genesis = true

if (isNaN(wsPort)) process.exit(1)
else initP2PServer(wsPort)

if (!isNaN(httpPort)) initHTTPServer(httpPort)

if (firstConnection !== undefined) connectToPeer(firstConnection)

if (genesis) {
    pushBlock(new Block(0, [], keypair))
    setInterval(() => {
        console.log('<<<<<<New block>>>>>>')
        let block = createNewBlock(transactionPool, keypair)
        pushBlock(block)
        broadcastBlock(block)
    }, 2000)
}

setInterval(() => {
    console.log('==============')
    let s = blockchainState.accounts
    for (let i in s) {
        console.log(i, '=>', s[i].balance.toString())
    }
    console.log('==============')
}, 1000)
