import cors from 'cors'
import http from 'http'
import express from 'express'
import WebSocket, { WebSocketServer } from 'ws'

import CarPlayNode, { SendTouch } from 'node-carplay/node'
import path from 'path'

import { config } from '../client/config.js'

const PORT = parseInt(process.env.PORT ?? '', 10) || 3000
const PATH_STATIC = path.join(__dirname, '..', 'public')

async function main() {
  const carPlay: CarPlayNode = new CarPlayNode(config)

  const clientsVideo = new Set<http.ServerResponse>()

  carPlay.onmessage = function ({ type, message }) {
    if (type === 'plugged') {
      console.log('statusChange plugged')
    } else if (type === 'unplugged') {
      console.log('statusChange unplugged')
    } else if (type === 'video') {
      if (message.data != null) {
        clientsVideo.forEach(client => {
          client.write(message.data)
        })
      }
    }
  }

  const app = express()

  app.use(cors())

  app.get('/stream/video', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'video/h264',
      'Access-Control-Allow-Origin': req.headers.origin ?? '*',
    })
    clientsVideo.add(res)
    res.on('end', () => {
      clientsVideo.delete(res)
    })
  })

  app.use(express.static(PATH_STATIC))

  const server = app.listen(PORT)

  const wss = new WebSocketServer({ server })

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (chunk: Buffer) => {
      let message = null

      try {
        message = JSON.parse(chunk.toString('utf8'))
      } catch (_) {
        // Ignore malformed messages
        console.debug('Malformed message', message)
        return
      }

      if (typeof message !== 'object' || message == null) {
        // Ignore malformed messages
        return
      }

      if (message.type === 'touch') {
        const { x, y, action } = message
        carPlay?.dongleDriver.send(
          new SendTouch(x / config.width, y / config.height, action),
        )
      }
    })
  })

  console.log(`Server listening on http://localhost:${PORT}/`)

  await carPlay.start()
}

main().catch(err => {
  console.error(`Error initializing server`, { err })
  process.exit(1)
})
