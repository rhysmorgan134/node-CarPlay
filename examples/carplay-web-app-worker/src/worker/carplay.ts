import CarplayWeb, {
  AudioData,
  CarplayMessage,
  DongleConfig,
  SendAudio,
  SendTouch,
  VideoData,
  findDevice,
} from 'node-carplay/dist/web'
import { Command } from './types'

let carplayWeb: CarplayWeb | null = null
let config: DongleConfig | null = null

const handleMessage = (message: CarplayMessage) => {
  if (message instanceof VideoData) {
    postMessage(message, '/', [message.data])
  } else if (message instanceof AudioData && message.data) {
    postMessage(message, '/', [message.data])
  } else {
    postMessage(message)
  }
}

onmessage = async (event: MessageEvent<Command>) => {
  switch (event.data.type) {
    case 'start':
      if (carplayWeb) return
      config = event.data.payload
      const device = await findDevice()
      if (device) {
        carplayWeb = new CarplayWeb(config)
        carplayWeb.onmessage = handleMessage
        carplayWeb.start(device)
      }
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
