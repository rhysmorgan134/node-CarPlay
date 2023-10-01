import { DongleConfig } from '../DongleDriver.js'
import {
  MessageType,
  MessageHeader,
  CommandMapping,
  CommandValue,
} from './common.js'
import { clamp, getCurrentTimeInMs } from './utils.js'

export abstract class SendableMessage {
  abstract type: MessageType

  serialise() {
    return MessageHeader.asBuffer(this.type, 0)
  }
}

export abstract class SendableMessageWithPayload extends SendableMessage {
  abstract type: MessageType

  abstract getPayload(): Buffer

  override serialise() {
    const data = this.getPayload()
    const byteLength = Buffer.byteLength(data)
    const header = MessageHeader.asBuffer(this.type, byteLength)
    return Buffer.concat([header, data])
  }
}

export class SendCommand extends SendableMessageWithPayload {
  type = MessageType.Command
  value: CommandMapping

  getPayload(): Buffer {
    const data = Buffer.alloc(4)
    data.writeUInt32LE(this.value)
    return data
  }

  constructor(value: CommandValue) {
    super()
    this.value = CommandMapping[value]
  }
}

export enum TouchAction {
  Down = 14,
  Move = 15,
  Up = 16,
}

export class SendTouch extends SendableMessageWithPayload {
  type = MessageType.Touch
  x: number
  y: number
  action: TouchAction

  getPayload(): Buffer {
    const actionB = Buffer.alloc(4)
    const xB = Buffer.alloc(4)
    const yB = Buffer.alloc(4)
    const flags = Buffer.alloc(4)
    actionB.writeUInt32LE(this.action)

    const finalX = clamp(10000 * this.x, 0, 10000)
    const finalY = clamp(10000 * this.y, 0, 10000)

    xB.writeUInt32LE(finalX)
    yB.writeUInt32LE(finalY)
    const data = Buffer.concat([actionB, xB, yB, flags])
    return data
  }

  constructor(x: number, y: number, action: TouchAction) {
    super()
    this.x = x
    this.y = y
    this.action = action
  }
}

export class SendAudio extends SendableMessageWithPayload {
  type = MessageType.AudioData
  data: Int16Array

  getPayload(): Buffer {
    const audioData = Buffer.alloc(12)
    audioData.writeUInt32LE(5, 0)
    audioData.writeFloatLE(0.0, 4)
    audioData.writeUInt32LE(3, 8)
    return Buffer.concat([audioData, Buffer.from(this.data.buffer)])
  }

  constructor(data: Int16Array) {
    super()
    this.data = data
  }
}

export class SendFile extends SendableMessageWithPayload {
  type = MessageType.SendFile
  content: Buffer
  fileName: string

  private getFileName = (name: string) => {
    return Buffer.from(name + '\0', 'ascii')
  }

  private getLength = (data: Buffer) => {
    const buffer = Buffer.alloc(4)
    buffer.writeUInt32LE(Buffer.byteLength(data))
    return buffer
  }

  getPayload(): Buffer {
    const newFileName = this.getFileName(this.fileName)
    const nameLength = this.getLength(newFileName)
    const contentLength = this.getLength(this.content)
    const message = [nameLength, newFileName, contentLength, this.content]
    const data = Buffer.concat(message)
    return data
  }

  constructor(content: Buffer, fileName: string) {
    super()
    this.content = content
    this.fileName = fileName
  }
}

export enum FileAddress {
  DPI = '/tmp/screen_dpi',
  NIGHT_MODE = '/tmp/night_mode',
  HAND_DRIVE_MODE = '/tmp/hand_drive_mode',
  CHARGE_MODE = '/tmp/charge_mode',
  BOX_NAME = '/etc/box_name',
  OEM_ICON = '/etc/oem_icon.png',
  AIRPLAY_CONFIG = '/etc/airplay.conf',
  ICON_120 = '/etc/icon_120x120.png',
  ICON_180 = '/etc/icon_180x180.png',
  ICON_250 = '/etc/icon_256x256.png',
  ANDROID_WORK_MODE = '/etc/android_work_mode',
}

export class SendNumber extends SendFile {
  constructor(content: number, file: FileAddress) {
    const message = Buffer.alloc(4)
    message.writeUInt32LE(content)
    super(message, file)
  }
}

export class SendBoolean extends SendNumber {
  constructor(content: boolean, file: FileAddress) {
    super(Number(content), file)
  }
}

export class SendString extends SendFile {
  constructor(content: string, file: FileAddress) {
    if (content.length > 16) {
      console.error('string too long')
    }
    const message = Buffer.from(content, 'ascii')
    super(message, file)
  }
}

export class HeartBeat extends SendableMessage {
  type = MessageType.HeartBeat
}

export class SendOpen extends SendableMessageWithPayload {
  type = MessageType.Open
  config: DongleConfig

  getPayload(): Buffer {
    const { config } = this
    const width = Buffer.alloc(4)
    width.writeUInt32LE(config.width)
    const height = Buffer.alloc(4)
    height.writeUInt32LE(config.height)
    const fps = Buffer.alloc(4)
    fps.writeUInt32LE(config.fps)
    const format = Buffer.alloc(4)
    format.writeUInt32LE(config.format)
    const packetMax = Buffer.alloc(4)
    packetMax.writeUInt32LE(config.packetMax)
    const iBox = Buffer.alloc(4)
    iBox.writeUInt32LE(config.iBoxVersion)
    const phoneMode = Buffer.alloc(4)
    phoneMode.writeUInt32LE(config.phoneWorkMode)
    return Buffer.concat([
      width,
      height,
      fps,
      format,
      packetMax,
      iBox,
      phoneMode,
    ])
  }

  constructor(config: DongleConfig) {
    super()
    this.config = config
  }
}

export class SendBoxSettings extends SendableMessageWithPayload {
  type = MessageType.BoxSettings
  private syncTime: number | null
  private config: DongleConfig

  getPayload(): Buffer {
    // Intentionally using "syncTime" from now to avoid any drift
    // & delay between constructor() and getData()

    return Buffer.from(
      JSON.stringify({
        mediaDelay: this.config.mediaDelay,
        syncTime: this.syncTime ?? getCurrentTimeInMs(),
        androidAutoSizeW: this.config.width,
        androidAutoSizeH: this.config.height,
      }),
      'ascii',
    )
  }

  constructor(config: DongleConfig, syncTime: number | null = null) {
    super()
    this.config = config
    this.syncTime = syncTime
  }
}

export enum LogoType {
  HomeButton = 1,
  Siri = 2,
}

export class SendLogoType extends SendableMessageWithPayload {
  type = MessageType.LogoType
  logoType: LogoType

  getPayload(): Buffer {
    const data = Buffer.alloc(4)
    data.writeUInt32LE(this.logoType)
    return data
  }

  constructor(logoType: LogoType) {
    super()
    this.logoType = logoType
  }
}

export class SendIconConfig extends SendFile {
  constructor(config: { label?: string }) {
    const valueMap: {
      oemIconVisible: number
      name: string
      model: string
      oemIconPath: string
      oemIconLabel?: string
    } = {
      oemIconVisible: 1,
      name: 'AutoBox',
      model: 'Magic-Car-Link-1.00',
      oemIconPath: FileAddress.OEM_ICON,
    }

    if (config.label) {
      valueMap.oemIconLabel = config.label
    }

    const fileData = Object.entries(valueMap)
      .map(e => `${e[0]} = ${e[1]}`)
      .join('\n')

    super(Buffer.from(fileData + '\n', 'ascii'), FileAddress.AIRPLAY_CONFIG)
  }
}

// Disconnects phone and closes dongle - need to send open command again
export class SendCloseDongle extends SendableMessage {
  type = MessageType.CloseDongle
}

// Disconnects phone session - dongle is still open and phone can re-connect
export class SendDisconnectPhone extends SendableMessage {
  type = MessageType.DisconnectPhone
}
