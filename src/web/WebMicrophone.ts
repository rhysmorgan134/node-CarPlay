import { EventEmitter } from 'events'

export class WebMicrophone extends EventEmitter {
  private active = false
  private sampleRate = 16000
  private audioContext: AudioContext
  private inputStream: MediaStreamAudioSourceNode
  private recorder: AudioWorkletNode | null = null

  constructor(mediaStream: MediaStream) {
    super()
    const audioContext = new AudioContext({ sampleRate: this.sampleRate })
    this.inputStream = audioContext.createMediaStreamSource(mediaStream)
    this.audioContext = audioContext
    audioContext.audioWorklet
      .addModule(new URL('./recorder.worklet.js', import.meta.url))
      .then(() => {
        this.recorder = new AudioWorkletNode(audioContext, 'recorder.worklet')
        this.recorder.port.onmessage = this.handleData
      })
  }

  private handleData = async (e: { data: Int16Array }) => {
    if (!this.active) return
    this.emit('data', Buffer.from(e.data.buffer))
  }

  async start() {
    if (!this.recorder || this.active) return
    console.debug('starting mic')
    this.active = true
    this.inputStream
      .connect(this.recorder)
      .connect(this.audioContext.destination)
  }

  stop() {
    if (!this.recorder || !this.active) return
    console.debug('stopping mic')
    this.active = false
    this.inputStream.disconnect()
    this.recorder.disconnect()
  }

  destroy() {
    if (!this.recorder) return
    this.inputStream.disconnect()
    this.recorder.disconnect()
    this.recorder = null
    this.audioContext.close()
  }
}
