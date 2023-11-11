import {
  DongleConfig,
  TouchAction,
  CarplayMessage,
  AudioFormat,
  AudioData,
} from 'node-carplay/web'

export type CarplayWorkerMessage =
  | { data: CarplayMessage }
  | { data: { type: 'getAudioPlayer'; message: AudioData } }

export type InitialisePayload = {
  videoPort: MessagePort
  microphonePort: MessagePort
}

export type AudioPlayerPayload = {
  sab: SharedArrayBuffer
  format: AudioFormat
  audioType: number
}

export type StartPayload = {
  config: Partial<DongleConfig>
}

export type Command =
  | { type: 'frame' }
  | { type: 'stop' }
  | { type: 'initialise'; payload: InitialisePayload }
  | { type: 'audioPlayer'; payload: AudioPlayerPayload }
  | { type: 'start'; payload: StartPayload }
  | { type: 'touch'; payload: { x: number; y: number; action: TouchAction } }

export interface CarPlayWorker
  extends Omit<Worker, 'postMessage' | 'onmessage'> {
  postMessage(message: Command, transfer?: Transferable[]): void
  onmessage: ((this: Worker, ev: CarplayWorkerMessage) => any) | null
}
