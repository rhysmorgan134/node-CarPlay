import {
  MessageHeader,
  MessageType,
  HeaderBuildError,
  CommandMapping,
} from '../common.js'
import { Command, Unplugged } from '../readable.js'

describe('MessageHeader', () => {
  describe('constructor', () => {
    it('Constructs instance with type and length', () => {
      const header = new MessageHeader(10, MessageType.Command)
      expect(header.type).toBe(MessageType.Command)
      expect(header.length).toBe(10)
    })
  })

  describe('fromBuffer', () => {
    it('Constructs instance with type and length', () => {
      const buffer = Buffer.alloc(16)
      buffer.writeUInt32LE(MessageHeader.magic, 0)
      buffer.writeUInt32LE(10, 4)
      buffer.writeUInt32LE(MessageType.Command, 8)
      buffer.writeUInt32LE(((MessageType.Command ^ -1) & 0xffffffff) >>> 0, 12)
      const header = MessageHeader.fromBuffer(buffer)
      expect(header.type).toBe(MessageType.Command)
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
      buffer.writeUInt32LE(MessageType.Command, 8)
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
      const header = new MessageHeader(4, MessageType.Command)
      const data = Buffer.alloc(4)
      data.writeUInt32LE(CommandMapping.siri, 0)
      const message = header.toMessage(data)
      expect(message instanceof Command).toBeTruthy()
      expect((message as Command).value).toBe(CommandMapping.siri)
    })
  })
})
