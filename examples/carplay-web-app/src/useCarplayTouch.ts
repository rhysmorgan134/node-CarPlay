import { useCallback } from 'react'
import { MultiTouchAction } from 'node-carplay/web'
import { CarPlayWorker } from './worker/types'

const pointerCache = new Map<
  number,
  { x: number; y: number; action: MultiTouchAction }
>()

export const useCarplayTouch = (
  worker: CarPlayWorker,
  width: number,
  height: number,
) => {
  const sendTouchEvent: React.PointerEventHandler<HTMLDivElement> = useCallback(
    e => {
      let action = MultiTouchAction.Up
      if (e.type === 'pointerdown') {
        action = MultiTouchAction.Down
      } else if (pointerCache.has(e.pointerId)) {
        switch (e.type) {
          case 'pointermove':
            action = MultiTouchAction.Move
            break
          case 'pointerup':
          case 'pointercancel':
          case 'pointerout':
            action = MultiTouchAction.Up
            break
        }
      } else {
        return
      }

      const { offsetX: x, offsetY: y } = e.nativeEvent
      pointerCache.set(e.pointerId, { x: x / width, y: y / height, action })

      worker.postMessage({
        type: 'touch',
        payload: [...pointerCache.values()],
      })

      if (action === MultiTouchAction.Up) {
        pointerCache.delete(e.pointerId)
      }
    },
    [worker, width, height],
  )

  return sendTouchEvent
}
