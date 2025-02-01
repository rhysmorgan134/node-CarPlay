import { DongleConfig } from '../src/modules/DongleDriver.js'
import { PhoneType } from '../src/modules/index.js'
import CarplayNode from '../src/node/CarplayNode.js'
const config: DongleConfig = {
  dpi: 160,
  nightMode: false,
  hand: 0,
  boxName: 'nodePlay',
  width: 800,
  height: 600,
  fps: 20,
  mediaDelay: 300,
  audioTransferMode: false,
  format: 5,
  iBoxVersion: 2,
  packetMax: 49152,
  phoneWorkMode: 2,
  wifiType: '5ghz',
  micType: 'os',
  phoneConfig: {
    [PhoneType.CarPlay]: {
      frameInterval: 5000,
    },
    [PhoneType.AndroidAuto]: {
      frameInterval: null,
    },
  },
}

const carplay = new CarplayNode(config)
carplay.start()
