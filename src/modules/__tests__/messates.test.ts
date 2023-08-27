import {
  BluetoothAddress,
  BluetoothDeviceName,
  BluetoothPIN,
  CarPlay,
  HeaderBuildError,
  KeyMapping,
  ManufacturerInfo,
  MessageHeader,
  MessageType,
  Plugged,
  SoftwareVersion,
  Unplugged,
} from '../messages'

describe('MessageHeader', () => {
  describe('constructor', () => {
    it('Constructs instance with type and length', () => {
      const header = new MessageHeader(10, MessageType.CarPlay)
      expect(header.type).toBe(MessageType.CarPlay)
      expect(header.length).toBe(10)
    })
  })

  describe('fromBuffer', () => {
    it('Constructs instance with type and length', () => {
      const buffer = Buffer.alloc(16)
      buffer.writeUInt32LE(MessageHeader.magic, 0)
      buffer.writeUInt32LE(10, 4)
      buffer.writeUInt32LE(MessageType.CarPlay, 8)
      buffer.writeUInt32LE(((MessageType.CarPlay ^ -1) & 0xffffffff) >>> 0, 12)
      const header = MessageHeader.fromBuffer(buffer)
      expect(header.type).toBe(MessageType.CarPlay)
      expect(header.length).toBe(10)
    })

    it('throws if buffer length is wrong', () => {
      const buffer = Buffer.alloc(10)
      expect(() => MessageHeader.fromBuffer(buffer)).toThrow(
        new HeaderBuildError('Invalid buffer size - Expecting 16, got 10'),
      )
    })

    it('throws if magic number check fails', () => {
      const buffer = Buffer.alloc(16)
      buffer.writeUInt32LE(12345, 0)
      expect(() => MessageHeader.fromBuffer(buffer)).toThrow(
        new HeaderBuildError('Invalid magic number, received 12345'),
      )
    })

    it('throws if type check fails', () => {
      const buffer = Buffer.alloc(16)
      buffer.writeUInt32LE(MessageHeader.magic, 0)
      buffer.writeUInt32LE(10, 4)
      buffer.writeUInt32LE(MessageType.CarPlay, 8)
      buffer.writeUInt32LE(12345, 12)
      expect(() => MessageHeader.fromBuffer(buffer)).toThrow(
        new HeaderBuildError('Invalid type check, received 12345'),
      )
    })
  })

  describe('toMessage', () => {
    it('constructs message based on type with no data', () => {
      const header = new MessageHeader(0, MessageType.Unplugged)
      expect(header.toMessage() instanceof Unplugged).toBeTruthy()
    })

    it('constructs message based on type with data', () => {
      const header = new MessageHeader(4, MessageType.CarPlay)
      const data = Buffer.alloc(4)
      data.writeUInt32LE(KeyMapping.siri, 0)
      const message = header.toMessage(data)
      expect(message instanceof CarPlay).toBeTruthy()
      expect((message as CarPlay).value).toBe(KeyMapping.siri)
    })
  })
})

describe('CarPlay Message', () => {
  it('constructs message with correct value', () => {
    const header = new MessageHeader(4, MessageType.CarPlay)
    const data = Buffer.alloc(4)
    data.writeUInt32LE(KeyMapping.frame, 0)
    const message = header.toMessage(data)
    expect(message instanceof CarPlay).toBeTruthy()
    expect((message as CarPlay).value).toBe(KeyMapping.frame)
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
    const data = Buffer.from('address 1')
    const header = new MessageHeader(data.length, MessageType.BluetoothAddress)
    const message = header.toMessage(data)
    expect(message instanceof BluetoothAddress).toBeTruthy()
    expect((message as BluetoothAddress).address).toBe('address 1')
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
