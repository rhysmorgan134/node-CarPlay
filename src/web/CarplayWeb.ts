import {
  Message,
  Plugged,
  Unplugged,
  VideoData,
  AudioData,
  MediaData,
} from '../modules/messages'
import EventEmitter from 'events'
import { DongleDriver, DongleConfig } from '../modules'

const { knownDevices } = DongleDriver

export enum StartResult {
  Initialised,
  RequiresPermission,
  FailedtoStart,
}

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

export default class CarplayWeb extends EventEmitter {
  private _starting: boolean = false
  private _started: boolean = false
  private _pairTimeout: NodeJS.Timeout | null = null
  public dongleDriver: DongleDriver

  constructor(config: DongleConfig) {
    super()
    const driver = new DongleDriver()
    driver.on('ready', async () => {
      const { open } = driver

      await open(config)
    })
    driver.on('message', (message: Message) => {
      if (message instanceof Plugged) {
        if (this._pairTimeout) {
          clearTimeout(this._pairTimeout)
          this._pairTimeout = null
        }
        this.emit('plugged')
      } else if (message instanceof Unplugged) {
        this.emit('unplugged')
      } else if (message instanceof VideoData) {
        this.emit('video', message)
      } else if (message instanceof AudioData) {
        this.emit('audio', message)
      } else if (message instanceof MediaData) {
        this.emit('media', message)
      }
    })
    this.dongleDriver = driver
  }

  start = async () => {
    if (this._starting || this._started) return
    this._starting = true
    const device = await findDevice()
    if (device) {
      try {
        await this.dongleDriver.initialise(device)
        this._started = true
        this._starting = false
        return StartResult.Initialised
      } catch {
        this._starting = false
        return StartResult.FailedtoStart
      }
    }
    this._starting = false
    return StartResult.RequiresPermission
  }

  stop = async () => {
    if (this._starting || this._started) return
    try {
      await this.dongleDriver.close()
    } catch (err) {
      console.log(err)
    } finally {
      this._started = false
    }
  }
}
