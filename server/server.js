const WebSocket = require('ws')

const server = new WebSocket.Server({ port: 3000 })

const players = []

function broadcast(data) {

  server.clients.forEach(client => {

    if (client.readyState === WebSocket.OPEN) {

      client.send(JSON.stringify(data))

    }

  })

}

server.on('connection', socket => {

  console.log('User connected')

  socket.on('message', message => {

    const data = JSON.parse(message)

    // JOIN
    if (data.type === 'join') {

      const player = {
        id: Date.now(),
        nickname: data.nickname,
        socket
      }

      players.push(player)

      broadcast({
        type: 'lobby',
        count: players.length,
        players: players.map(player => player.nickname)
      })

    }

    // CHAT
    if (data.type === 'chat') {

      broadcast({
        type: 'chat',
        nickname: data.nickname,
        message: data.message
      })

    }

  })

  socket.on('close', () => {

    const index = players.findIndex(
      player => player.socket === socket
    )

    if (index !== -1) {

      players.splice(index, 1)

    }

    broadcast({
      type: 'lobby',
      count: players.length,
      players: players.map(player => player.nickname)
    })

  })

})

console.log('Server running on ws://localhost:3000')