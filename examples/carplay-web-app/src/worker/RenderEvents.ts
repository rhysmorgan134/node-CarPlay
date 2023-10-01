import { StatusUpdate } from './Render.worker'

export type WorkerEventType = 'init' | 'frame' | 'status' | 'renderDone'

export interface WorkerEvent {
  type: WorkerEventType
}

export class StatusEvent implements WorkerEvent {
  type: WorkerEventType = 'status'

  constructor(public status: StatusUpdate) {}
}

export class RenderEvent implements WorkerEvent {
  type: WorkerEventType = 'frame'

  constructor(public frameData: ArrayBuffer) {}
}

export class InitRenderEvent implements WorkerEvent {
  type: WorkerEventType = 'init'

  constructor(public canvas: OffscreenCanvas) {}
}

export class RenderDomeEvent implements WorkerEvent {
  type: WorkerEventType = 'renderDone'
}

export class StatusRenderEvent implements WorkerEvent {
  type: WorkerEventType = 'status'

  constructor(public status: StatusUpdate) {}
}
