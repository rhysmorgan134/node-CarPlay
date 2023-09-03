import {
  Message,
  Plugged,
  Unplugged,
  VideoData,
  AudioData,
  MediaData,
  SendCarPlay,
  CarPlay,
} from '../modules/messages'
import { DongleDriver, DongleConfig } from '../modules'

const { knownDevices } = DongleDriver

export type CarplayMessage =
  | { type: 'plugged' }
  | { type: 'unplugged' }
  | { type: 'audio'; message: AudioData }
  | { type: 'video'; message: VideoData }
  | { type: 'media'; message: MediaData }
  | { type: 'carplay'; message: CarPlay }

export const isCarplayDongle = (device: USBDevice) => {
  const known = knownDevices.some(
    kd => kd.productId === device.productId && kd.vendorId === device.vendorId,
  )
  return known
}

export const findDevice = async (): Promise<USBDevice | null> => {
  try {
    const devices = await navigator.usb.getDevices()
    return (
      devices.find(d => {
        return isCarplayDongle(d) ? d : undefined
      }) || null
    )
  } catch (err) {
    return null
  }
}

export const requestDevice = async (): Promise<USBDevice | null> => {
  try {
    const { knownDevices } = DongleDriver

    const device = await navigator.usb.requestDevice({
      filters: knownDevices,
    })
    return device
  } catch (err) {
    return null
  }
}

export default class CarplayWeb {
  private _started: boolean = false
  private _pairTimeout: NodeJS.Timeout | null = null
  private _config: DongleConfig
  public dongleDriver: DongleDriver

  constructor(config: DongleConfig) {
    this._config = config
    const driver = new DongleDriver()
    driver.on('message', (message: Message) => {
      if (message instanceof Plugged) {
        if (this._pairTimeout) {
          clearTimeout(this._pairTimeout)
          this._pairTimeout = null
        }
        this.onmessage?.({ type: 'plugged' })
      } else if (message instanceof Unplugged) {
        this.onmessage?.({ type: 'unplugged' })
      } else if (message instanceof VideoData) {
        this.onmessage?.({ type: 'video', message })
      } else if (message instanceof AudioData) {
        this.onmessage?.({ type: 'audio', message })
      } else if (message instanceof MediaData) {
        this.onmessage?.({ type: 'media', message })
      } else if (message instanceof CarPlay) {
        this.onmessage?.({ type: 'carplay', message })
      }
    })
    this.dongleDriver = driver
  }

  public onmessage: ((ev: CarplayMessage) => void) | null = null

  start = async (usbDevice: USBDevice) => {
    if (this._started) return
    const { initialise, open, send } = this.dongleDriver
    await initialise(usbDevice)
    await open(this._config)
    this._pairTimeout = setTimeout(() => {
      console.debug('no device, sending pair')
      send(new SendCarPlay('wifiPair'))
    }, 15000)
    this._started = true
  }

  stop = async () => {
    try {
      await this.dongleDriver.close()
    } catch (err) {
      console.error(err)
    } finally {
      this._started = false
    }
  }
}
