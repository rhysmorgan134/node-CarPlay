import type { DongleConfig } from 'node-carplay/node'

export const config: Partial<DongleConfig> & {
  width: DongleConfig['width']
  height: DongleConfig['height']
} = {
  audioTransferMode: true,

  // NOTE: Change the following for your usecase
  fps: 60,
  width: 1024,
  height: 600,
}
