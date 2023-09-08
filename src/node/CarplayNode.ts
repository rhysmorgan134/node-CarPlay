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

const USB_WAIT_PERIOD_MS = 500
const USB_WAIT_RESTART_MS = 3000

export default class CarplayWS extends EventEmitter {
  private _pairTimeout: NodeJS.Timeout | null = null
  private _plugged = false
  private _dongleDriver: DongleDriver
  private _config: DongleConfig

  constructor(config: DongleConfig = DEFAULT_CONFIG) {
    super()
    this._config = config
    const mic = new NodeMicrophone()
    const driver = new DongleDriver()
    mic.on('data', data => {
      driver.send(new SendAudio(data))
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

  private async findDevice() {
    let device: USBDevice | null = null

    while (device == null) {
      try {
        device = await webusb.requestDevice({
          filters: DongleDriver.knownDevices,
        })
      } catch (err) {
        // ^ requestDevice throws an error when no device is found, so keep retrying
      }

      if (device == null) {
        console.log('No device found, retrying')
        await new Promise(resolve => setTimeout(resolve, USB_WAIT_PERIOD_MS))
      }
    }

    return device
  }

  getStatus = () => {
    this.emitPlugged()
  }

  sendTouch = ({ type, x, y }: { type: number; x: number; y: number }) => {
    this._dongleDriver.send(new SendTouch(x, y, type))
  }

  start = async () => {
    // Find device to "reset" first
    let device = await this.findDevice()
    await device.open()
    await device.reset()
    await device.close()
    // Resetting the device causes an unplug event in node-usb
    // so subsequent writes fail with LIBUSB_ERROR_NO_DEVICE
    // or LIBUSB_TRANSFER_ERROR

    console.log('Reset device, finding again...')
    await new Promise(resolve => setTimeout(resolve, USB_WAIT_RESTART_MS))
    // ^ Device disappears after reset for 1-3 seconds

    device = await this.findDevice()
    console.log('found & opening')

    await device.open()

    let initialised = false
    try {
      const { initialise, open, send } = this._dongleDriver
      await initialise(device)
      await open(this._config)
      this._pairTimeout = setTimeout(() => {
        console.debug('no device, sending pair')
        send(new SendCarPlay('wifiPair'))
      }, 15000)
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
