const port = 11100;

const WebSocket = require('ws')
const wsServer = new WebSocket.Server({ port: port })

wsServer.on('connection', onConnect)

function onConnect (wsClient) {
    console.log('New connection!')

    wsClient.on('close', function () {
        console.log('Connection closed!')
    })

    wsClient.on('message', function (message) {
        console.log(message)
        try {
            const jsonMessage = JSON.parse(message)
            response = ''
            switch (jsonMessage.action) {
                case 'PING':
                    response = Date.now().toString()
                    break
                default:
                    break
            }
            if (response) {
                wsClient.send(JSON.stringify({'id': jsonMessage.id, 'response': response}))
            }
        }
        catch (error) {
            console.log('Error', error)
        }
    })
}

console.log('Listening for connections on port ' + port)
