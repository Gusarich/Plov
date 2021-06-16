//=============Blockchain==============//
const CryptoJS = require('crypto-js')

function getCurrentTimestamp () {
    return Math.round(new Date().getTime() / 1000)
}

function getBlockHash (block) {
    let string = block.index.toString() + block.previousHash + block.timestamp.toString() + block.data
    let hexdigest = CryptoJS.SHA256(string)
    return hexdigest.toString()
}

class Block {
    constructor (index, previousHash, timestamp, data) {
        this.index = index
        this.previousHash = previousHash
        this.timestamp = timestamp
        this.data = data
        this.hash = getBlockHash(this)
    }
}

function createNewBlock (data) {
    let previousBlock = blockchain[blockchain.length - 1]
    return new Block (
        previousBlock.index,
        previousBlock.hash,
        getCurrentTimestamp(),
        data
    )
}

function broadcastBlock (block) {
    let message = {
        action: Actions.BROADCAST_BLOCK,
        data: block
    }
    broadcast(message)
}

var blockchain = []
//=============Blockchain==============//


//==============HTTP=API===============//

//==============HTTP=API===============//


//============WebSocket=P2P============//
const WebSocket = require('ws')
const Actions = {
    QUERY_UNIQUE_ID: 1,
    QUERY_BLOCKCHAIN_HEIGHT: 2,
    QUERY_CHAIN: 3,
    QUERY_PEERS: 4,

    RESPONSE_UNIQUE_ID: 5,
    RESPONSE_BLOCKCHAIN_HEIGHT: 6,
    RESPONSE_CHAIN: 7,
    RESPONSE_PEERS: 8,

    BROADCAST_BLOCK: 9,
    BROADCAST_TRANSACTION: 10
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

    if (!client) send(ws, {action: Actions.QUERY_PEERS})

    ws.on('message', (data) => {
        let message = JSON.parse(data)
        console.log('Received message:')
        console.log('<', message, '>')
        switch (message.action) {
            case Actions.QUERY_BLOCKCHAIN_HEIGHT:
                send(ws, {
                    action: Actions.RESPONSE_BLOCKCHAIN_HEIGHT,
                    data: blockchain[blockchain.length - 1].index
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
                // TODO //
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
    //console.log(peers[2])
    console.log(peers.length, peersQueue.size)
    if (peers.length < PEERS_TO_KEEP_CONNECTED && peersQueue.size > 0) {
        connectToPeer(peersQueue.values().next().value)
    }
}, 1000)
//============WebSocket=P2P============//


var port
var firstConnection
var genesis

for (let i = 0; i < process.argv.length - 1; i += 1) {
    if (process.argv[i] == '--port') {
        port = Number(process.argv[i + 1])
    }
    if (process.argv[i] == '--peer') {
        firstConnection = process.argv[i + 1]
    }
    if (process.argv[i] == '--genesis') {
        genesis = true
    }
}
if (process.argv[process.argv.length - 1] == '--genesis') genesis = true

if (isNaN(port)) {
    process.exit(1)
}
else {
    initP2PServer(port)
}

if (firstConnection !== undefined) {
    connectToPeer(firstConnection)
}

if (genesis) {
    blockchain.push(new Block(0, '', getCurrentTimestamp(), 'Plov'))
}
