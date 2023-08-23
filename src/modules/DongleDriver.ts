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
}

export const DEFAULT_CONFIG: DongleConfig = {
  width: 800,
  height: 640,
  fps: 20,
  dpi: 160,
  boxName: 'nodePlay',
  nightMode: false,
  hand: 0,
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

  private initDevice = async () => {
    if (!this._device) {
      throw new DriverStateError('Illegal state - device not set')
    }

    await this._device.selectConfiguration(CONFIG_NUMBER)

    if (!this._device.configuration) {
      throw new DriverStateError('Illegal state - device has no configuration')
    }

    console.log('getting interface')
    const {
      interfaceNumber,
      alternate: { endpoints },
    } = this._device.configuration.interfaces[0]
    console.log('claiming')
    await this._device.claimInterface(interfaceNumber)

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
    console.log(this._device)

    this.emit('ready')
  }

  initialise = async (device: USBDevice) => {
    if (this._device?.opened) {
      return true
    }

    try {
      this._device = device
      console.log('opening')
      await this._device.open()
      await this.initDevice()
      return true
    } catch (err) {
      this.close()
      return false
    }
  }

  send = async (message: SendableMessage) => {
    if (!this._device?.opened) {
      return
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
      }
    } catch (err) {
      console.error('Failure sending message to dongle', err)
    }
  }

  private readLoop = async () => {
    if (!this._device?.opened) {
      return
    }

    // If we error out - stop loop, emit failure
    if(this.errorCount >= MAX_ERROR_COUNT) {
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
        console.error('Failed to read header data')
        return
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
      this.emit('message', message)
    } catch (error) {
      if (error instanceof HeaderBuildError) {
        console.error(`Error parsing header for data`, error)
      } else {
        console.error(`Unexpected Error parsing header for data`, error)
      }
      this.errorCount++
    } finally {
      this.readLoop()
    }
  }

  open = async (config: DongleConfig) => {
    if (!this._device) {
      throw new Error('No device set - call initialise first')
    }
    if (!this._device?.opened) {
      return
    }

    this.errorCount = 0
    const { dpi: _dpi, nightMode: _nightMode, boxName: _boxName } = config
    const initMessages = [
      new SendNumber(_dpi, FileAddress.DPI),
      new SendOpen(config),
      new SendBoolean(_nightMode, FileAddress.NIGHT_MODE),
      new SendBoolean(false, FileAddress.HAND_DRIVE_MODE),
      new SendBoolean(true, FileAddress.CHARGE_MODE),
      new SendString(_boxName, FileAddress.BOX_NAME),
    ]
    await Promise.all(initMessages.map(this.send))
    await this.send(new SendCarPlay('wifiEn'))
    await this.send(new SendCarPlay('wifiConnect'))

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
