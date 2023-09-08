import { AudioFormat } from '../modules/messages'
import { RingBuffer } from 'ringbuf.js'

const RENDER_QUANTUM_FRAMES = 128
const maxQuanta = 100 // ringbuffer size in audio blocks

export class PcmPlayer {
  protected sourceName: string = 'pcm-worklet-processor'

  private context: AudioContext
  private gainNode: GainNode
  private channels: number
  private worklet: AudioWorkletNode | undefined
  private buffers: ArrayBufferLike[] = []
  private sab = new SharedArrayBuffer(RENDER_QUANTUM_FRAMES * 4 * maxQuanta)
  private rb = new RingBuffer(this.sab, Int16Array)

  constructor(sampleRate: number, channels: number) {
    this.context = new AudioContext({
      latencyHint: 'playback',
      sampleRate,
    })
    this.gainNode = this.context.createGain()
    this.gainNode.gain.value = 1
    this.gainNode.connect(this.context.destination)
    this.channels = channels
  }

  private feedCore(buffer: ArrayBufferLike) {
    this.rb.push(new Int16Array(buffer))
  }

  feed(source: ArrayBufferLike) {
    if (this.worklet === undefined) {
      this.buffers.push(source)
      return
    }

    this.feedCore(source)
  }

  volume(volume: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = volume
    }
  }

  handlesFormat(format: AudioFormat) {
    return (
      this.context?.sampleRate === format.frequency &&
      this.channels === format.channel
    )
  }

  async start() {
    await this.context.audioWorklet.addModule(
      new URL('./audio.worklet.js', import.meta.url),
    )

    this.worklet = new AudioWorkletNode(this.context, this.sourceName, {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [this.channels],
      processorOptions: {
        sab: this.sab,
        channels: this.channels,
      },
    })
    this.worklet.connect(this.context.destination)

    for (const source of this.buffers) {
      this.feedCore(source)
    }
    this.buffers.length = 0
  }

  async stop() {
    if (this.context.state !== 'closed') {
      await this.context.close()
    }
    this.worklet?.disconnect(this.context.destination)
    this.worklet = undefined
  }
}
