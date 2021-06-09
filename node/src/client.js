var port = NaN
var url = 'ws://'

for (let i = 0; i < process.argv.length - 1; i += 1) {
    if (process.argv[i] == '--port') {
        port = Number(process.argv[i + 1])
    }
    if (process.argv[i] == '--peer') {
        url += process.argv[i + 1]
    }
}

if (isNaN(port) || port < 10000) {
    process.exit(1)
}

const WebSocket = require('ws')
const ws = new WebSocket(url)

var socketQueueId = 0
var socketQueue = {}


function print (...args) {
    console.log('\x1b[44m[CLIENT]\x1b[0m:', ...args)
}


function wsSend (action, data, callback) {
    socketQueueId += 1
    socketQueue['i_' + socketQueueId] = callback
    jsonData = JSON.stringify({'id': socketQueueId, 'action': action, 'data': data})
    try {
        ws.send(jsonData)
        print('Sent')
    }
    catch (e) {
        print('Sending failed...', e)
    }
}


ws.onopen = function () {
    print('Connected! Sending handshake...')
    wsSend('HANDSHAKE', port, () => {
        print('HI BITCH')
    })
}
ws.onmessage = function (message) {
    print('Message:', message.data)
    try {
        data = JSON.parse(message.data)
    }
    catch(e) {
        print('socket parse error: ' + message.data)
    }

    if (typeof(data.id) != 'undefined') {
        execFunc = socketQueue['i_' + data.id]
        execFunc(data.response)
        delete socketQueue['i_' + data.id]
        return
    }
}


function ping () {
    time = Date.now()
    wsSend('PING', '', (response) => {
        print(Date.now() - time)
    })
}


setInterval(ping, 5000)
