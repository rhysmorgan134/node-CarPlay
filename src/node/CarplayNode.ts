import { webusb } from 'usb'
import NodeMicrophone from './NodeMicrophone'
import EventEmitter from 'events'
import {
  AudioData,
  Key,
  MediaData,
  Message,
  Plugged,
  SendAudio,
  SendCarPlay,
  SendTouch,
  Unplugged,
  VideoData,
  DongleDriver,
  DongleConfig,
  DEFAULT_CONFIG,
} from '../modules'

export default class CarplayWS extends EventEmitter {
  private _pairTimeout: NodeJS.Timeout | null = null
  private _plugged = false
  private _dongleDriver: DongleDriver

  constructor(config: DongleConfig = DEFAULT_CONFIG) {
    super()
    const mic = new NodeMicrophone()
    const driver = new DongleDriver()
    mic.on('data', data => {
      driver.send(new SendAudio(data))
    })
    driver.on('ready', async () => {
      const { open, send } = driver

      await open(config)

      this._pairTimeout = setTimeout(() => {
        console.debug('no device, sending pair')
        send(new SendCarPlay('wifiPair'))
      }, 15000)
    })
    driver.on('message', (message: Message) => {
      if (message instanceof Plugged) {
        if (this._pairTimeout) {
          clearTimeout(this._pairTimeout)
          this._pairTimeout = null
        }
        this._plugged = true
        this.emitPlugged()
      } else if (message instanceof Unplugged) {
        this._plugged = false
        this.emit('quit')
      } else if (message instanceof VideoData) {
        this.emit('carplay', message)
      } else if (message instanceof AudioData) {
        this.emit('audio', message)
      } else if (message instanceof MediaData) {
        this.emit('media', message)
      }
    })
    this._dongleDriver = driver
  }

  getStatus = () => {
    this.emitPlugged()
  }

  sendTouch = ({ type, x, y }: { type: number; x: number; y: number }) => {
    this._dongleDriver.send(new SendTouch(x, y, type))
  }

  start = async () => {
    const { knownDevices } = DongleDriver

    const device = await webusb.requestDevice({ filters: knownDevices })
    if (!device) {
      console.log('No device found, retrying in 2s')
      setTimeout(this.start, 2000)
      return
    }
    let initialised = false
    try {
      await this._dongleDriver.initialise(device)
      initialised = true
    } catch (err) {
      console.error(err)
    }

    if (!initialised) {
      console.log('carplay not initialised, retrying in 2s')
      setTimeout(this.start, 2000)
    }
  }

  private emitPlugged = () => {
    this.emit('status', {
      status: this._plugged,
    })
  }

  sendKey = (action: Key) => {
    this._dongleDriver.send(new SendCarPlay(action))
  }
}