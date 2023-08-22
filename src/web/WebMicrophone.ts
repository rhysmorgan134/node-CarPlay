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

export type MicrophoneConfig = {
  sampleRate: number
  channels: number
  bufferSize: number
}

export class WebMicrophone extends EventEmitter {
  private active = false
  private bufferSize = 2048
  // Config values compatible with CarPlay dongle input
  // 16 bit PCM mono audio at 16000 sample rate
  private sampleRate = 16000
  private channels = 1
  private audioContext: AudioContext
  // TODO: migrate to AudioWorklet
  private recorder: ScriptProcessorNode

  constructor(mediaStream: MediaStream) {
    super()
    const audioContext = new AudioContext({ sampleRate: this.sampleRate })
    const micStream = audioContext.createMediaStreamSource(mediaStream)
    const recorder = audioContext.createScriptProcessor.call(
      audioContext,
      this.bufferSize,
      this.channels,
      this.channels,
    )

    recorder.onaudioprocess = this.handleData
    micStream.connect(recorder)
    this.audioContext = audioContext
    this.recorder = recorder
  }

  private handleData = async (ev: AudioProcessingEvent) => {
    if (!this.active) return
    const samples = ev.inputBuffer.getChannelData(0)

    // we clone the samples a buffer is re-used
    const pcmData = floatTo16BitPCM(new Float32Array(samples))

    this.emit('data', Buffer.from(pcmData.buffer))
  }

  async start() {
    console.log('starting mic')
    this.active = true
    this.recorder.connect(this.audioContext.destination)
  }

  stop() {
    console.log('stopping mic')
    this.active = false
    this.recorder.disconnect()
  }
}
