import { MessageHeader, CommandMapping } from './common.js'

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
  AudioAlertStart = 12,
  AudioAlertStop = 13,
}

export abstract class Message {
  header: MessageHeader

  constructor(header: MessageHeader) {
    this.header = header
  }
}

export class Command extends Message {
  value: CommandMapping

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

export class WifiDeviceName extends Message {
  name: string

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    this.name = data.toString('ascii')
  }
}

export class HiCarLink extends Message {
  link: string

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    this.link = data.toString('ascii')
  }
}

export class BluetoothPairedList extends Message {
  data: string

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    this.data = data.toString('ascii')
  }
}

export enum PhoneType {
  AndroidMirror = 1,
  CarPlay = 3,
  iPhoneMirror = 4,
  AndroidAuto = 5,
  HiCar = 6,
}

export class Plugged extends Message {
  phoneType: PhoneType
  wifi?: number

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    const wifiAvail = Buffer.byteLength(data) === 8
    if (wifiAvail) {
      this.phoneType = data.readUInt32LE(0)
      this.wifi = data.readUInt32LE(4)
      console.debug(
        'wifi avail, phone type: ',
        PhoneType[this.phoneType],
        ' wifi: ',
        this.wifi,
      )
    } else {
      this.phoneType = data.readUInt32LE(0)
      console.debug('no wifi avail, phone type: ', PhoneType[this.phoneType])
    }
  }
}

export class Unplugged extends Message {
  constructor(header: MessageHeader) {
    super(header)
  }
}

export type AudioFormat = {
  frequency: 48000 | 44100 | 24000 | 16000 | 8000
  channel: 1 | 2
  bitDepth: number
  format?:   string
  mimeType?: string
}

type DecodeTypeMapping = {
  [key: number]: AudioFormat
}

export const decodeTypeMap: DecodeTypeMapping = {
  1: {
    frequency: 44100,
    channel: 2,
    bitDepth: 16,
    format: "S16LE",
    mimeType: "audio/L16; rate=44100; channels=2"
  },
  2: {
    frequency: 44100,
    channel: 2,
    bitDepth: 16,
    format: "S16LE",
    mimeType: "audio/L16; rate=44100; channels=2"
  },
  3: {
    frequency: 8000,
    channel: 1,
    bitDepth: 16,
    format: "S16LE",
    mimeType:  "audio/L16; rate=8000; channels=1"
  },
  4: {
    frequency: 48000,
    channel: 2,
    bitDepth: 16,
    format: "S16LE",
    mimeType:  "audio/L16; rate=48000; channels=2"
  },
  5: {
    frequency: 16000,
    channel: 1,
    bitDepth: 16,
    format: "S16LE",
    mimeType:  "audio/L16; rate=16000; channels=1"
  },
  6: {
    frequency: 24000,
    channel: 1,
    bitDepth: 16,
    format: "S16LE",
    mimeType:  "audio/L16; rate=24000; channels=1"
  },
  7: {
    frequency: 16000,
    channel: 2,
    bitDepth: 16,
    format: "S16LE",
    mimeType:  "audio/L16; rate=16000; channels=2"
  },
}

export class AudioData extends Message {
  command?: AudioCommand
  decodeType: number
  volume: number
  volumeDuration?: number
  audioType: number
  data?: Int16Array

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    this.decodeType = data.readUInt32LE(0)
    this.volume = data.readFloatLE(4)
    this.audioType = data.readUInt32LE(8)
    const amount = data.length - 12
    if (amount === 1) {
      this.command = data.readInt8(12)
    } else if (amount === 4) {
      this.volumeDuration = data.readFloatLE(12)
    } else {
      this.data = new Int16Array(data.buffer, 12)
    }
  }
}

export class VideoData extends Message {
  width: number
  height: number
  flags: number
  length: number
  unknown: number
  data: Buffer

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    this.width = data.readUInt32LE(0)
    this.height = data.readUInt32LE(4)
    this.flags = data.readUInt32LE(8)
    this.length = data.readUInt32LE(12)
    this.unknown = data.readUInt32LE(16)
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

export class Opened extends Message {
  width: number
  height: number
  fps: number
  format: number
  packetMax: number
  iBox: number
  phoneMode: number

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    this.width = data.readUInt32LE(0)
    this.height = data.readUInt32LE(4)
    this.fps = data.readUInt32LE(8)
    this.format = data.readUInt32LE(12)
    this.packetMax = data.readUInt32LE(16)
    this.iBox = data.readUInt32LE(20)
    this.phoneMode = data.readUInt32LE(24)
  }
}
export class BoxInfo extends Message {
  settings:
    | {
        HiCar: number
        OemName: string
        WiFiChannel: number
        boxType: string
        hwVersion: string
        productType: string
        uuid: string
      }
    | {
        MDLinkType: string
        MDModel: string
        MDOSVersion: string
        MDLinkVersion: string
        cpuTemp: number
      }
  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    this.settings = JSON.parse(data.toString())
  }
}

export class Phase extends Message {
  phase: number

  constructor(header: MessageHeader, data: Buffer) {
    super(header)
    //TODO: find correct mapped values
    this.phase = data.readUInt32LE(0)
  }
}
