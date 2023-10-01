import fs from 'fs'
import { webusb } from 'usb'
import {
  SendFile,
  FileAddress,
  DongleDriver,
  SendIconConfig,
} from '../src/modules/index.js'
import process from 'process'

const { knownDevices } = DongleDriver

const driver = new DongleDriver()

const config = async () => {
  const device = await webusb.requestDevice({ filters: knownDevices })
  if (!device) {
    console.log('No device found - Connect dongle to USB and try again')
  } else {
    await device.open()
    await driver.initialise(device)

    const iconLabel = process.argv[2]
    if (iconLabel) {
      console.log(`Setting custom icon label ${iconLabel}`)
      await driver.send(new SendIconConfig({ label: iconLabel }))
    }

    const iconPath = process.argv[3]
    if (fs.existsSync(iconPath)) {
      console.log('Found Icon - Copying to dongle')
      const iconBuff = fs.readFileSync(iconPath)
      await driver.send(new SendFile(iconBuff, FileAddress.ICON_120))
      await driver.send(new SendFile(iconBuff, FileAddress.ICON_180))
      await driver.send(new SendFile(iconBuff, FileAddress.ICON_250))
      console.log('Done copying Icon')
    }

    await driver.close()
  }
}

config()
