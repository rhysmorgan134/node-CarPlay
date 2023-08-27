import { EventEmitter } from 'events'
import Mic from 'node-microphone'

export default class NodeMicrophone extends EventEmitter {
  private _active: boolean
  private _mic: Mic
  private _timeout: NodeJS.Timeout | null = null

  constructor() {
    super()
    this._active = false
    this._mic = new Mic()
    const micEmitter = this._mic as unknown as EventEmitter
    micEmitter.on('data', data => {
      if (this._active) {
        this.emit('data', data)
      }
    })
    micEmitter.on('info', info => {
      console.error(info)
    })

    micEmitter.on('error', error => {
      console.error(error)
    })
  }

  start() {
    console.debug('starting mic')
    this._mic.startRecording()
    this._active = true
    this._timeout = setTimeout(() => {
      this.stop()
    }, 10000)
  }

  stop() {
    this._active = false
    if (this._timeout) {
      clearTimeout(this._timeout)
    }
    this._mic.stopRecording()
  }
}
