import { DongleConfig, TouchAction, CarplayMessage } from 'node-carplay/web'

export type CarplayWorkerMessage = { data: CarplayMessage }

export type StartPayload = {
  config: Partial<DongleConfig>
  videoPort: MessagePort
}

export type Command =
  | { type: 'frame' }
  | { type: 'stop' }
  | { type: 'start'; payload: StartPayload }
  | { type: 'touch'; payload: { x: number; y: number; action: TouchAction } }
  | { type: 'microphoneInput'; payload: Int16Array }

export interface CarPlayWorker
  extends Omit<Worker, 'postMessage' | 'onmessage'> {
  postMessage(message: Command, transfer?: Transferable[]): void
  onmessage: ((this: Worker, ev: CarplayWorkerMessage) => any) | null
}
