import { DongleConfig } from './DongleDriver'
import { clamp } from './utils'

export enum KeyMapping {
  invalid = 0, //'invalid',
  car = 3, //'Carplay Interface My Car button clicked',
  siri = 5, //'Siri Button',
  mic = 7, //'Car Microphone',
  left = 100, //'Button Left',
  right = 101, //'Button Right',
  frame = 12,
  selectDown = 104, //'Button Select Down',
  selectUp = 105, //'Button Select Up',
  back = 106, //'Button Back',
  down = 114, //'Button Down',
  home = 200, //'Button Home',
  play = 201, //'Button Play',
  pause = 202, //'Button Pause',
  next = 204, //'Button Next Track',
  prev = 205, //'Button Prev Track',
  wifiEn = 1000,
  wifiPair = 1012,
  wifiConnect = 1002,
}

export type Key = keyof typeof KeyMapping

export enum MessageType {
  SendFile = 0x99,
  Open = 0x01,
  HeartBeat = 0xaa,
  ManufacturerInfo = 0x14,
  CarPlay = 0x08,
  SoftwareVersion = 0xcc,
  BluetoothAddress = 0x0a,
  BluetoothPIN = 0x0c,
  Plugged = 0x02,
  Unplugged = 0x04,
  VideoData = 0x06,
  AudioData = 0x07,
  Touch = 0x05,
  BluetoothDeviceName = 0x0d,
  WifiDeviceName = 0x0e,
  BluetoothPairedList = 0x12,
  MediaData = 0x2a,
}

export class HeaderBuildError extends Error {}

export class MessageHeader {
  length: number
  type: MessageType

  public constructor(length: number, type: MessageType) {
    this.length = length
    this.type = type
  }

  static fromBuffer(data: Buffer): MessageHeader {
    if (data.length !== 16) {
      throw new HeaderBuildError(
        `Invalid buffer size - Expecting 16, got ${data.length}`,
      )
    }
    const magic = data.readUInt32LE(0)
    if (magic !== MessageHeader.magic) {
      throw new HeaderBuildError(`Invalid magic number, received ${magic}`)
    }
    const length = data.readUInt32LE(4)
    const msgType: MessageType = data.readUInt32LE(8)
    const typeCheck = data.readUInt32LE(12)
    if (typeCheck != ((msgType ^ -1) & 0xffffffff) >>> 0) {
      throw new HeaderBuildError(`Invalid type check, received ${typeCheck}`)
    }
    return new MessageHeader(length, msgType)
  }

  static serialiseWithData(messageType: MessageType, data: Buffer): Buffer {
    const dataLen = Buffer.alloc(4)
    dataLen.writeUInt32LE(Buffer.byteLength(data))
    const type = Buffer.alloc(4)
    type.writeUInt32LE(messageType)
    const typeCheck = Buffer.alloc(4)
    typeCheck.writeUInt32LE(((messageType ^ -1) & 0xffffffff) >>> 0)
    const magicNumber = Buffer.alloc(4)
    magicNumber.writeUInt32LE(MessageHeader.magic)
    return Buffer.concat([magicNumber, dataLen, type, typeCheck])
  }

  toMessage(data?: Buffer): Message | null {
    const { type } = this
    if (data) {
      switch (type) {
        case MessageType.AudioData:
          return new AudioData(this, data)
        case MessageType.VideoData:
          return new VideoData(this, data)
        case MessageType.MediaData:
          return new MediaData(this, data)
        case MessageType.BluetoothAddress:
          return new BluetoothAddress(this, data)
        case MessageType.BluetoothDeviceName:
          return new BluetoothDeviceName(this, data)
        case MessageType.BluetoothPIN:
          return new BluetoothPIN(this, data)
        case MessageType.ManufacturerInfo:
          return new ManufacturerInfo(this, data)
        case MessageType.SoftwareVersion:
          return new SoftwareVersion(this, data)
        case MessageType.CarPlay:
          return new CarPlay(this, data)
        case MessageType.Plugged:
          return new Plugged(this, data)
        default:
          console.debug(`Unknown message type: ${type}`)
          return null
      }
    } else {
      switch (type) {
        case MessageType.Unplugged:
          return new Unplugged(this)
        default:
          console.debug(`Unknown message type without data: ${type}`)
          return null
      }
    }
  }

  static dataLength = 16
  static magic = 0x55aa55aa
}

export enum AudioCommand {
  AudioOutputStart = 1,
  AudioOutputStop = 2,
  AudioInputConfig = 3,
  AudioPhonecallStart = 4,
  AudioPhonecallStop = 5,
  AudioNaviStart = 6,
  AudioNaviStop = 7,
  AudioSiriStart = 8,
  AudioSiriStop = 9,
  AudioMediaStart = 10,
  AudioMediaStop = 11,
}

export abstract class Message {
  header: MessageHeader

  constructor(header: MessageHeader) {
    this.header = header
  }
}

export class CarPlay extends Message {
  value: KeyMapping

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    this.value = data.readUInt32LE(0)
  }
}

export class ManufacturerInfo extends Message {
  a: number
  b: number

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    this.a = data.readUInt32LE(0)
    this.b = data.readUInt32LE(4)
  }
}

export class SoftwareVersion extends Message {
  version: string

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    this.version = data.toString('ascii')
  }
}

export class BluetoothAddress extends Message {
  address: string

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    this.address = data.toString('ascii')
  }
}

export class BluetoothPIN extends Message {
  pin: string

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    this.pin = data.toString('ascii')
  }
}

export class BluetoothDeviceName extends Message {
  name: string

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    this.name = data.toString('ascii')
  }
}

export class Plugged extends Message {
  phoneType: number
  wifi?: number

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    const wifiAvail = Buffer.byteLength(data) === 8
    if (wifiAvail) {
      this.phoneType = data.readUInt32LE(0)
      this.wifi = data.readUInt32LE(4)
      console.debug(
        'wifi avail, phone type: ',
        this.phoneType,
        ' wifi: ',
        this.wifi,
      )
    } else {
      this.phoneType = data.readUInt32LE(0)
      console.debug('no wifi avail, phone type: ', this.phoneType)
    }
  }
}

export class Unplugged extends Message {
  constructor(header: MessageHeader) {
    super(header)
  }
}

export type AudioFormat = {
  frequency: number
  channel: number
  bitrate: number
}

type DecodeTypeMapping = {
  [key: number]: AudioFormat
}

export const decodeTypeMap: DecodeTypeMapping = {
  1: {
    frequency: 44100,
    channel: 2,
    bitrate: 16,
  },
  2: {
    frequency: 44100,
    channel: 2,
    bitrate: 16,
  },
  3: {
    frequency: 8000,
    channel: 1,
    bitrate: 16,
  },
  4: {
    frequency: 48000,
    channel: 2,
    bitrate: 16,
  },
  5: {
    frequency: 16000,
    channel: 1,
    bitrate: 16,
  },
  6: {
    frequency: 24000,
    channel: 1,
    bitrate: 16,
  },
  7: {
    frequency: 16000,
    channel: 2,
    bitrate: 16,
  },
}

export class AudioData extends Message {
  command?: AudioCommand
  format: AudioFormat
  volume: number
  volumeDuration?: number
  audioType: number
  data?: Buffer

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    const decodeType = data.readUInt32LE(0)
    this.format = decodeTypeMap[decodeType]
    this.volume = data.readFloatLE(4)
    this.audioType = data.readUInt32LE(8)
    const amount = data.length - 12
    if (amount === 1) {
      this.command = data.readInt8(12)
    } else if (amount === 4) {
      this.volumeDuration = data.readUInt32LE(12)
    } else {
      this.data = data.subarray(12)
    }
  }
}

export class VideoData extends Message {
  width: number
  height: number
  flags: number
  length: number
  unknown2: number
  data: Buffer

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    this.width = data.readUInt32LE(0)
    this.height = data.readUInt32LE(4)
    this.flags = data.readUInt32LE(8)
    this.length = data.readUInt32LE(12)
    this.unknown2 = data.readUInt32LE(16)
    this.data = data.subarray(20)
  }
}

enum MediaType {
  Data = 1,
  AlbumCover = 3,
}

export class MediaData extends Message {
  payload?:
    | {
        type: MediaType.Data
        media: {
          MediaSongName?: string
          MediaAlbumName?: string
          MediaArtistName?: string
          MediaAPPName?: string
          MediaSongDuration?: number
          MediaSongPlayTime?: number
        }
      }
    | { type: MediaType.AlbumCover; base64Image: string }

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    const type = data.readUInt32LE(0)
    if (type === MediaType.AlbumCover) {
      const imageData = data.subarray(4)
      this.payload = {
        type,
        base64Image: imageData.toString('base64'),
      }
    } else if (type === MediaType.Data) {
      const mediaData = data.subarray(4, data.length - 1)
      this.payload = {
        type,
        media: JSON.parse(mediaData.toString('utf8')),
      }
    } else {
      console.info(`Unexpected media type: ${type}`)
    }
  }
}

export abstract class SendableMessage {
  abstract type: MessageType

  abstract getData(): Buffer

  protected getLength = (data: Buffer) => {
    const buffer = Buffer.alloc(4)
    buffer.writeUInt32LE(Buffer.byteLength(data))
    return buffer
  }

  serialise() {
    const data = this.getData()
    const header = MessageHeader.serialiseWithData(this.type, data)
    return [header, data]
  }
}

export class SendCarPlay extends SendableMessage {
  type = MessageType.CarPlay
  value: KeyMapping

  getData(): Buffer {
    const data = Buffer.alloc(4)
    data.writeUInt32LE(this.value)
    return data
  }

  constructor(value: keyof typeof KeyMapping) {
    super()
    this.value = KeyMapping[value]
  }
}

export enum TouchAction {
  Down = 14,
  Move = 15,
  Up = 16,
}

export class SendTouch extends SendableMessage {
  type = MessageType.Touch
  x: number
  y: number
  action: TouchAction

  getData(): Buffer {
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

export class SendAudio extends SendableMessage {
  type = MessageType.AudioData
  data: Buffer

  getData(): Buffer {
    const audioData = Buffer.alloc(12)
    audioData.writeUInt32LE(5, 0)
    audioData.writeFloatLE(0.0, 4)
    audioData.writeUInt32LE(3, 8)
    return Buffer.concat([audioData, this.data])
  }

  constructor(data: Buffer) {
    super()
    this.data = data
  }
}

export class SendFile extends SendableMessage {
  type = MessageType.SendFile
  content: Buffer
  fileName: string

  private getFileName = (name: string) => {
    return Buffer.from(name + '\0', 'ascii')
  }

  getData(): Buffer {
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

  getData(): Buffer {
    return Buffer.from('', 'ascii')
  }
}

export class SendOpen extends SendableMessage {
  type = MessageType.Open
  config: DongleConfig

  getData(): Buffer {
    const { width: _width, height: _height, fps: _fps } = this.config
    const width = Buffer.alloc(4)
    width.writeUInt32LE(_width)
    const height = Buffer.alloc(4)
    height.writeUInt32LE(_height)
    const fps = Buffer.alloc(4)
    fps.writeUInt32LE(_fps)
    const format = Buffer.alloc(4)
    format.writeUInt32LE(2)
    const packetMax = Buffer.alloc(4)
    packetMax.writeUInt32LE(49125)
    const iBox = Buffer.alloc(4)
    iBox.writeUInt32LE(2)
    const phoneMode = Buffer.alloc(4)
    phoneMode.writeUInt32LE(2)
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
