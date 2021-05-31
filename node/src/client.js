const url = 'ws://localhost:11100'

const WebSocket = require('ws')
const ws = new WebSocket(url)

var socketQueueId = 0
var socketQueue = {}

ws.onopen = function () {
    console.log('Connected!')
}
ws.onmessage = function (message) {
    console.log('Message: %s', message.data)
    try {
        data = JSON.parse(message.data)
    }
    catch(e) {
        console.log('socket parse error: ' + message.data)
    }

    if (typeof(data.id) != 'undefined') {
        execFunc = socketQueue['i_' + data.id]
        execFunc(data.response)
        delete socketQueue['i_' + data.id]
        return
    }
}

function wsSend (action, data, callback) {
    socketQueueId += 1
    socketQueue['i_' + socketQueueId] = callback
    jsonData = JSON.stringify({'id': socketQueueId, 'action': action, 'data': data})
    try {
        ws.send(jsonData)
        console.log('Sent')
    }
    catch (e) {
        console.log('Sending failed...', e)
    }
}


function ping () {
    time = Date.now()
    wsSend('PING', '', (response) => {
        console.log(response - time, Date.now() - response)
    })
}


setInterval(ping, 1000)
