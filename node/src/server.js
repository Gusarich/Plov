var port = NaN

for (let i = 0; i < process.argv.length - 1; i += 1) {
    if (process.argv[i] == '--port') {
        console.log(process.argv[i + 1])
        port = Number(process.argv[i + 1])
    }
}

if (isNaN(port) || port < 10000) {
    process.exit(1)
}

const WebSocket = require('ws')
const wsServer = new WebSocket.Server({ port: port })

var peers = {}


function print (...args) {
    console.log('\x1b[42m[SERVER]\x1b[0m:', ...args)
}


wsServer.on('connection', onConnect)

function onConnect (wsClient) {
    print('New connection! Waiting for handshake...')

    wsClient.on('close', function () {
        print('Connection closed!')
    })

    wsClient.on('message', function (message) {
        print(message)
        try {
            const jsonMessage = JSON.parse(message)
            response = ''
            switch (jsonMessage.action) {
                case 'HANDSHAKE':
                    if (isNaN(jsonMessage.data) || jsonMessage.data < 10000) {
                        response = false
                    }
                    else {
                        response = true
                        peers[wsClient._socket.remoteAddress] = wsClient
                    }
                    break
                case 'PING':
                    response = Date.now().toString()
                    break
                case 'GET_PEERS':
                    break
                default:
                    break
            }
            if (response) {
                wsClient.send(JSON.stringify({'id': jsonMessage.id, 'response': response}))
            }
        }
        catch (error) {
            print('Error', error)
        }
    })
}

print('Listening for connections on port ' + port)
