// Based on https://github.com/codewithpassion/foxglove-studio-h264-extension/tree/main
// MIT License
import { Bitstream, NALUStream, SPS } from './h264-utils'

type GetNaluResult = {
  type: number
  nalu: { rawNalu: Uint8Array; nalu: Uint8Array }
}[]

const NaluTypes = {
  NDR: 1,
  IDR: 5,
  SEI: 6,
  SPS: 7,
  PPS: 8,
  AUD: 9,
}

function getNalus(buffer: Uint8Array): GetNaluResult {
  const stream = new NALUStream(buffer, { type: 'annexB' })
  const result: GetNaluResult = []

  for (const nalu of stream.nalus()) {
    if (nalu?.nalu) {
      const bitstream = new Bitstream(nalu.nalu)
      bitstream.seek(3)
      const nal_unit_type = bitstream.u(5)
      if (nal_unit_type !== undefined) {
        result.push({ type: nal_unit_type, nalu })
      }
    }
  }

  return result
}

function isKeyFrame(frameData: Uint8Array): boolean {
  const stream = new NALUStream(frameData, { type: 'annexB' })
  for (const nalu of stream.nalus()) {
    if (nalu?.nalu) {
      const bitstream = new Bitstream(nalu.nalu)
      bitstream.seek(3)
      const nal_unit_type = bitstream.u(5)
      if (nal_unit_type === NaluTypes.IDR) {
        return true
      }
    }
  }
  return false
}

function getDecoderConfig(frameData: Uint8Array): VideoDecoderConfig | null {
  const nalus = getNalus(frameData)
  const spsNalu = nalus.find(n => n.type === NaluTypes.SPS)
  if (spsNalu) {
    const sps = new SPS(spsNalu.nalu.nalu)
    const decoderConfig: VideoDecoderConfig = {
      codec: sps.MIME,
      codedHeight: sps.picHeight,
      codedWidth: sps.picWidth,
      hardwareAcceleration: 'prefer-hardware',
    }
    return decoderConfig
  }
  return null
}

export { getDecoderConfig, isKeyFrame }
