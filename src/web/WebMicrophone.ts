import { EventEmitter } from 'events'

function floatTo16BitPCM(input: Float32Array) {
  let i = input.length
  const output = new Int16Array(i)
  while (i--) {
    const s = Math.max(-1, Math.min(1, input[i]))
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return output
}

export class WebMicrophone extends EventEmitter {
  private active = false
  private bufferSize = 2048
  // Config values compatible with CarPlay dongle input
  // 16 bit PCM mono audio at 16000 sample rate
  private sampleRate = 16000
  private channels = 1
  private audioContext: AudioContext
  private inputStream: MediaStreamAudioSourceNode
  // TODO: migrate to AudioWorklet
  private recorder: ScriptProcessorNode

  constructor(mediaStream: MediaStream) {
    super()
    const audioContext = new AudioContext({ sampleRate: this.sampleRate })
    this.inputStream = audioContext.createMediaStreamSource(mediaStream)
    const recorder = audioContext.createScriptProcessor.call(
      audioContext,
      this.bufferSize,
      this.channels,
      this.channels,
    )

    recorder.onaudioprocess = this.handleData
    this.audioContext = audioContext
    this.recorder = recorder
  }

  private handleData = async (ev: AudioProcessingEvent) => {
    if (!this.active) return
    const samples = ev.inputBuffer.getChannelData(0)
    const pcmData = floatTo16BitPCM(samples)
    this.emit('data', Buffer.from(pcmData.buffer))
  }

  async start() {
    console.debug('starting mic')
    this.active = true
    this.inputStream.connect(this.recorder)
    this.recorder.connect(this.audioContext.destination)
  }

  stop() {
    console.debug('stopping mic')
    this.active = false
    this.inputStream.disconnect()
    this.recorder.disconnect()
  }

  destroy() {
    this.inputStream.disconnect()
    this.recorder.disconnect()
    this.audioContext.close()
  }
}
