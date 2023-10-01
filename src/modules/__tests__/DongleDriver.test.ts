import { jest } from '@jest/globals'
import {
  DongleDriver,
  DEFAULT_CONFIG,
  DriverStateError,
} from '../DongleDriver.js'
import {
  FileAddress,
  HeartBeat,
  SendBoolean,
  SendBoxSettings,
  SendCommand,
  SendNumber,
  SendOpen,
  SendString,
  SendableMessage,
} from '../messages/index.js'
import {
  usbDeviceFactory,
  deviceConfig,
  usbInterface,
  usbEndpoint,
} from './mocks/usbMocks.js'

const expectMessageSent = (device: USBDevice, message: SendableMessage) => {
  expect(device.transferOut).toHaveBeenCalledWith(1, message.serialise())
}

describe('DongleDriver', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('Initialise method', () => {
    it('fails if device is not open', async () => {
      const driver = new DongleDriver()

      const device = usbDeviceFactory()

      await expect(driver.initialise(device)).rejects.toThrow(
        new DriverStateError('Illegal state - device not opened'),
      )
    })

    it('fails if device has no config', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({
        opened: true,
        configuration: undefined,
      })
      await expect(driver.initialise(device)).rejects.toThrow(
        new DriverStateError('Illegal state - device has no configuration'),
      )
    })

    it('fails if device config has no IN endpoint', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({
        opened: true,
        configuration: {
          ...deviceConfig,
          interfaces: [
            {
              ...usbInterface,
              alternate: {
                ...usbInterface.alternate,
                endpoints: [
                  {
                    ...usbEndpoint,
                    direction: 'out',
                  } as USBEndpoint,
                ],
              },
            },
          ],
        },
      })
      await expect(driver.initialise(device)).rejects.toThrow(
        new DriverStateError('Illegal state - no IN endpoint found'),
      )
    })

    it('fails if device config has no out endpoint', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({
        opened: true,
        configuration: {
          ...deviceConfig,
          interfaces: [
            {
              ...usbInterface,
              alternate: {
                ...usbInterface.alternate,
                endpoints: [
                  {
                    ...usbEndpoint,
                    direction: 'in',
                  } as USBEndpoint,
                ],
              },
            },
          ],
        },
      })
      await expect(driver.initialise(device)).rejects.toThrow(
        new DriverStateError('Illegal state - no OUT endpoint found'),
      )
    })

    it('returns when device is initialised correctly', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({ opened: true })
      await driver.initialise(device)
      expect(device.selectConfiguration).toHaveBeenCalledTimes(1)
      expect(device.claimInterface).toHaveBeenCalledTimes(1)
      expect(device.claimInterface).toHaveBeenCalledWith(
        device.configuration?.interfaces[0].interfaceNumber,
      )
    })
  })

  describe('Start method', () => {
    it('fails if driver is not initialised with device', async () => {
      const driver = new DongleDriver()
      await expect(driver.start(DEFAULT_CONFIG)).rejects.toThrow(
        new DriverStateError('No device set - call initialise first'),
      )
    })

    it('returns without sending data to device if device is not open', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({ opened: true })
      await driver.initialise(device)
      Object.defineProperty(device, 'opened', { value: false })
      await driver.start(DEFAULT_CONFIG)
      expect(device.transferOut).toHaveBeenCalledTimes(0)
    })

    it('returns and sends open commands to device when device is open', async () => {
      jest.useFakeTimers()
      jest.spyOn(global, 'setTimeout')
      jest.spyOn(global, 'setInterval')

      const driver = new DongleDriver()
      const device = usbDeviceFactory({ opened: true })
      await driver.initialise(device)
      await driver.start(DEFAULT_CONFIG)

      expectMessageSent(
        device,
        new SendNumber(DEFAULT_CONFIG.dpi, FileAddress.DPI),
      )
      expectMessageSent(device, new SendOpen(DEFAULT_CONFIG))
      expectMessageSent(
        device,
        new SendBoolean(DEFAULT_CONFIG.nightMode, FileAddress.NIGHT_MODE),
      )
      expectMessageSent(
        device,
        new SendBoolean(false, FileAddress.HAND_DRIVE_MODE),
      )
      expectMessageSent(device, new SendBoolean(true, FileAddress.CHARGE_MODE))
      expectMessageSent(
        device,
        new SendString(DEFAULT_CONFIG.boxName, FileAddress.BOX_NAME),
      )
      expectMessageSent(device, new SendBoxSettings(DEFAULT_CONFIG))
      expectMessageSent(device, new SendCommand('wifiEnable'))
      expectMessageSent(device, new SendCommand('audioTransferOff'))

      jest.runOnlyPendingTimers()

      // delayed wifi connect and interval messages
      expectMessageSent(device, new SendCommand('wifiConnect'))
      expectMessageSent(device, new HeartBeat())
    })

    it('sets up correct timeouts and intervals when device is open', async () => {
      jest.useFakeTimers()
      jest.spyOn(global, 'setTimeout')
      jest.spyOn(global, 'setInterval')

      const driver = new DongleDriver()
      const device = usbDeviceFactory({ opened: true })
      await driver.initialise(device)
      await driver.start(DEFAULT_CONFIG)
      jest.runOnlyPendingTimers()
      // wifi connect
      expect(setTimeout).toHaveBeenCalledTimes(1)
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1000)
      // heartbeat interval
      expect(setInterval).toHaveBeenCalledTimes(1)
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), 2000)
    })
  })

  describe('Send method', () => {
    it('returns null if there is no sevice', async () => {
      const driver = new DongleDriver()
      const res = await driver.send(new SendCommand('frame'))
      expect(res).toBeNull()
    })

    it('returns null if device is not open', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({ opened: true })
      await driver.initialise(device)
      Object.defineProperty(device, 'opened', { value: false })
      const res = await driver.send(new SendCommand('frame'))
      expect(res).toBeNull()
      expect(device.transferOut).toHaveBeenCalledTimes(0)
    })

    it('returns true and calls transferOut with correct data if device is set and initialised', async () => {
      const driver = new DongleDriver()

      const device = usbDeviceFactory({
        opened: true,
        transferOut: jest
          .fn<() => Promise<USBOutTransferResult>>()
          .mockResolvedValue({
            status: 'ok',
            bytesWritten: 1,
          }),
      })

      await driver.initialise(device)
      const message = new SendCommand('frame')
      const res = await driver.send(message)
      expect(res).toBeTruthy()
      expect(device.transferOut).toHaveBeenCalledTimes(1)
      expect(device.transferOut).toBeCalledWith(1, message.serialise())
    })

    it('returns false and if transferOut indicates failure', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({
        opened: true,
        transferOut: jest
          .fn<() => Promise<USBOutTransferResult>>()
          .mockResolvedValue({
            status: 'stall',
            bytesWritten: 0,
          }),
      })

      await driver.initialise(device)
      const message = new SendCommand('frame')
      const res = await driver.send(message)
      expect(res).toBeFalsy()
      expect(device.transferOut).toHaveBeenCalledTimes(1)
      expect(device.transferOut).toBeCalledWith(1, message.serialise())
    })
  })

  describe('Close method', () => {
    it('returns if no device is set', async () => {
      const driver = new DongleDriver()
      await driver.close()
    })

    it('closes device when set', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({ opened: true })
      await driver.initialise(device)
      await driver.close()
      expect(device.close).toHaveBeenCalledTimes(1)
    })
  })
})
