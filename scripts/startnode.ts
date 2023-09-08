import { DongleConfig } from '../src/modules/DongleDriver'
import CarplayNode from '../src/node/CarplayNode'
const config: DongleConfig = {
  dpi: 160,
  nightMode: false,
  hand: 0,
  boxName: 'nodePlay',
  width: 800,
  height: 600,
  fps: 20,
  mediaDelay: 300,
  audioTranferMode: false,
}

const carplay = new CarplayNode(config)
carplay.start()
