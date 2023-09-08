// WebAudio's render quantum size.
const RENDER_QUANTUM_FRAMES = 128

/**
 * A Reader class used by this worklet to read from a Adapted from a SharedArrayBuffer written to by ringbuf.js on the main thread, Adapted from https://github.com/padenot/ringbuf.js
 * MPL-2.0 License (see RingBuffer_LICENSE.txt)
 *
 * @author padenot
 */
class RingBuffReader {
  private storage: Int16Array
  private writePointer: Uint32Array
  private readPointer: Uint32Array

  constructor(buffer: SharedArrayBuffer) {
    const storageSize = (buffer.byteLength - 8) / Int16Array.BYTES_PER_ELEMENT
    this.storage = new Int16Array(buffer, 8, storageSize)
    // matching capacity and R/W pointers defined in ringbuf.js
    this.writePointer = new Uint32Array(buffer, 0, 1)
    this.readPointer = new Uint32Array(buffer, 4, 1)
  }

  readTo(array: TypedArray): number {
    const { readPos, available } = this.getReadInfo()
    if (available === 0) {
      return 0
    }

    const readLength = Math.min(available, array.length)

    const first = Math.min(this.storage.length - readPos, readLength)
    const second = readLength - first

    this.copy(this.storage, readPos, array, 0, first)
    this.copy(this.storage, 0, array, first, second)

    Atomics.store(
      this.readPointer,
      0,
      (readPos + readLength) % this.storage.length,
    )

    return readLength
  }

  getReadInfo() {
    const readPos = Atomics.load(this.readPointer, 0)
    const writePos = Atomics.load(this.writePointer, 0)
    const available =
      (writePos + this.storage.length - readPos) % this.storage.length
    return {
      readPos,
      writePos,
      available,
    }
  }

  private copy(
    input: TypedArray,
    offset_input: number,
    output: TypedArray,
    offset_output: number,
    size: number,
  ) {
    for (let i = 0; i < size; i++) {
      output[offset_output + i] = input[offset_input + i]
    }
  }
}

class PCMWorkletProcessor extends AudioWorkletProcessor {
  private underflowing = false
  private reader: RingBuffReader
  private readerOutput: Int16Array
  private channels: number

  constructor(options: {
    processorOptions: { sab: SharedArrayBuffer; channels: number }
  }) {
    super()
    const { sab, channels } = options.processorOptions
    this.channels = channels
    this.reader = new RingBuffReader(sab)
    this.readerOutput = new Int16Array(RENDER_QUANTUM_FRAMES * channels)
  }

  process(_: Float32Array[][], outputs: Float32Array[][]) {
    const outputChannels = outputs[0]

    const { available } = this.reader.getReadInfo()
    if (available < this.readerOutput.length) {
      if (!this.underflowing) {
        console.log('UNDERFLOW', available)
      }
      this.underflowing = true
      return true
    }

    this.reader.readTo(this.readerOutput)

    // play interleaved audio as it comes from the dongle by splitting it across the channels
    for (let i = 0; i < this.readerOutput.length; i++) {
      for (let channel = 0; channel < this.channels; channel++) {
        const pcm16Value = this.readerOutput[2 * i + channel]
        const float32Value = pcm16Value / 32768
        outputChannels[channel][i] = float32Value
      }
    }

    this.underflowing = false
    return true
  }
}

registerProcessor('pcm-worklet-processor', PCMWorkletProcessor)
