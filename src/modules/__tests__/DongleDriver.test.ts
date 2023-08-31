import { DongleDriver, DEFAULT_CONFIG, DriverStateError } from '../DongleDriver'
import { MessageHeader, MessageType, SendCarPlay } from '../messages'
import {
  usbDeviceFactory,
  deviceConfig,
  usbInterface,
  usbEndpoint,
} from './mocks/usbMocks'

describe('DongleDriver', () => {
  describe('Initialise method', () => {
    it('returns if device is already open', async () => {
      const driver = new DongleDriver()

      const device = usbDeviceFactory({ opened: true })
      await driver.initialise(device)

      const device2 = usbDeviceFactory({ opened: true })
      await driver.initialise(device2)

      expect(device.open).toHaveBeenCalledTimes(1)
      expect(device2.open).toHaveBeenCalledTimes(0)
    })

    it('fails if device has no config', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({ configuration: undefined })
      await expect(driver.initialise(device)).rejects.toThrow(
        new DriverStateError('Illegal state - device has no configuration'),
      )
    })

    it('fails if device config has no IN endpoint', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({
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
      const device = usbDeviceFactory()
      await driver.initialise(device)
      expect(device.selectConfiguration).toHaveBeenCalledTimes(1)
      expect(device.claimInterface).toHaveBeenCalledTimes(1)
      expect(device.claimInterface).toHaveBeenCalledWith(
        device.configuration?.interfaces[0].interfaceNumber,
      )
      expect(device.open).toHaveBeenCalledTimes(1)
    })
  })

  describe('Open method', () => {
    it('fails if driver is not initialised with device', async () => {
      const driver = new DongleDriver()
      await expect(driver.open(DEFAULT_CONFIG)).rejects.toThrow(
        new DriverStateError('No device set - call initialise first'),
      )
    })

    it('returns without sending data to device if device is not open', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({ opened: false })
      await driver.initialise(device)
      await driver.open(DEFAULT_CONFIG)
      expect(device.transferOut).toHaveBeenCalledTimes(0)
    })

    it('returns and send open command to device when device is open', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({ opened: true })
      await driver.initialise(device)
      await driver.open(DEFAULT_CONFIG)
      expect(device.transferOut).toHaveBeenCalledTimes(7)
    })
  })

  describe('Send method', () => {
    it('returns null if there is no sevice', async () => {
      const driver = new DongleDriver()
      const res = await driver.send(new SendCarPlay('frame'))
      expect(res).toBeNull()
    })

    it('returns null if device is not open', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({ opened: false })
      await driver.initialise(device)
      const res = await driver.send(new SendCarPlay('frame'))
      expect(res).toBeNull()
      expect(device.transferOut).toHaveBeenCalledTimes(0)
    })

    it('returns true and calls transferOut with correct data if device is set and initialised', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({
        opened: true,
        transferOut: jest.fn().mockResolvedValue({
          status: 'ok',
        }),
      })

      await driver.initialise(device)
      const message = new SendCarPlay('frame')
      const res = await driver.send(message)
      expect(res).toBeTruthy()
      expect(device.transferOut).toHaveBeenCalledTimes(1)
      expect(device.transferOut).toBeCalledWith(
        1,
        Buffer.concat(message.serialise()),
      )
    })

    it('returns false and if transferOut indicates failure', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory({
        opened: true,
        transferOut: jest.fn().mockResolvedValue({
          status: 'stall',
        }),
      })

      await driver.initialise(device)
      const message = new SendCarPlay('frame')
      const res = await driver.send(message)
      expect(res).toBeFalsy()
      expect(device.transferOut).toHaveBeenCalledTimes(1)
      expect(device.transferOut).toBeCalledWith(
        1,
        Buffer.concat(message.serialise()),
      )
    })
  })

  describe('Close method', () => {
    it('returns if no device is set', async () => {
      const driver = new DongleDriver()
      await driver.close()
    })

    it('closes device when set', async () => {
      const driver = new DongleDriver()
      const device = usbDeviceFactory()
      await driver.initialise(device)
      await driver.close()
      expect(device.close).toHaveBeenCalledTimes(1)
    })
  })
})
