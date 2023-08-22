import CarplayWeb, {
  DongleConfig,
  SendAudio,
  SendTouch,
} from 'node-carplay/dist/web'
import { Command } from './types'

let carplayWeb: CarplayWeb | null = null
let config: DongleConfig | null = null

onmessage = async (event: MessageEvent<Command>) => {
  switch (event.data.type) {
    case 'start':
      if (carplayWeb) return
      config = event.data.payload
      carplayWeb = new CarplayWeb(config)

      carplayWeb.on('video', message => {
        postMessage({ type: 'video', message })
      })
      carplayWeb.on('audio', message => {
        postMessage({ type: 'audio', message })
      })
      carplayWeb.on('media', message => {
        postMessage({ type: 'media', message })
      })
      carplayWeb.on('plugged', () => {
        postMessage({ type: 'plugged' })
      })
      carplayWeb.on('unplugged', () => {
        postMessage({ type: 'unplugged' })
      })

      carplayWeb.start()
      break
    case 'touch':
      if (config && carplayWeb) {
        const { x, y, action } = event.data.payload
        const data = new SendTouch(x / config.width, y / config.height, action)
        carplayWeb.dongleDriver.send(data)
      }
      break
    case 'stop':
      await carplayWeb?.stop()
      carplayWeb = null
      break
    case 'microphoneInput':
      if (carplayWeb) {
        const data = new SendAudio(event.data.payload)
        carplayWeb.dongleDriver.send(data)
      }
      break
  }
}

export {}
