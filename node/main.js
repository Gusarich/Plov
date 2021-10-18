//============Cryptography=============//
const BigNumber = require('bignumber.js')

function exportUint8Array (array) {
    // This function takes Uint8Array as input and returns number in base 36

    let hex = [...new Uint8Array(array)].map(x => x.toString(16).padStart(2, '0')).join('')
    return new BigNumber(hex, 16).toString(36)
}

function importUint8Array (string) {
    // This function takes number in base 36 as input and returns Uint8Array

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
// Burned tokens has more weight than staked.
// In this case 1 burned PLOV = 2 staked PLOV

function getCurrentTimestamp () {
    // This function returns current timestamp
    return Math.round(new Date().getTime())
}

function getBlockHash (block) {
    // This function takes block as input and retruns it's hash
    return exportUint8Array(nacl.hash(decodeUTF8(getBlockString(block))))
}

function getBlockString (block) {
    // This function takes block as input and returns it's string representation

    let transactionsString = ''
    for (let i = 0; i < block.transactions.length; i += 1) transactionsString += block.transactions[i].hash
    return block.index.toString() + block.timestamp.toString() + transactionsString + block.producer
}

function getNextProducer () {
    /*
    This function generates random number and finds next producer that should
    generate and broadcast block.
    More staked + burned tokens => more chances to become next producer
    */

    if (blockchainState.height < 1 || !lastBlock) return false

    let lastBlockHash = new BigNumber(lastBlock.hash, 36)
    // Get last block's hash as number

    let currentSlot = lastBlock.index + Math.floor((getCurrentTimestamp() - lastBlock.timestamp) / BLOCK_TIME)
    // Get current slot depending on current time
    // Slot is time range (like 123000:124000) in which next block should be
    // broadcasted. If producer don't broadcast block in slot time he is skipped

    // Not sure about RNG...
    let randomNumber = lastBlockHash.times(currentSlot).plus(lastBlock.timestamp)
    let coinIndex = randomNumber.mod(getTotalAllocated())

    for (let account in blockchainState.accounts) {
        // We generated random coin index and now we need to find producer that
        // has this coin in his allocation
        coinIndex = coinIndex.minus(getAccountAllocationWeight(account))
        if (coinIndex.lte(0)) return account
    }
}

class Block {
    /*
    Block class
    Constructor takes index, transactions array and keypair of producer
    */

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
    // Function that creates new Block object from transactions and keypair

    return new Block (
        blockchainState.height,
        transactions,
        keypair
    )
}

function broadcastBlock (block) {
    // Function that takes block object as input and broadcast it to network

    let message = {
        action: Actions.BROADCAST_BLOCK,
        data: block
    }
    broadcast(message)
}

function broadcastTransaction (transaction) {
    // Function that takes transaction as input and broadcast it to network

    let message = {
        action: Actions.BROADCAST_TRANSACTION,
        data: transaction
    }
    broadcast(message)
}

function getAccountMaxAllocation (account) {
    /*
    Function that calculates max possible allocation of input account
    Max possible allocation means amount of tokens that can be allocated by
    this account.
    max_allocation = burned_tokens * 2 + staked_tokens
    */

    return blockchainState.accounts[account].burned.times(2).plus(blockchainState.accounts[account].staked)
}

function getAccountAllocationWeight (account) {
    /*
    Function that returns current allocation of input account
    account.allocation is array of pairs [amount, block_index] which means
    amount of allocated tokens and block_index when this allocation was added.
    Older allocations has more weight so we multiply amount by blocks
    that was passed from allocation moment.

    single_allocation_weight = amount * (current_block - allocation_block)
    total_allocation_weight = sum of all single_allocation_weight for account
    */

    let total = ZERO
    for (let allocation of blockchainState.accounts[account].allocation) {
        total = total.plus(allocation[0].times(blockchainState.height - allocation[1]))
    }
    return total
}

function getTotalAllocated () {
    // This function returns sum of all allocated tokens for accounts

    /*
    OPTIMIZE: Right now this function works with difficulty O(N*M)
              But can be done in O(1) by having another variable in
              BlockchainState that shows total allocated tokens
    */

    let total = ZERO
    for (let account in blockchainState.accounts) {
        // We just iterate through all accounts and sum their allocations
        total = total.plus(getAccountAllocationWeight(account))
    }
    return total
}

function newEpoch () {
    /*
    This function begins new epoch, recalculates weights of producers and
    storing all that info in blockchainState
    */

    blockchainState.epoch += 1
}

function pushBlock (block) {
    /*
    In moment when this function is called, new block is already verified and
    ready to be stored. All transactions are correct and all we need is
    just apply all changes in state.
    */

    lastBlock = block
    blockchainState.height = block.index + 1

    if (blockchainState.height % BLOCKS_IN_EPOCH == 0) {
        // New epoch should begin
        newEpoch()
    }

    blockTransactionHashes = []
    for (let i = 0; i < block.transactions.length; i += 1) blockTransactionHashes.push(block.transactions[i].hash)
    transactionPool = transactionPool.filter(transaction => !blockTransactionHashes.includes(transaction.hash))
    // We remove all transactions that are in this block from transactionPool
    // so they won't be added in next blocks

    for (let i = 0; i < block.transactions.length; i += 1) {
        let tx = block.transactions[i]

        if (tx.action == 'transfer') {
            // Transfer coins

            blockchainState.accounts[tx.fromPublicKey].balance = blockchainState.accounts[tx.fromPublicKey].balance.minus(tx.amount)
            if (!(tx.toPublicKey in blockchainState.accounts)) {
                // In case recipient is not in blockchainState yet
                // We should add empty account to state
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
                /*
                I'm lazy so didn't make separate action for burning
                If recipient of transfer is "burn" it is burning
                */
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
                /*
                Allocation of account stored as array of pairs
                So we need to remove these pairs starting from beginning
                until we removed enough
                */
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
    // This function verifies block. Returns True/False

    if (fullCheck == undefined) fullCheck = true
    try {
        if (fullCheck) {
            // fullCheck Means that we will check all transactions in block

            if (block.producer != getNextProducer()) return false

            for (let i = 0; i < block.transactions.length; i += 1) {
                if (!verifyTransaction(block.transactions[i])) return false
            }
        }

        return (block.index == blockchainState.height - !fullCheck) &&  // Index is correct
               (block.hash == getBlockHash(block)) &&  // Hash is correct
               (verifySignature(block.hash, block.signature, importUint8Array(block.producer)))  // Signature is correct
    }
    catch {
        return false
    }
}

function generateKeyPair () {
    // This function generates random keypair
    return nacl.sign.keyPair()
}

function importKeyPair (secretKey) {
    // This function creates keyPair object from secretKey
    return nacl.sign.keyPair.fromSecretKey(importUint8Array(secretKey))
}

function signMessage (message, secretKey) {
    // This function sign message with secretKey
    return exportUint8Array(nacl.sign.detached(decodeUTF8(message), secretKey))
}

function verifySignature (message, signature, publicKey) {
    // This function verifying signature of message by publicKey

    try {
        return nacl.sign.detached.verify(decodeUTF8(message), importUint8Array(signature), publicKey)
    }
    catch {
        return false
    }
}

function getTransactionHash (transaction) {
    // This function calculates hash of transaction
    return exportUint8Array(nacl.hash(decodeUTF8(getTransactionString(transaction))))
}

function getTransactionString (transaction) {
    // This function returns string representation of transaction
    return transaction.action + transaction.fromPublicKey + transaction.toPublicKey + transaction.amount.toFixed(12, 1) + transaction.nonce.toString()
}

function verifyTransaction (transaction) {
    // This function check if transaction is correct. Returns True/False
    try {
        transaction.amount = new BigNumber(transaction.amount)

        let good

        if (transaction.action == 'transfer' || transaction.action == 'stake') good = transaction.amount.lte(blockchainState.accounts[transaction.fromPublicKey].balance)
        // Good if transfer/stake amount is lower than balance

        else if (transaction.action == 'unstake') good = transaction.amount.lte(blockchainState.accounts[transaction.fromPublicKey].staked)
        // Good if unstake amount is lower than staked on account

        else if (transaction.action == 'allocate') good = getAccountAllocationWeight(transaction.fromPublicKey).plus(transaction.amount).lte(getAccountMaxAllocation(transaction.fromPublicKey))
        // Good if allocation amount + current allocation is lower than max possible allocation for account

        else if (transaction.action == 'deallocate') good = getAccountAllocationWeight(transaction.fromPublicKey).gte(transaction.amount)
        // Good if deallocation amount is lower than current allocated amount for account

        return (['transfer', 'stake', 'unstake', 'allocate', 'deallocate'].includes(transaction.action)) &&  // Action is correct
               (transaction.fromPublicKey in blockchainState.accounts) &&  // Transaction sender is in blockchainState
               (transaction.nonce == blockchainState.accounts[transaction.fromPublicKey].nonce + 1) &&  // Nonce is correct
               (transaction.hash == getTransactionHash(transaction)) &&  // Hash is correct
               (verifySignature(transaction.hash, transaction.signature, importUint8Array(transaction.fromPublicKey))) &&  // Signature is correct
               (transaction.amount.gte(0)) &&  // Amount is positive
               (transaction.amount.dp() <= 12) &&  // Not more than 12 digits after dot. like 0.000000000001
               (good)
    }
    catch {
        return false
    }
}

var lastBlock
var blockchainState = {
    height: 0,
    epoch: 0,
    accounts: {}
}
var transactionPool = []

const BLOCK_TIME = 1000  // Block time, ms
const HALF_BLOCK_TIME = Math.floor(BLOCK_TIME / 2)
const BLOCKS_IN_EPOCH = 10
//=============Blockchain==============//


//==============HTTP=API===============//
const express = require('express')
const bodyParser = require('body-parser')

function httpResponse(ok, data) {
    let response = {
        // Response contain ok: True/False and timestamp: Number by default
        ok: ok,
        timestamp: getCurrentTimestamp()
    }

    // Below we add additional response data
    if (data == undefined) return JSON.stringify(response)
    response.data = data
    return JSON.stringify(response)
}

function initHTTPServer (port) {
    // Initiation of HTTP server for API

    var app = express()
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({extended: true}))

    app.get('/getBlockchainHeight', (req, res) => res.send(httpResponse(true, blockchainState.height)))
    // This method return blockchain height

    app.get('/getPeers', (req, res) => res.send(httpResponse(true, getPeers())))
    // This method return saved peers of this node

    app.get('/getAccount', (req, res) => {
        // This method return account information from state

        if (!req.query.account) res.send(httpResponse(false))  // If request is not correct
        else {
            let account = blockchainState.accounts[req.query.account]
            if (account) res.send(httpResponse(true, account))
            else res.send(httpResponse(true, {
                // If there is no account in state
                nonce: 0,
                balance: 0,
                staked: 0,
                burned: 0,
                allocation: []
            }))
        }
    })

    app.post('/sendTx', (req, res) => {
        // This method takes signed transaction as input,
        // verifies it and broadcasts it to network
        if (verifyTransaction(req.body)) {
            // If transaction is correct

            for (let i = 0; i < transactionPool.length; i += 1) {
                if (transactionPool[i].hash == transaction.hash) {
                    // If this transaction is in pool already
                    // We don't need duplicates here
                    res.send(httpResponse(false))
                    return
                }
            }
            transactionPool.push(req.body)  // Push to pool
            broadcastTransaction(req.body)  // Broadcast
            res.send(httpResponse(true))  // Return OK response
        }
        else res.send(httpResponse(false))  // If tx is incorrect, return NOT OK
    })

    app.listen(port)
}
//==============HTTP=API===============//


//============WebSocket=P2P============//
const WebSocket = require('ws')
const Actions = {
    // This is number codes for websocket calls
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
    // This function return IPs of all peers

    let peersList = []
    for (let i = 0; i < peers.length; i += 1) {
        if (peers[i].url) peersList.push(peers[i].url)
    }
    return peersList
}

function initP2PServer (port) {
    // This function initializes p2p websocket server

    const wsServer = new WebSocket.Server({ port: port })
    wsServer.on('connection', (ws) => initConnection(ws, true))
}

function send (ws, message) {
    // Send message to single node
    ws.send(JSON.stringify(message))
}

function broadcast (message) {
    // Broadcast message to all nodes
    for (let i = 0; i < peers.length; i += 1) send(peers[i], message)
}

function initConnection (ws, client) {
    peers.push(ws)

    if (!client) {
        // If we connect to node (not node to us)
        // Query for peers and current state
        send(ws, {action: Actions.QUERY_PEERS})
        send(ws, {action: Actions.QUERY_BLOCKCHAIN_STATE})
    }

    ws.on('message', (data) => {
        // When we receive message from peer

        let message = JSON.parse(data)
        switch (message.action) {
            // All possible websocket codes
            case Actions.QUERY_BLOCKCHAIN_STATE:
                // If someone request blockchainState from us
                send(ws, {
                    action: Actions.RESPONSE_BLOCKCHAIN_STATE,
                    data: blockchainState
                })
                break

            case Actions.QUERY_LAST_BLOCK:
                // If someone request last block from us
                send(ws, {
                    action: Actions.RESPONSE_LAST_BLOCK,
                    data: lastBlock
                })
                break

            case Actions.QUERY_PEERS:
                // If someone request peers list from us
                send(ws, {
                    action: Actions.RESPONSE_PEERS,
                    data: getPeers()
                })
                break

            case Actions.RESPONSE_BLOCKCHAIN_STATE:
                // If we requested blockchainState and got answer

                if (message.data.height > blockchainState.height) {
                    // If this blockchainState is newer than our local

                    send(ws, {action: Actions.QUERY_LAST_BLOCK})  // Query for last block
                    blockchainState = message.data  // Save blockchainState
                    for (let address in blockchainState.accounts) {
                        // Iterate through accounts and store them
                        let account = blockchainState.accounts[address]
                        // Below we translate all numbers to BigNumbers
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
                // If we requested last block and got answer
                if (verifyBlock(message.data, false)) lastBlock = message.data
                break

            case Actions.RESPONSE_PEERS:
                // If we requested for peers and got answer
                if (ws.url) {
                    let index = message.data.indexOf(ws.url)
                    if (index >= 0) message.data.splice(message.data.indexOf(ws.url), 1)
                }
                peersQueue = new Set([...peersQueue, ...message.data])
                break

            case Actions.BROADCAST_BLOCK:
                // If block is being broadcasted to network
                if (verifyBlock(message.data)) {
                    // Block is valid =>
                    // We should save it and broadcast to our peers
                    pushBlock(message.data)
                    broadcastBlock(message.data)
                }

            case Actions.BROADCAST_TRANSACTION:
                // If transaction is being broadcasted to network
                if (verifyTransaction(message.data)) {
                    // Transaction is valid =>
                    // We should push it to transactionPool
                    for (let i = 0; i < transactionPool.length; i += 1) {
                        if (transactionPool[i].hash == message.data.hash) return
                        // If this transaction is in pool already we don't push it
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
    // This function is being called when connection is closed with peer
    peers.splice(peers.indexOf(ws), 1)
}

function connectToPeer (peer) {
    // Connect to peer by IP

    if (!getPeers().includes(peer)) {
        peersQueue.delete(peer)
        let ws = new WebSocket(peer)
        ws.on('open', () => initConnection(ws, false))
    }
}

setInterval(() => {
    // In this loop we keep PEERS_TO_KEEP_CONNECTED amount of peers
    if (peers.length < PEERS_TO_KEEP_CONNECTED && peersQueue.size > 0) {
        // If there is not enough connected peers we try connecting to more
        connectToPeer(peersQueue.values().next().value)
    }
}, 1000)
//============WebSocket=P2P============//

//=============Parse=args==============//
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
var logging

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
    if (process.argv[i] == '--logging') {
        logging = true
    }
}
if (process.argv[process.argv.length - 1] == '--genesis') genesis = true
if (process.argv[process.argv.length - 1] == '--logging') logging = true
//=============Parse=args==============//

if (keypair == undefined) keypair = generateKeyPair()  // If no keypair was select we create random one
let myPublicKey = exportUint8Array(keypair.publicKey)  // Save our public key

if (isNaN(wsPort)) process.exit(1)  // Quit if port is incorrect
else initP2PServer(wsPort)  // Else initiate P2P websocket server on this port

if (!isNaN(httpPort)) initHTTPServer(httpPort)  // If there is correct http port selected => start http api server

if (firstConnection !== undefined) connectToPeer(firstConnection)  // Connect to selected node

if (genesis) {
    // If our node is first one in network
    // We create first block and our account receive some tokens by default
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
    // In this interval we keep waiting if it's our time to produce block
    if (lastBlock && getCurrentTimestamp() - lastBlock.timestamp >= BLOCK_TIME && getNextProducer() == myPublicKey) {
        if (logging) console.log('<<<<<<New block>>>>>>')
        let block = createNewBlock(transactionPool, keypair)  // Create new block
        pushBlock(block)  // Save it
        broadcastBlock(block)  // Broadcast it
    }
}, HALF_BLOCK_TIME)

if (logging) {
    // If logging is enabled, prints all accounts and their balances
    setInterval(() => {
        console.log('==============')
        let s = blockchainState.accounts
        for (let i in s) {
            console.log(i, '=>', s[i].balance.toString())
        }
        console.log('==============')
    }, 1000)
}
