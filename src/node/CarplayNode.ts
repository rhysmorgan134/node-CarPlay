import { webusb } from 'usb'
import NodeMicrophone from './NodeMicrophone.js'
import {
  AudioData,
  MediaData,
  Message,
  Plugged,
  SendAudio,
  SendCommand,
  SendTouch,
  Unplugged,
  VideoData,
  DongleDriver,
  DongleConfig,
  DEFAULT_CONFIG,
  CommandValue,
  Command,
  AudioCommand,
} from '../modules/index.js'

const USB_WAIT_PERIOD_MS = 3000

export type CarplayMessage =
  | { type: 'plugged'; message?: undefined }
  | { type: 'unplugged'; message?: undefined }
  | { type: 'failure'; message?: undefined }
  | { type: 'audio'; message: AudioData }
  | { type: 'video'; message: VideoData }
  | { type: 'media'; message: MediaData }
  | { type: 'command'; message: Command }

export default class CarplayNode {
  private _pairTimeout: NodeJS.Timeout | null = null
  private _frameInterval: ReturnType<typeof setInterval> | null = null
  private _config: DongleConfig
  public dongleDriver: DongleDriver

  constructor(config: Partial<DongleConfig>) {
    this._config = Object.assign({}, DEFAULT_CONFIG, config)
    const mic = new NodeMicrophone()
    const driver = new DongleDriver()
    mic.on('data', data => {
      driver.send(new SendAudio(data))
    })
    driver.on('message', (message: Message) => {
      if (message instanceof Plugged) {
        this.clearPairTimeout()
        this.clearFrameInterval()
        const phoneTypeConfg = this._config.phoneConfig?.[message.phoneType]
        if (phoneTypeConfg?.frameInterval) {
          this._frameInterval = setInterval(
            () => {
              this.dongleDriver.send(new SendCommand('frame'))
            },
            phoneTypeConfg?.frameInterval,
          )
        }
        this.onmessage?.({ type: 'plugged' })
      } else if (message instanceof Unplugged) {
        this.onmessage?.({ type: 'unplugged' })
      } else if (message instanceof VideoData) {
        this.clearPairTimeout()
        this.onmessage?.({ type: 'video', message })
      } else if (message instanceof AudioData) {
        this.clearPairTimeout()
        this.onmessage?.({ type: 'audio', message })
      } else if (message instanceof MediaData) {
        this.clearPairTimeout()
        this.onmessage?.({ type: 'media', message })
      } else if (message instanceof Command) {
        this.onmessage?.({ type: 'command', message })
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
    })
    driver.on('failure', () => {
      this.onmessage?.({ type: 'failure' })
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
    await new Promise(resolve => setTimeout(resolve, USB_WAIT_PERIOD_MS))
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
        console.debug('no device, sending pair')
        send(new SendCommand('wifiPair'))
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

  stop = async () => {
    try {
      this.clearPairTimeout()
      this.clearFrameInterval()
      await this.dongleDriver.close()
    } catch (err) {
      console.error(err)
    }
  }

  private clearPairTimeout() {
    if (this._pairTimeout) {
      clearTimeout(this._pairTimeout)
      this._pairTimeout = null
    }
  }

  private clearFrameInterval() {
    if (this._frameInterval) {
      clearInterval(this._frameInterval)
      this._pairTimeout = null
    }
  }

  sendKey = (action: CommandValue) => {
    this.dongleDriver.send(new SendCommand(action))
  }
  sendTouch = ({ type, x, y }: { type: number; x: number; y: number }) => {
    this.dongleDriver.send(new SendTouch(x, y, type))
  }

  public onmessage: ((ev: CarplayMessage) => void) | null = null
}
