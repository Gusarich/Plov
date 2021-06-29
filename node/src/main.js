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
    return block.index.toString() + block.previousHash + block.timestamp.toString() + transactionsString + block.producer
}

function getBlockchainHeight () {
    if (blockchain.length) return blockchain[blockchain.length - 1].index
    else return -1
}

class Block {
    constructor (index, previousHash, transactions, keypair) {
        this.index = index
        this.previousHash = previousHash
        this.timestamp = getCurrentTimestamp()
        this.transactions = transactions
        this.producer = exportUint8Array(keypair.publicKey)
        this.hash = getBlockHash(this)
        this.signature = signMessage(this.hash, keypair.secretKey)
    }
}

function createNewBlock (transactions, keypair) {
    let previousBlock = blockchain[blockchain.length - 1]
    return new Block (
        previousBlock.index + 1,
        previousBlock.hash,
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
    blockchain.push(block)
    blockchainState.block = block.index
    transactionPool = transactionPool.filter(transaction => !block.transactions.includes(transaction))
}

function verifyBlock (block) {
    for (let i = 0; i < block.transactions.length; i += 1) {
        if (!verifyTransaction(block.transactions[i])) return false
    }
    return (block.index == blockchain[block.index - 1].index + 1) &&
           (blockchain[block.index - 1].hash == block.previousHash) &&
           (block.hash == getBlockHash(block)) &&
           (verifySignature(block.hash, block.signature, importUint8Array(block.producer)))
}

function verifyChain () {
    for (let i = 0; i < blockchain.length; i += 1) {
        if (!verifyBlock(blockchain[i])) return false
    }
    return true
}

function generateKeyPair () {
    return nacl.sign.keyPair()
}

function signMessage (message, secretKey) {
    return exportUint8Array(nacl.sign.detached(decodeUTF8(message), secretKey))
}

function verifySignature (message, signature, publicKey) {
    return nacl.sign.detached.verify(decodeUTF8(message), importUint8Array(signature), publicKey)
}

function verifyTransaction (transaction) {
    return (transaction.fromPublicKey in blockchainState.accounts) &&
           (transaction.nonce == blockchainState.accounts[transaction.fromPublicKey].nonce + 1) &&
           (transaction.hash == getTransactionHash(transaction)) &&
           (verifySignature(transaction.hash, transaction.signature, importUint8Array(transaction.fromPublicKey))) &&
           (transaction.amount <= blockchainState.accounts[transaction.fromPublicKey].balance)
}

var blockchain = []
var blockchainState = {
    block: 0,
    accounts: {}
}
var transactionPool = []
//=============Blockchain==============//


//==============HTTP=API===============//
const express = require('express')
const bodyParser = require('body-parser')

function initHTTPServer (port) {
    var app = express()
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({extended: true}))

    app.get('/getBlockchainHeight', (req, res) => res.send(JSON.stringify(getBlockchainHeight())))
    app.get('/getBlock', (req, res) => res.send(JSON.stringify(blockchain[req.query.index])))
    app.get('/getPeers', (req, res) => res.send(JSON.stringify(getPeers())))

    app.post('/sendTx', (req, res) => {
        console.log(verifyTransaction(req.body))
        if (verifyTransaction(req.body)) {

        }
        res.send(JSON.stringify('Hello there'))
    })

    app.listen(port)
}
//==============HTTP=API===============//


//============WebSocket=P2P============//
const WebSocket = require('ws')
const Actions = {
    QUERY_BLOCKCHAIN_HEIGHT: 1,
    QUERY_CHAIN: 2,
    QUERY_PEERS: 3,

    RESPONSE_BLOCKCHAIN_HEIGHT: 4,
    RESPONSE_CHAIN: 5,
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
        send(ws, {action: Actions.QUERY_BLOCKCHAIN_HEIGHT})
    }

    ws.on('message', (data) => {
        let message = JSON.parse(data)
        switch (message.action) {
            case Actions.QUERY_BLOCKCHAIN_HEIGHT:
                send(ws, {
                    action: Actions.RESPONSE_BLOCKCHAIN_HEIGHT,
                    data: getBlockchainHeight()
                })
                break

            case Actions.QUERY_CHAIN:
                send(ws, {
                    action: Actions.RESPONSE_CHAIN,
                    data: blockchain
                })
                break

            case Actions.QUERY_PEERS:
                send(ws, {
                    action: Actions.RESPONSE_PEERS,
                    data: getPeers()
                })
                break

            case Actions.RESPONSE_BLOCKCHAIN_HEIGHT:
                if (message.data > getBlockchainHeight()) send(ws, {action: Actions.QUERY_CHAIN})
                break

            case Actions.RESPONSE_CHAIN:
                let chain = message.data
                if (verifyChain(chain)) blockchain = chain
                break

            case Actions.RESPONSE_PEERS:
                if (ws.url) {
                    let index = message.data.indexOf(ws.url)
                    if (index >= 0) message.data.splice(message.data.indexOf(ws.url), 1)
                }
                peersQueue = new Set([...peersQueue, ...message.data])
                break

            case Actions.BROADCAST_BLOCK:
                if (message.data.index == getBlockchainHeight() + 1 && verifyBlock(message.data)) {
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
    pushBlock(new Block(0, '', [], keypair))
    setInterval(() => {
        console.log('<<<<<<New block>>>>>>')
        let block = createNewBlock(transactionPool, keypair)
        pushBlock(block)
        broadcastBlock(block)
    }, 3000)
}

setInterval(() => {
    console.log(blockchain.length)
}, 1000)
