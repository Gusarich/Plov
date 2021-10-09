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

const ZERO = new BigNumber('0')
const BURN_MULTIPLIER = new BigNumber('2')

function getCurrentTimestamp () {
    return Math.round(new Date().getTime())
}

function getBlockHash (block) {
    return exportUint8Array(nacl.hash(decodeUTF8(getBlockString(block))))
}

function getBlockString (block) {
    let transactionsString = ''
    for (let i = 0; i < block.transactions.length; i += 1) transactionsString += block.transactions[i].hash
    return block.index.toString() + block.timestamp.toString() + transactionsString + block.producer
}

function getNextProducer () {
    if (blockchainState.height < 1 || !lastBlock) return false
    let lastBlockHash = new BigNumber(lastBlock.hash, 36)
    let currentSlot = lastBlock.index + Math.floor((getCurrentTimestamp() - lastBlock.timestamp) / BLOCK_TIME)

    // Not sure about RNG...
    let randomNumber = lastBlockHash.times(currentSlot).plus(lastBlock.timestamp)
    let coinIndex = randomNumber.mod(getTotalAllocated())

    for (let account in blockchainState.accounts) {
        coinIndex = coinIndex.minus(getAccountAllocation(account))
        if (coinIndex.lte(0)) return account
    }
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

function getAccountMaxAllocation (account) {
    return blockchainState.accounts[account].burned.times(2).plus(blockchainState.accounts[account].staked)
}

function getAccountAllocation (account) {
    let total = ZERO
    for (let allocation of blockchainState.accounts[account].allocation) {
        total = total.plus(allocation[0].times(blockchainState.height - allocation[1]))
    }
    return total
}

function getTotalAllocated () {
    let total = ZERO
    for (let account in blockchainState.accounts) {
        total = total.plus(getAccountAllocation(account))
    }
    return total
}

function pushBlock (block) {
    lastBlock = block
    blockchainState.height = block.index + 1

    blockTransactionHashes = []
    for (let i = 0; i < block.transactions.length; i += 1) blockTransactionHashes.push(block.transactions[i].hash)
    transactionPool = transactionPool.filter(transaction => !blockTransactionHashes.includes(transaction.hash))

    for (let i = 0; i < block.transactions.length; i += 1) {
        let tx = block.transactions[i]

        if (tx.action == 'transfer') {
            // Transfer coins
            blockchainState.accounts[tx.fromPublicKey].balance = blockchainState.accounts[tx.fromPublicKey].balance.minus(tx.amount)
            if (!(tx.toPublicKey in blockchainState.accounts)) {
                blockchainState.accounts[tx.toPublicKey] = {
                    nonce: 0,
                    balance: ZERO,
                    staked: ZERO,
                    burned: ZERO,
                    allocation: []
                }
            }
            blockchainState.accounts[tx.toPublicKey].balance = blockchainState.accounts[tx.toPublicKey].balance.plus(tx.amount)

            // Burning
            if (tx.toPublicKey == 'burn') {
                blockchainState.accounts[tx.fromPublicKey].burned = blockchainState.accounts[tx.fromPublicKey].burned.plus(tx.amount)
            }
        }

        else if (tx.action == 'stake') {
            // Stake coins
            blockchainState.accounts[tx.fromPublicKey].balance = blockchainState.accounts[tx.fromPublicKey].balance.minus(tx.amount)
            blockchainState.accounts[tx.fromPublicKey].staked = blockchainState.accounts[tx.fromPublicKey].staked.plus(tx.amount)
        }

        else if (tx.action == 'unstake') {
            // Unstake coins
            blockchainState.accounts[tx.fromPublicKey].balance = blockchainState.accounts[tx.fromPublicKey].balance.plus(tx.amount)
            blockchainState.accounts[tx.fromPublicKey].staked = blockchainState.accounts[tx.fromPublicKey].staked.minus(tx.amount)
        }

        else if (tx.action == 'allocate') {
            // Allocate coins
            blockchainState.accounts[tx.fromPublicKey].allocation.push([tx.amount, block.index])
        }

        else if (tx.action == 'deallocate') {
            // Deallocate coins
            let amount = tx.amount
            while (amount > 0) {
                if (blockchainState.accounts[tx.fromPublicKey].allocation[0][0].gte(amount)) {
                    blockchainState.accounts[tx.fromPublicKey].allocation[0][0] = blockchainState.accounts[tx.fromPublicKey].allocation[0][0].minus(amount)
                    amount = 0
                }
                else {
                    amount = amount.minus(blockchainState.accounts[tx.fromPublicKey].allocation[0].shift()[0])
                }
            }
        }

        blockchainState.accounts[tx.fromPublicKey].nonce += 1
    }
}

function verifyBlock (block, fullCheck) {
    if (fullCheck == undefined) fullCheck = true
    try {
        if (fullCheck) {
            if (block.producer != getNextProducer()) return false

            for (let i = 0; i < block.transactions.length; i += 1) {
                if (!verifyTransaction(block.transactions[i])) return false
            }
        }

        return (block.index == blockchainState.height - !fullCheck) &&
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

function importKeyPair (secretKey) {
    return nacl.sign.keyPair.fromSecretKey(importUint8Array(secretKey))
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
    return transaction.action + transaction.fromPublicKey + transaction.toPublicKey + transaction.amount.toFixed(12, 1) + transaction.nonce.toString()
}

function verifyTransaction (transaction) {
    try {
        transaction.amount = new BigNumber(transaction.amount)

        let good
        if (transaction.action == 'transfer' || transaction.action == 'stake') good = transaction.amount.lte(blockchainState.accounts[transaction.fromPublicKey].balance)
        else if (transaction.action == 'unstake') good = transaction.amount.lte(blockchainState.accounts[transaction.fromPublicKey].staked)
        else if (transaction.action == 'allocate') good = getAccountAllocation(transaction.fromPublicKey).plus(transaction.amount).lte(getAccountMaxAllocation(transaction.fromPublicKey))
        else if (transaction.action == 'deallocate') good = getAccountAllocation(transaction.fromPublicKey).gte(transaction.amount)

        return (['transfer', 'stake', 'unstake', 'allocate', 'deallocate'].includes(transaction.action)) &&
               (transaction.fromPublicKey in blockchainState.accounts) &&
               (transaction.nonce == blockchainState.accounts[transaction.fromPublicKey].nonce + 1) &&
               (transaction.hash == getTransactionHash(transaction)) &&
               (verifySignature(transaction.hash, transaction.signature, importUint8Array(transaction.fromPublicKey))) &&
               (transaction.amount.gte(0)) &&
               (transaction.amount.dp() <= 12) &&
               (good)
    }
    catch {
        return false
    }
}

var lastBlock
var blockchainState = {
    height: 0,
    accounts: {}
}
var transactionPool = []
const BLOCK_TIME = 1000 // Block time, ms
const HALF_BLOCK_TIME = Math.floor(BLOCK_TIME / 2)
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
                nonce: 0,
                balance: 0,
                staked: 0,
                burned: 0,
                allocation: []
            }))
        }
    })

    app.post('/sendTx', (req, res) => {
        if (verifyTransaction(req.body)) {
            for (let i = 0; i < transactionPool.length; i += 1) {
                if (transactionPool[i].hash == transaction.hash) {
                    res.send(httpResponse(false))
                    return
                }
            }
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
                    for (let address in blockchainState.accounts) {
                        let account = blockchainState.accounts[address]
                        blockchainState.accounts[address] = {
                            nonce: account.nonce,
                            balance: new BigNumber(account.balance),
                            staked: new BigNumber(account.staked),
                            burned: new BigNumber(account.burned),
                            allocation: account.allocation.map(e => [new BigNumber(e[0]), e[1]])
                        }
                    }
                }
                break

            case Actions.RESPONSE_LAST_BLOCK:
                if (verifyBlock(message.data, false)) lastBlock = message.data
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
                    for (let i = 0; i < transactionPool.length; i += 1) {
                        if (transactionPool[i].hash == message.data.hash) return
                    }
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

const fs = require('fs')
const path = require('path')
const homedir = require('os').homedir()

function readSecretKey (filePath_) {
    let filePath = path.join(homedir, '.plov', filePath_)
    if (!fs.existsSync(filePath) && fs.existsSync(filePath_)) filePath = filePath_
    return fs.readFileSync(filePath, 'utf8').split('\n')[1]
}

var wsPort
var httpPort
var firstConnection
var genesis
var keypair

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
    if (process.argv[i] == '--keypair') {
        keypair = process.argv[i + 1]
        if (fs.existsSync(keypair)) keypair = readSecretKey(keypair)
        keypair = importKeyPair(keypair)
    }
    if (process.argv[i] == '--genesis') {
        genesis = true
    }
}
if (process.argv[process.argv.length - 1] == '--genesis') genesis = true

if (keypair == undefined) keypair = generateKeyPair()
let myPublicKey = exportUint8Array(keypair.publicKey)

if (isNaN(wsPort)) process.exit(1)
else initP2PServer(wsPort)

if (!isNaN(httpPort)) initHTTPServer(httpPort)

if (firstConnection !== undefined) connectToPeer(firstConnection)

if (genesis) {
    blockchainState.accounts[exportUint8Array(keypair.publicKey)] = {
        nonce: 0,
        balance: new BigNumber('1000'),
        staked: new BigNumber('100'),
        burned: ZERO,
        allocation: [[new BigNumber('100'), 0]]
    }
    pushBlock(new Block(0, [], keypair))
}

setInterval(() => {
    if (lastBlock && getCurrentTimestamp() - lastBlock.timestamp >= BLOCK_TIME && getNextProducer() == myPublicKey) {
        console.log('<<<<<<New block>>>>>>')
        let block = createNewBlock(transactionPool, keypair)
        pushBlock(block)
        broadcastBlock(block)
    }
}, HALF_BLOCK_TIME)

setInterval(() => {
    console.log('==============')
    let s = blockchainState.accounts
    for (let i in s) {
        console.log(i, '=>', s[i].balance.toString())
    }
    console.log('==============')
}, 1000)
