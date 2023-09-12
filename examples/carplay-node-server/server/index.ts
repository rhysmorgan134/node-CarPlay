import cors from 'cors'
import http from 'http'
import express from 'express'
import WebSocket, { WebSocketServer } from 'ws'

import CarPlayNode, {
  CarplayNodeConfig,
  SendTouch,
  decodeTypeMap,
} from 'node-carplay/dist/node'
import path from 'path'

const PORT = parseInt(process.env.PORT ?? '', 10) || 3000
const PATH_STATIC = path.join(__dirname, '..', 'public')

const config: CarplayNodeConfig = {
  dpi: 160,
  nightMode: false,
  hand: 0,
  boxName: 'nodePlay',
  mediaDelay: 0,
  audioTransferMode: false,
  playAudio: true,

  fps: 0,
  width: 0,
  height: 0,
}

let formatPrinted = false

async function main() {
  let carPlay: CarPlayNode | null = null

  const clientsAudio = new Set<http.ServerResponse>()
  const clientsVideo = new Set<http.ServerResponse>()

  async function setupCarPlay({
    width,
    height,
    fps,
  }: {
    width: number
    height: number
    fps: number
  }): Promise<void> {
    if (carPlay != null) {
      return
    }
    config.width = width
    config.height = height
    config.fps = fps

    carPlay = new CarPlayNode(config)

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
      } else if (type === 'audio') {
        const { data } = message
        if (data != null) {
          clientsAudio.forEach(client => {
            client.write(Buffer.from(data.buffer))
          })
        }
        if (!formatPrinted && message.decodeType != null) {
          formatPrinted = true
          const audioFormat = decodeTypeMap[message.decodeType]
          console.log('Audio format', audioFormat)
        }
      }
    }

    await carPlay.start()
  }

  const app = express()

  app.use(cors())

  app.get('/stream/audio', (req, res) => {
    res.writeHead(200)
    clientsAudio.add(res)
    res.on('end', () => {
      clientsAudio.delete(res)
    })
  })
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

      if (message.type === 'start') {
        const { width, height, fps } = message
        setupCarPlay({ width, height, fps }).catch(err => {
          console.error('Error setting up carplay', { err })
        })
      } else if (message.type === 'touch') {
        const { x, y, action } = message
        carPlay?.dongleDriver.send(
          new SendTouch(x / config.width, y / config.height, action),
        )
      }
    })
  })

  console.log([`Server listening on http://localhost:${PORT}/`].join('\n'))
}

main().catch(err => {
  console.error(`Error initializing server`, { err })
  process.exit(1)
})
