export const usbEndpoint: Partial<USBEndpoint> = {
  endpointNumber: 1,
  type: 'bulk',
  packetSize: 512,
}

export const usbInterface: USBInterface = {
  interfaceNumber: 0,
  claimed: false,
  alternates: [],
  alternate: {
    alternateSetting: 0,
    interfaceClass: 0,
    interfaceProtocol: 0,
    interfaceSubclass: 0,
    endpoints: [
      {
        ...usbEndpoint,
        direction: 'in',
      } as USBEndpoint,
      {
        ...usbEndpoint,
        direction: 'out',
      } as USBEndpoint,
    ],
  },
}

export const deviceConfig: USBConfiguration = {
  configurationValue: 1,
  interfaces: [usbInterface],
}

export const usbDeviceFactory = (
  devicePartial: Partial<USBDevice> = {},
): USBDevice => {
  return {
    opened: false,
    usbVersionMajor: 2,
    usbVersionMinor: 0,
    usbVersionSubminor: 0,
    deviceClass: 0xff,
    deviceSubclass: 0xff,
    deviceProtocol: 0xff,
    vendorId: 0x1234,
    productId: 0xabcd,
    deviceVersionMajor: 1,
    deviceVersionMinor: 0,
    deviceVersionSubminor: 0,
    configurations: [deviceConfig],
    configuration: deviceConfig,
    open: jest.fn(),
    close: jest.fn(),
    forget: jest.fn(),
    selectConfiguration: jest.fn(),
    claimInterface: jest.fn(),
    releaseInterface: jest.fn(),
    selectAlternateInterface: jest.fn(),
    controlTransferIn: jest.fn(),
    controlTransferOut: jest.fn(),
    clearHalt: jest.fn(),
    transferIn: jest.fn(),
    transferOut: jest.fn(),
    isochronousTransferIn: jest.fn(),
    isochronousTransferOut: jest.fn(),
    reset: jest.fn(),
    ...devicePartial,
  }
}
