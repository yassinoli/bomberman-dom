const WebSocket = require('ws')

const server = new WebSocket.Server({ port: 3000 })

server.on('connection', socket => {
  console.log('User connected')

  socket.send('Welcome!')

  socket.on('message', message => {
    console.log(message.toString())

    server.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message.toString())
      }
    })
  })
})

console.log('WebSocket running on ws://localhost:3000')