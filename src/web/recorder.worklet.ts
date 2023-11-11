class RecorderProcessor extends AudioWorkletProcessor {
  bufferSize = 2048
  _bytesWritten = 0
  _buffer = new Float32Array(this.bufferSize)
  _outPort: MessagePort | undefined

  constructor() {
    super()
    this.initBuffer()
    this.port.onmessage = ev => {
      this._outPort = ev.data
    }
  }

  private floatTo16BitPCM(input: Float32Array) {
    let i = input.length
    const output = new Int16Array(i)
    while (i--) {
      const s = Math.max(-1, Math.min(1, input[i]))
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return output
  }

  initBuffer() {
    this._bytesWritten = 0
  }

  isBufferEmpty() {
    return this._bytesWritten === 0
  }

  isBufferFull() {
    return this._bytesWritten === this.bufferSize
  }

  /**
   * @param {Float32Array[][]} inputs
   * @returns {boolean}
   */
  process(inputs: Float32Array[][]) {
    this.append(inputs[0][0])

    return true
  }

  /**
   *
   * @param {Float32Array} channelData
   */
  append(channelData: Float32Array) {
    if (this.isBufferFull()) {
      this.flush()
    }

    if (!channelData) return

    for (let i = 0; i < channelData.length; i++) {
      this._buffer[this._bytesWritten++] = channelData[i]
    }
  }

  flush() {
    const data = this.floatTo16BitPCM(
      this._bytesWritten < this.bufferSize
        ? this._buffer.slice(0, this._bytesWritten)
        : this._buffer,
    )
    if (this._outPort) {
      this._outPort.postMessage(data, [data.buffer])
    }
    this.initBuffer()
  }
}

registerProcessor('recorder.worklet', RecorderProcessor)
