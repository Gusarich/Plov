//=============Blockchain==============//
class Block {
    constructor (index, previousHash, timestamp, data, hash) {
        this.index = index
        this.previousHash = previousHash
        this.timestamp = timestamp
        this.data = data
        this.hash = hash
    }
}
//=============Blockchain==============//

//==============HTTP=API===============//

//==============HTTP=API===============//

//============WebSocket=P2P============//
const WebSocket = require('ws')
const Actions = {
    QUERY_INFO: 1,
    QUERY_CHAIN: 2,
    QUERY_PEERS: 3,
    RESPONSE_INFO: 4,
    RESPONSE_CHAIN: 5,
    RESPONSE_PEERS: 6
}

var peers = []

function initP2PServer (port) {
    const wsServer = new WebSocket.Server({ port: port })
    wsServer.on('connection', (ws) => initConnection(ws))
}

function initConnection (ws) {
    peers.push(ws)

    ws.on('message', (data) => {
        let message = JSON.parse(data)
        console.log('Received message:')
        console.log(message)
        switch (message.action) {
            case Actions.QUERY_INFO:
                break
            case Actions.QUERY_CHAIN:
                break
            case Actions.QUERY_PEERS:
                break
            case Actions.RESPONSE_INFO:
                break
            case Actions.RESPONSE_CHAIN:
                break
            case Actions.RESPONSE_PEERS:
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
    let ws = new WebSocket(peer)
    ws.on('open', () => initConnection(ws))
}
//============WebSocket=P2P============//


var port
var firstConnection

for (let i = 0; i < process.argv.length - 1; i += 1) {
    if (process.argv[i] == '--port') {
        port = Number(process.argv[i + 1])
    }
    if (process.argv[i] == '--peer') {
        firstConnection = process.argv[i + 1]
    }
}

if (isNaN(port)) {
    process.exit(1)
}
else {
    initP2PServer(port)
}

if (firstConnection !== undefined) {
    connectToPeer(firstConnection)
}
