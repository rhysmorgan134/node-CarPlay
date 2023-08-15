import { EventEmitter } from 'events'
import IMicrophone from '../modules/IMicrophone'

export class WebMicrophone extends EventEmitter implements IMicrophone {
  private _mediaRecorder: MediaRecorder
  private _timeout: NodeJS.Timeout | null = null

  constructor(recorder: MediaRecorder) {
    super()
    this._mediaRecorder = recorder
    this._mediaRecorder.ondataavailable = this.handleData
  }

  handleData = async (ev: BlobEvent) => {
    if (ev.data.size > 0) {
      const arrayBuffer = await ev.data.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      this.emit('data', buffer)
    }
  }

  async start() {
    console.log('starting mic')
    this._mediaRecorder.start()
    this._timeout = setTimeout(() => {
      this.stop()
    }, 10000)
  }

  stop() {
    if (this._timeout) {
      clearTimeout(this._timeout)
    }
    this._mediaRecorder.stop()
  }
}
