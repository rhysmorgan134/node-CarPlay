import { ChildProcess, spawn } from 'child_process'
import { AudioData, decodeTypeMap } from '../modules'

const AUDIO_PROCESS_RETRY_INTERVAL_MS = 5000

export default class NodeSpeaker {
  private _cantPlayAudio = false
  private _playerByDecodeType: Map<number, ChildProcess> = new Map()

  private getPlayer(decodeType: number) {
    let player = this._playerByDecodeType.get(decodeType)
    if (player == null) {
      if (this._cantPlayAudio) {
        return null
      }

      const format = decodeTypeMap[decodeType]

      player = spawn('ffplay', [
        '-f',
        `s${format.bitrate}le`,
        `-ar`,
        `${format.frequency}`,
        `-ac`,
        `${format.channel}`,
        '-nodisp',
        `-`,
      ])

      this._playerByDecodeType.set(decodeType, player)

      player.on('exit', code => {
        this._playerByDecodeType.delete(decodeType)

        console.log(`Child process exited with code ${code}`)
      })

      player.on('error', err => {
        console.error('Failed to start audio process.', err)

        if (!this._cantPlayAudio) {
          // The usecase here is when the user does not have ffplay installed.
          // We don't want to flood the console with errors, and we don't want
          // to retry to spawn the process over and over again.
          this._cantPlayAudio = true
          setTimeout(() => {
            this._cantPlayAudio = false
          }, AUDIO_PROCESS_RETRY_INTERVAL_MS)
        }
      })
    }

    return player
  }

  public feed(message: AudioData) {
    const { data, decodeType } = message

    if (data != null && decodeType != null) {
      const player = this.getPlayer(decodeType)

      player?.stdin?.write(Buffer.from(data.buffer))
    }
  }
}
