import { MessageHeader, MessageType, CommandMapping } from '../common.js'
import { SendCommand, SendTouch, TouchAction } from '../sendable.js'

describe('Sendable Messages', () => {
  describe('SendTouch Message', () => {
    it('constructs message with correct values', () => {
      const message = new SendTouch(0.1, 0.2, TouchAction.Up)
      expect(message.x).toBe(0.1)
      expect(message.y).toBe(0.2)
      expect(message.action).toBe(TouchAction.Up)
    })

    it('serialises message correctly', () => {
      const expectedPayload = Buffer.alloc(16)
      expectedPayload.writeUInt32LE(TouchAction.Up, 0)
      expectedPayload.writeUInt32LE(0.1 * 10000, 4)
      expectedPayload.writeUInt32LE(0.2 * 10000, 8)

      const expectedHeader = MessageHeader.asBuffer(
        MessageType.Touch,
        Buffer.byteLength(expectedPayload),
      )

      const message = new SendTouch(0.1, 0.2, TouchAction.Up)

      const data = message.serialise()
      expect(data).toStrictEqual(
        Buffer.concat([expectedHeader, expectedPayload]),
      )
    })

    it('serialises message with clamped values (0-10000)', () => {
      const expectedPayload = Buffer.alloc(16)
      expectedPayload.writeUInt32LE(TouchAction.Up, 0)
      expectedPayload.writeUInt32LE(0, 4)
      expectedPayload.writeUInt32LE(10000, 8)

      const expectedHeader = MessageHeader.asBuffer(
        MessageType.Touch,
        Buffer.byteLength(expectedPayload),
      )

      const message = new SendTouch(-0.5, 2, TouchAction.Up)
      const data = message.serialise()
      expect(data).toStrictEqual(
        Buffer.concat([expectedHeader, expectedPayload]),
      )
    })
  })

  describe('Command Message', () => {
    it('constructs message with correct values', () => {
      const message = new SendCommand('siri')
      expect(message.value).toBe(CommandMapping.siri)
    })

    it('serialises message correctly', () => {
      const expectedPayload = Buffer.alloc(4)
      expectedPayload.writeUInt32LE(CommandMapping.siri, 0)

      const expectedHeader = MessageHeader.asBuffer(
        MessageType.Command,
        Buffer.byteLength(expectedPayload),
      )

      const message = new SendCommand('siri')

      const data = message.serialise()
      expect(data).toStrictEqual(
        Buffer.concat([expectedHeader, expectedPayload]),
      )
    })
  })
})
