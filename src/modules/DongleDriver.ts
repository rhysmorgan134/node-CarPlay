import EventEmitter from 'events'
import { MessageHeader, HeaderBuildError } from './messages/common.js'
import { PhoneType } from './messages/readable.js'
import {
  SendableMessage,
  SendNumber,
  FileAddress,
  SendOpen,
  SendBoolean,
  SendString,
  SendBoxSettings,
  SendCommand,
  HeartBeat,
} from './messages/sendable.js'

const CONFIG_NUMBER = 1
const MAX_ERROR_COUNT = 5

export enum HandDriveType {
  LHD = 0,
  RHD = 1,
}

export type PhoneTypeConfig = {
  frameInterval: number | null
}

type PhoneTypeConfigMap = {
  [K in PhoneType]: PhoneTypeConfig
}

export type DongleConfig = {
  androidWorkMode?: boolean
  width: number
  height: number
  fps: number
  dpi: number
  format: number
  iBoxVersion: number
  packetMax: number
  phoneWorkMode: number
  nightMode: boolean
  boxName: string
  hand: HandDriveType
  mediaDelay: number
  audioTransferMode: boolean
  wifiType: '2.4ghz' | '5ghz'
  micType: 'box' | 'os'
  phoneConfig: Partial<PhoneTypeConfigMap>
}

export const DEFAULT_CONFIG: DongleConfig = {
  width: 800,
  height: 480,
  fps: 60,
  dpi: 160,
  format: 5,
  iBoxVersion: 2,
  phoneWorkMode: 2,
  packetMax: 49152,
  boxName: 'nodePlay',
  nightMode: false,
  hand: HandDriveType.LHD,
  mediaDelay: 300,
  audioTransferMode: false,
  wifiType: '5ghz',
  micType: 'os',
  phoneConfig: {
    [PhoneType.CarPlay]: {
      frameInterval: 5000,
    },
    [PhoneType.AndroidAuto]: {
      frameInterval: null,
    },
  },
}

export class DriverStateError extends Error {}

export class DongleDriver extends EventEmitter {
  private _heartbeatInterval: ReturnType<typeof setInterval> | null = null
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
      const payload = message.serialise()
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

  start = async (config: DongleConfig) => {
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
      audioTransferMode,
      wifiType,
      micType,
    } = config
    const initMessages = [
      new SendNumber(_dpi, FileAddress.DPI),
      new SendOpen(config),
      new SendBoolean(_nightMode, FileAddress.NIGHT_MODE),
      new SendNumber(config.hand, FileAddress.HAND_DRIVE_MODE),
      new SendBoolean(true, FileAddress.CHARGE_MODE),
      new SendString(_boxName, FileAddress.BOX_NAME),
      new SendBoxSettings(config),
      new SendCommand('wifiEnable'),
      new SendCommand(wifiType === '5ghz' ? 'wifi5g' : 'wifi24g'),
      new SendCommand(micType === 'box' ? 'boxMic' : 'mic'),
      new SendCommand(
        audioTransferMode ? 'audioTransferOn' : 'audioTransferOff',
      ),
    ]
    if (config.androidWorkMode) {
      initMessages.push(
        new SendBoolean(config.androidWorkMode, FileAddress.ANDROID_WORK_MODE),
      )
    }
    await Promise.all(initMessages.map(this.send))
    setTimeout(() => {
      this.send(new SendCommand('wifiConnect'))
    }, 1000)

    this.readLoop()

    this._heartbeatInterval = setInterval(() => {
      this.send(new HeartBeat())
    }, 2000)
  }

  close = async () => {
    if (!this._device) {
      return
    }
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval)
      this._heartbeatInterval = null
    }
    await this._device.close()
    this._device = null
    this._inEP = null
    this._outEP = null
  }
}
