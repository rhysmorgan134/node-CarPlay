import {
  Message,
  Plugged,
  Unplugged,
  VideoData,
  AudioData,
  MediaData,
  SendCommand,
  Command,
  DongleDriver,
  DongleConfig,
  DEFAULT_CONFIG,
} from '../modules/index.js'

const { knownDevices } = DongleDriver

export type CarplayMessage =
  | { type: 'plugged'; message?: undefined }
  | { type: 'unplugged'; message?: undefined }
  | { type: 'failure'; message?: undefined }
  | { type: 'audio'; message: AudioData }
  | { type: 'video'; message: VideoData }
  | { type: 'media'; message: MediaData }
  | { type: 'command'; message: Command }

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
  private _frameInterval: ReturnType<typeof setInterval> | null = null
  private _config: DongleConfig
  public dongleDriver: DongleDriver

  constructor(config: Partial<DongleConfig>) {
    this._config = Object.assign({}, DEFAULT_CONFIG, config)
    const driver = new DongleDriver()
    driver.on('message', (message: Message) => {
      if (message instanceof Plugged) {
        this.clearPairTimeout()
        this.clearFrameInterval()

        const phoneTypeConfg = this._config.phoneConfig[message.phoneType]
        if (phoneTypeConfg?.frameInterval) {
          this._frameInterval = setInterval(
            () => {
              this.dongleDriver.send(new SendCommand('frame'))
            },
            phoneTypeConfg?.frameInterval,
          )
        }
        this.onmessage?.({ type: 'plugged' })
      } else if (message instanceof Unplugged) {
        this.onmessage?.({ type: 'unplugged' })
      } else if (message instanceof VideoData) {
        this.clearPairTimeout()
        this.onmessage?.({ type: 'video', message })
      } else if (message instanceof AudioData) {
        this.clearPairTimeout()
        this.onmessage?.({ type: 'audio', message })
      } else if (message instanceof MediaData) {
        this.clearPairTimeout()
        this.onmessage?.({ type: 'media', message })
      } else if (message instanceof Command) {
        this.onmessage?.({ type: 'command', message })
      }
    })
    driver.on('failure', () => {
      this.onmessage?.({ type: 'failure' })
    })
    this.dongleDriver = driver
  }

  private clearPairTimeout() {
    if (this._pairTimeout) {
      clearTimeout(this._pairTimeout)
      this._pairTimeout = null
    }
  }

  private clearFrameInterval() {
    if (this._frameInterval) {
      clearInterval(this._frameInterval)
      this._pairTimeout = null
    }
  }

  public onmessage: ((ev: CarplayMessage) => void) | null = null

  start = async (usbDevice: USBDevice) => {
    if (this._started) return
    const { initialise, start, send } = this.dongleDriver

    console.debug('opening device')
    await usbDevice.open()
    await usbDevice.reset()

    await initialise(usbDevice)
    await start(this._config)
    this._pairTimeout = setTimeout(() => {
      console.debug('no device, sending pair')
      send(new SendCommand('wifiPair'))
    }, 15000)
    this._started = true
  }

  stop = async () => {
    try {
      this.clearFrameInterval()
      this.clearPairTimeout()
      await this.dongleDriver.close()
    } catch (err) {
      console.error(err)
    } finally {
      this._started = false
    }
  }
}
