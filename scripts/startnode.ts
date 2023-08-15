import { DongleConfig } from '../src/modules/IDongleDriver'
import CarplayWS from '../src/node/CarplayWS'
const config: DongleConfig = {
  dpi: 160,
  nightMode: false,
  hand: 0,
  boxName: 'nodePlay',
  width: 800,
  height: 600,
  fps: 20,
}

const carplay = new CarplayWS(config)
carplay.start()
