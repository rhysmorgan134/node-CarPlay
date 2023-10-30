import { MessageHeader, MessageType, CommandMapping } from '../common.js'
import {
  AudioCommand,
  AudioData,
  BluetoothAddress,
  BluetoothDeviceName,
  BluetoothPIN,
  BluetoothPairedList,
  Command,
  HiCarLink,
  ManufacturerInfo,
  Plugged,
  SoftwareVersion,
  VideoData,
  WifiDeviceName,
} from '../readable.js'

describe('Readable Messages', () => {
  describe('Command Message', () => {
    it('constructs message with correct value', () => {
      const header = new MessageHeader(4, MessageType.Command)
      const data = Buffer.alloc(4)
      data.writeUInt32LE(CommandMapping.frame, 0)
      const message = header.toMessage(data)
      expect(message instanceof Command).toBeTruthy()
      expect((message as Command).value).toBe(CommandMapping.frame)
    })
  })

  describe('ManufacturerInfo Message', () => {
    it('constructs message with correct values', () => {
      const header = new MessageHeader(8, MessageType.ManufacturerInfo)
      const data = Buffer.alloc(8)
      data.writeUInt32LE(1, 0)
      data.writeUInt32LE(3, 4)
      const message = header.toMessage(data)
      expect(message instanceof ManufacturerInfo).toBeTruthy()
      expect((message as ManufacturerInfo).a).toBe(1)
      expect((message as ManufacturerInfo).b).toBe(3)
    })
  })

  describe('SoftwareVersion Message', () => {
    it('constructs message with correct values', () => {
      const data = Buffer.from('version 1')
      const header = new MessageHeader(data.length, MessageType.SoftwareVersion)
      const message = header.toMessage(data)
      expect(message instanceof SoftwareVersion).toBeTruthy()
      expect((message as SoftwareVersion).version).toBe('version 1')
    })
  })

  describe('BluetoothAddress Message', () => {
    it('constructs message with correct values', () => {
      const data = Buffer.from('00:11:22:33:FF:EE')
      const header = new MessageHeader(
        data.length,
        MessageType.BluetoothAddress,
      )
      const message = header.toMessage(data)
      expect(message instanceof BluetoothAddress).toBeTruthy()
      expect((message as BluetoothAddress).address).toBe('00:11:22:33:FF:EE')
    })
  })

  describe('BluetoothPIN Message', () => {
    it('constructs message with correct values', () => {
      const data = Buffer.from('1234')
      const header = new MessageHeader(data.length, MessageType.BluetoothPIN)
      const message = header.toMessage(data)
      expect(message instanceof BluetoothPIN).toBeTruthy()
      expect((message as BluetoothPIN).pin).toBe('1234')
    })
  })

  describe('BluetoothDeviceName Message', () => {
    it('constructs message with correct values', () => {
      const data = Buffer.from('device 1')
      const header = new MessageHeader(
        data.length,
        MessageType.BluetoothDeviceName,
      )
      const message = header.toMessage(data)
      expect(message instanceof BluetoothDeviceName).toBeTruthy()
      expect((message as BluetoothDeviceName).name).toBe('device 1')
    })
  })

  describe('HiCarLink Message', () => {
    it('constructs message with correct values', () => {
      const data = Buffer.from('hicar://some-link')
      const header = new MessageHeader(data.length, MessageType.HiCarLink)
      const message = header.toMessage(data)
      expect(message instanceof HiCarLink).toBeTruthy()
      expect((message as HiCarLink).link).toBe('hicar://some-link')
    })
  })

  describe('BluetoothPairedList Message', () => {
    it('constructs message with correct values', () => {
      const data = Buffer.from('00:11:22:33:FF:EETest')
      const header = new MessageHeader(
        data.length,
        MessageType.BluetoothPairedList,
      )
      const message = header.toMessage(data)
      expect(message instanceof BluetoothPairedList).toBeTruthy()
      expect((message as BluetoothPairedList).data).toBe(
        '00:11:22:33:FF:EETest',
      )
    })
  })

  describe('WifiDeviceName Message', () => {
    it('constructs message with correct values', () => {
      const data = Buffer.from('00:11:22:33:FF:EE')
      const header = new MessageHeader(data.length, MessageType.WifiDeviceName)
      const message = header.toMessage(data)
      expect(message instanceof WifiDeviceName).toBeTruthy()
      expect((message as WifiDeviceName).name).toBe('00:11:22:33:FF:EE')
    })
  })

  describe('Plugged Message', () => {
    it('constructs message with wifi when it has 8 bytes of data', () => {
      const data = Buffer.alloc(8)
      data.writeUInt32LE(3, 0)
      data.writeUInt32LE(1, 4)
      const header = new MessageHeader(data.length, MessageType.Plugged)
      const message = header.toMessage(data)
      expect(message instanceof Plugged).toBeTruthy()
      expect((message as Plugged).phoneType).toBe(3)
      expect((message as Plugged).wifi).toBe(1)
    })

    it('constructs message with no wifi if data is not 8 bytes', () => {
      const data = Buffer.alloc(4)
      data.writeUInt32LE(3, 0)
      const header = new MessageHeader(data.length, MessageType.Plugged)
      const message = header.toMessage(data)
      expect(message instanceof Plugged).toBeTruthy()
      expect((message as Plugged).phoneType).toBe(3)
      expect((message as Plugged).wifi).toBeUndefined()
    })
  })

  describe('AudioData Message', () => {
    it('constructs message with raw audio data', () => {
      const data = Buffer.alloc(512)
      data.writeUInt32LE(1, 0)
      data.writeFloatLE(0.5, 4)
      data.writeUInt32LE(1, 8)
      const header = new MessageHeader(data.length, MessageType.AudioData)
      const message = header.toMessage(data)
      expect(message instanceof AudioData).toBeTruthy()
      expect((message as AudioData).decodeType).toBe(1)
      expect((message as AudioData).volume).toBe(0.5)
      expect((message as AudioData).audioType).toBe(1)
      expect((message as AudioData).data).toStrictEqual(
        new Int16Array(data.buffer, 12),
      )
    })

    it('constructs message with volume duration', () => {
      const data = Buffer.alloc(16)
      data.writeUInt32LE(1, 0)
      data.writeFloatLE(0.5, 4)
      data.writeUInt32LE(1, 8)
      data.writeFloatLE(0.5, 12)
      const header = new MessageHeader(data.length, MessageType.AudioData)
      const message = header.toMessage(data)
      expect(message instanceof AudioData).toBeTruthy()
      expect((message as AudioData).decodeType).toBe(1)
      expect((message as AudioData).volume).toBe(0.5)
      expect((message as AudioData).audioType).toBe(1)
      expect((message as AudioData).volumeDuration).toBe(0.5)
      expect((message as AudioData).data).toBeUndefined()
    })

    it('constructs message with command', () => {
      const data = Buffer.alloc(13)
      data.writeUInt32LE(1, 0)
      data.writeFloatLE(0.5, 4)
      data.writeUInt32LE(1, 8)
      data.writeInt8(1, 12)
      const header = new MessageHeader(data.length, MessageType.AudioData)
      const message = header.toMessage(data)
      expect(message instanceof AudioData).toBeTruthy()
      expect((message as AudioData).decodeType).toBe(1)
      expect((message as AudioData).volume).toBe(0.5)
      expect((message as AudioData).audioType).toBe(1)
      expect((message as AudioData).command).toBe(AudioCommand.AudioOutputStart)
      expect((message as AudioData).volumeDuration).toBeUndefined()
      expect((message as AudioData).data).toBeUndefined()
    })
  })

  describe('VideoData Message', () => {
    it('constructs message with correct values', () => {
      const data = Buffer.alloc(512)
      data.writeUInt32LE(800, 0)
      data.writeUInt32LE(600, 4)
      data.writeUInt32LE(1, 8)
      data.writeUInt32LE(10, 12)
      data.writeUInt32LE(2, 16)
      const header = new MessageHeader(data.length, MessageType.VideoData)
      const message = header.toMessage(data)
      expect(message instanceof VideoData).toBeTruthy()
      expect((message as VideoData).width).toBe(800)
      expect((message as VideoData).height).toBe(600)
      expect((message as VideoData).flags).toBe(1)
      expect((message as VideoData).length).toBe(10)
      expect((message as VideoData).unknown).toBe(2)
      expect((message as VideoData).data).toStrictEqual(data.subarray(20))
    })
  })
})
