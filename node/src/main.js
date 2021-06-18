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
    return block.index.toString() + block.previousHash + block.timestamp.toString() + block.data + block.producer
}

function getBlockchainHeight () {
    if (blockchain.length) return blockchain[blockchain.length - 1].index
    else return -1
}

class Block {
    constructor (index, previousHash, data, keypair) {
        this.index = index
        this.previousHash = previousHash
        this.timestamp = getCurrentTimestamp()
        this.data = data
        this.producer = exportUint8Array(keypair.publicKey)
        this.hash = getBlockHash(this)
        this.signature = signMessage(getBlockString(this) + this.hash, keypair.secretKey)
    }
}

function createNewBlock (data, keypair) {
    let previousBlock = blockchain[blockchain.length - 1]
    return new Block (
        previousBlock.index + 1,
        previousBlock.hash,
        data,
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

function verifyBlock (block) {
    console.log(block.hash)
    console.log(getBlockHash(block))
    return (block.index == blockchain[block.index - 1].index + 1) &&
           (blockchain[block.index - 1].hash == block.previousHash) &&
           (block.hash == getBlockHash(block)) &&
           (verifySignature(getBlockString(block) + block.hash, block.signature, importUint8Array(block.producer)))
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

var blockchain = []
//=============Blockchain==============//


//==============HTTP=API===============//
const express = require('express')
const bodyParser = require('body-parser')

function initHTTPServer (port) {
    var app = express()
    app.use(bodyParser.json())
    app.get('/getBlockchainHeight', (req, res) => res.send(JSON.stringify(getBlockchainHeight())))
    app.get('/getBlock', (req, res) => res.send(JSON.stringify(blockchain[req.query.index])))
    app.get('/getPeers', (req, res) => res.send(JSON.stringify(getPeers())))
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
const PEERS_TO_KEEP_CONNECTED = 2

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
        //console.log('Received message:')
        //console.log('<', message, '>')
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
                    blockchain.push(message.data)
                    broadcastBlock(message.data)
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
    peersQueue.delete(peer)
    let ws = new WebSocket(peer)
    ws.on('open', () => initConnection(ws, false))
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
    blockchain.push(new Block(0, '', 'Genesis block!', keypair))
    setInterval(() => {
        console.log('<<<<<<New block>>>>>>')
        let block = createNewBlock('Hey guys <3', keypair)
        blockchain.push(block)
        broadcastBlock(block)
    }, 5000)
}

setInterval(() => {
    console.log(blockchain.length)
    if (blockchain.length > 1) console.log(verifyBlock(blockchain[blockchain.length - 1]))
}, 1000)
