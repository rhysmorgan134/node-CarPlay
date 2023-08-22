import {
  AudioData,
  DongleConfig,
  MediaData,
  TouchAction,
  VideoData,
} from 'node-carplay/dist/web'

export type CarplayWorkerMessage =
  | { data: { type: 'plugged' } }
  | { data: { type: 'unplugged' } }
  | { data: { type: 'audio'; message: AudioData } }
  | { data: { type: 'video'; message: VideoData } }
  | { data: { type: 'media'; message: MediaData } }

export type Command =
  | { type: 'stop' }
  | { type: 'start'; payload: DongleConfig }
  | { type: 'touch'; payload: { x: number; y: number; action: TouchAction } }
  | { type: 'microphoneInput'; payload: Buffer }

export interface CarPlayWorker
  extends Omit<Worker, 'postMessage' | 'onmessage'> {
  postMessage(message: Command): void
  onmessage: ((this: Worker, ev: CarplayWorkerMessage) => any) | null
}
