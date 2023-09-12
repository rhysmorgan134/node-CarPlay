import { webusb } from 'usb'
import NodeMicrophone from './NodeMicrophone'
import {
  AudioData,
  MediaData,
  Message,
  Plugged,
  SendAudio,
  SendCarPlay,
  SendTouch,
  Unplugged,
  VideoData,
  DongleDriver,
  DongleConfig,
  DEFAULT_CONFIG,
  Key,
  CarPlay,
  AudioCommand,
} from '../modules'

const USB_WAIT_PERIOD_MS = 500
const USB_WAIT_RESTART_MS = 3000

export type CarplayMessage =
  | { type: 'plugged'; message?: undefined }
  | { type: 'unplugged'; message?: undefined }
  | { type: 'audio'; message: AudioData }
  | { type: 'video'; message: VideoData }
  | { type: 'media'; message: MediaData }
  | { type: 'carplay'; message: CarPlay }

export default class CarplayNode {
  private _pairTimeout: NodeJS.Timeout | null = null
  private _config: DongleConfig
  public dongleDriver: DongleDriver

  constructor(config: DongleConfig = DEFAULT_CONFIG) {
    this._config = config
    const mic = new NodeMicrophone()
    const driver = new DongleDriver()
    mic.on('data', data => {
      driver.send(new SendAudio(data))
    })
    driver.on('message', (message: Message) => {
      if (message instanceof Plugged) {
        this.onmessage?.({ type: 'plugged' })
      } else if (message instanceof Unplugged) {
        this.onmessage?.({ type: 'unplugged' })
      } else if (message instanceof VideoData) {
        this.onmessage?.({ type: 'video', message })
      } else if (message instanceof AudioData) {
        this.onmessage?.({ type: 'audio', message })
      } else if (message instanceof MediaData) {
        this.onmessage?.({ type: 'media', message })
      } else if (message instanceof CarPlay) {
        this.onmessage?.({ type: 'carplay', message })
      }

      // Trigger internal event logic
      if (message instanceof AudioData && message.command != null) {
        switch (message.command) {
          case AudioCommand.AudioSiriStart:
          case AudioCommand.AudioPhonecallStart:
            mic.start()
            break
          case AudioCommand.AudioSiriStop:
          case AudioCommand.AudioPhonecallStop:
            mic.stop()
            break
        }
      }

      if (
        (message instanceof Plugged ||
          message instanceof AudioData ||
          message instanceof VideoData ||
          message instanceof MediaData) &&
        this._pairTimeout != null
      ) {
        clearTimeout(this._pairTimeout)
        this._pairTimeout = null
      }
    })
    this.dongleDriver = driver
  }

  private async findDevice() {
    let device: USBDevice | null = null

    while (device == null) {
      try {
        device = await webusb.requestDevice({
          filters: DongleDriver.knownDevices,
        })
      } catch (err) {
        // ^ requestDevice throws an error when no device is found, so keep retrying
      }

      if (device == null) {
        console.log('No device found, retrying')
        await new Promise(resolve => setTimeout(resolve, USB_WAIT_PERIOD_MS))
      }
    }

    return device
  }

  start = async () => {
    // Find device to "reset" first
    let device = await this.findDevice()
    await device.open()
    await device.reset()
    await device.close()
    // Resetting the device causes an unplug event in node-usb
    // so subsequent writes fail with LIBUSB_ERROR_NO_DEVICE
    // or LIBUSB_TRANSFER_ERROR

    console.log('Reset device, finding again...')
    await new Promise(resolve => setTimeout(resolve, USB_WAIT_RESTART_MS))
    // ^ Device disappears after reset for 1-3 seconds

    device = await this.findDevice()
    console.log('found & opening')

    await device.open()

    let initialised = false
    try {
      const { initialise, start, send } = this.dongleDriver
      await initialise(device)
      await start(this._config)
      this._pairTimeout = setTimeout(() => {
        this._pairTimeout = null

        console.debug('no device, sending pair')
        send(new SendCarPlay('wifiPair'))
      }, 15000)
      initialised = true
    } catch (err) {
      console.error(err)
    }

    if (!initialised) {
      console.log('carplay not initialised, retrying in 2s')
      setTimeout(this.start, 2000)
    }
  }

  sendKey = (action: Key) => {
    this.dongleDriver.send(new SendCarPlay(action))
  }
  sendTouch = ({ type, x, y }: { type: number; x: number; y: number }) => {
    this.dongleDriver.send(new SendTouch(x, y, type))
  }

  public onmessage: ((ev: CarplayMessage) => void) | null = null
}
