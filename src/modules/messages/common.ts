import {
  Message,
  AudioData,
  VideoData,
  MediaData,
  BluetoothAddress,
  BluetoothDeviceName,
  BluetoothPIN,
  ManufacturerInfo,
  SoftwareVersion,
  Command,
  Plugged,
  WifiDeviceName,
  HiCarLink,
  BluetoothPairedList,
  Opened,
  BoxInfo,
  Unplugged,
  Phase,
} from './readable.js'

export enum CommandMapping {
  invalid = 0, //'invalid',
  startRecordAudio = 1,
  stopRecordAudio = 2,
  requestHostUI = 3, //'Carplay Interface My Car button clicked',
  siri = 5, //'Siri Button',
  mic = 7, //'Car Microphone',
  boxMic = 15, //'Box Microphone',
  enableNightMode = 16, // night mode
  disableNightMode = 17, // disable night mode
  wifi24g = 24, //'2.4G Wifi',
  wifi5g = 25, //'5G Wifi',
  left = 100, //'Button Left',
  right = 101, //'Button Right',
  frame = 12,
  audioTransferOn = 22, // Phone will Stream audio directly to car system and not dongle
  audioTransferOff = 23, // DEFAULT - Phone will stream audio to the dongle and it will send it over the link
  selectDown = 104, //'Button Select Down',
  selectUp = 105, //'Button Select Up',
  back = 106, //'Button Back',
  down = 114, //'Button Down',
  home = 200, //'Button Home',
  play = 201, //'Button Play',
  pause = 202, //'Button Pause',
  next = 204, //'Button Next Track',
  prev = 205, //'Button Prev Track',
  requestVideoFocus = 500,
  releaseVideoFocus = 501,
  wifiEnable = 1000,
  autoConnetEnable = 1001,
  wifiConnect = 1002,
  scanningDevice = 1003,
  deviceFound = 1004,
  deviceNotFound = 1005,
  connectDeviceFailed = 1006,
  btConnected = 1007,
  btDisconnected = 1008,
  wifiConnected = 1009,
  wifiDisconnected = 1010,
  btPairStart = 1011,
  wifiPair = 1012,
}

export type CommandValue = keyof typeof CommandMapping

export enum MessageType {
  Open = 0x01,
  Plugged = 0x02,
  Phase = 0x03,
  Unplugged = 0x04,
  Touch = 0x05,
  VideoData = 0x06,
  AudioData = 0x07,
  Command = 0x08,
  LogoType = 0x09,
  DisconnectPhone = 0xf,
  CloseDongle = 0x15,
  BluetoothAddress = 0x0a,
  BluetoothPIN = 0x0c,
  BluetoothDeviceName = 0x0d,
  WifiDeviceName = 0x0e,
  BluetoothPairedList = 0x12,
  ManufacturerInfo = 0x14,
  HiCarLink = 0x18,
  BoxSettings = 0x19,
  MediaData = 0x2a,
  SendFile = 0x99,
  HeartBeat = 0xaa,
  SoftwareVersion = 0xcc,
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

  static asBuffer(messageType: MessageType, byeLength: number): Buffer {
    const dataLen = Buffer.alloc(4)
    dataLen.writeUInt32LE(byeLength)
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
        case MessageType.Command:
          return new Command(this, data)
        case MessageType.Plugged:
          return new Plugged(this, data)
        case MessageType.WifiDeviceName:
          return new WifiDeviceName(this, data)
        case MessageType.HiCarLink:
          return new HiCarLink(this, data)
        case MessageType.BluetoothPairedList:
          return new BluetoothPairedList(this, data)
        case MessageType.Open:
          return new Opened(this, data)
        case MessageType.BoxSettings:
          return new BoxInfo(this, data)
        case MessageType.Phase:
          return new Phase(this, data)
        default:
          console.debug(
            `Unknown message type: ${type}, data: ${data.toString()}`,
          )
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
