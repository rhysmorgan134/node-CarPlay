import {
  MessageHeader,
  HeaderBuildError,
  SendableMessage,
  HeartBeat,
  SendCarPlay,
  SendString,
  FileAddress,
  SendBoolean,
  SendNumber,
  SendOpen,
  SendBoxSettings,
} from './messages'
import EventEmitter from 'events'

const CONFIG_NUMBER = 1
const MAX_ERROR_COUNT = 5

export type DongleConfig = {
  width: number
  height: number
  fps: number
  dpi: number
  nightMode: boolean
  boxName: string
  hand: number
  mediaDelay: number
  audioTransferMode: boolean
}

export const DEFAULT_CONFIG: DongleConfig = {
  width: 800,
  height: 640,
  fps: 20,
  dpi: 160,
  boxName: 'nodePlay',
  nightMode: false,
  hand: 0,
  mediaDelay: 300,
  audioTransferMode: false,
}

export class DriverStateError extends Error {}

export class DongleDriver extends EventEmitter {
  private _heartbeatInterval: NodeJS.Timer | null = null
  private _frameInterval: NodeJS.Timer | null = null
  private _device: USBDevice | null = null
  private _inEP: USBEndpoint | null = null
  private _outEP: USBEndpoint | null = null
  private errorCount = 0

  static knownDevices = [
    { vendorId: 0x1314, productId: 0x1520 },
    { vendorId: 0x1314, productId: 0x1521 },
  ]

  // NB! Make sure to reset the device outside of this class
  // Resetting device through node-usb can cause transfer issues
  // and for it to "disappear"

  initialise = async (device: USBDevice) => {
    if (this._device) {
      return
    }

    try {
      this._device = device

      console.debug('initializing')
      if (!device.opened) {
        throw new DriverStateError('Illegal state - device not opened')
      }
      await this._device.selectConfiguration(CONFIG_NUMBER)

      if (!this._device.configuration) {
        throw new DriverStateError(
          'Illegal state - device has no configuration',
        )
      }

      console.debug('getting interface')
      const {
        interfaceNumber,
        alternate: { endpoints },
      } = this._device.configuration.interfaces[0]

      const inEndpoint = endpoints.find(e => e.direction === 'in')
      const outEndpoint = endpoints.find(e => e.direction === 'out')

      if (!inEndpoint) {
        throw new DriverStateError('Illegal state - no IN endpoint found')
      }

      if (!outEndpoint) {
        throw new DriverStateError('Illegal state - no OUT endpoint found')
      }
      this._inEP = inEndpoint
      this._outEP = outEndpoint

      console.debug('claiming')
      await this._device.claimInterface(interfaceNumber)

      console.debug(this._device)
    } catch (err) {
      this.close()
      throw err
    }
  }

  send = async (message: SendableMessage) => {
    if (!this._device?.opened) {
      return null
    }

    try {
      const [header, content] = message.serialise()
      const payload = Buffer.concat([header, content])
      const transferResult = await this._device?.transferOut(
        this._outEP!.endpointNumber,
        payload,
      )
      if (transferResult.status !== 'ok') {
        console.error(transferResult)
        return false
      }
      return true
    } catch (err) {
      console.error('Failure sending message to dongle', err)
      return false
    }
  }

  private readLoop = async () => {
    while (this._device?.opened) {
      // If we error out - stop loop, emit failure
      if (this.errorCount >= MAX_ERROR_COUNT) {
        this.close()
        this.emit('failure')
        return
      }

      try {
        const headerData = await this._device?.transferIn(
          this._inEP!.endpointNumber,
          MessageHeader.dataLength,
        )
        const data = headerData?.data?.buffer
        if (!data) {
          throw new HeaderBuildError('Failed to read header data')
        }
        const header = MessageHeader.fromBuffer(Buffer.from(data))
        let extraData: Buffer | undefined = undefined
        if (header.length) {
          const extraDataRes = (
            await this._device?.transferIn(
              this._inEP!.endpointNumber,
              header.length,
            )
          )?.data?.buffer
          if (!extraDataRes) {
            console.error('Failed to read extra data')
            return
          }
          extraData = Buffer.from(extraDataRes)
        }

        const message = header.toMessage(extraData)
        if (message) this.emit('message', message)
      } catch (error) {
        if (error instanceof HeaderBuildError) {
          console.error(`Error parsing header for data`, error)
        } else {
          console.error(`Unexpected Error parsing header for data`, error)
        }
        this.errorCount++
      }
    }
  }

  open = async (config: DongleConfig) => {
    if (!this._device) {
      throw new DriverStateError('No device set - call initialise first')
    }
    if (!this._device?.opened) {
      return
    }

    this.errorCount = 0
    const {
      dpi: _dpi,
      nightMode: _nightMode,
      boxName: _boxName,
      mediaDelay,
      audioTransferMode,
    } = config
    const initMessages = [
      new SendNumber(_dpi, FileAddress.DPI),
      new SendOpen(config),
      new SendBoolean(_nightMode, FileAddress.NIGHT_MODE),
      new SendBoolean(false, FileAddress.HAND_DRIVE_MODE),
      new SendBoolean(true, FileAddress.CHARGE_MODE),
      new SendString(_boxName, FileAddress.BOX_NAME),
      new SendBoxSettings(mediaDelay),
      new SendCarPlay('wifiEn'),
      new SendCarPlay(audioTransferMode ? 'phoneAudio' : 'dongleAudio'),
    ]
    await Promise.all(initMessages.map(this.send))
    setTimeout(() => {
      this.send(new SendCarPlay('wifiConnect'))
    }, 1000)

    this.readLoop()

    this._heartbeatInterval = setInterval(() => {
      this.send(new HeartBeat())
    }, 2000)
    this._frameInterval = setInterval(() => {
      this.send(new SendCarPlay('frame'))
    }, 5000)
  }

  close = async () => {
    if (!this._device) {
      return
    }
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval)
      this._heartbeatInterval = null
    }
    if (this._frameInterval) {
      clearInterval(this._frameInterval)
      this._frameInterval = null
    }
    await this._device.close()
    this._device = null
    this._inEP = null
    this._outEP = null
  }
}
