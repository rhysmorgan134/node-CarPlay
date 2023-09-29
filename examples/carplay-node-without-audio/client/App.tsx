import { useCallback, useEffect, useState, useRef } from 'react'
import JMuxer from 'jmuxer'
import { TouchAction } from 'node-carplay/web'

import { config } from './config.js'

const RETRY_DELAY_MS = 6000
// ^ Note: This retry delay is lower than carplay-web-app
// because the dongle is handled on server side, and it is
// higher than 5 seconds because that's the default "frame"
// time.

function App() {
  const [pointerdown, setPointerDown] = useState(false)

  const connectionRef = useRef<WebSocket | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    if (connectionRef.current) {
      return
    }
    const jmuxer = new JMuxer({
      node: 'video',
      mode: 'video',
      fps: config.fps,
      flushingTime: 0,
      debug: false,
    })

    const connectionUrl = new URL('/', window.location.href)
    connectionUrl.protocol = connectionUrl.protocol.replace('http', 'ws')

    const connection = new WebSocket(connectionUrl.href)
    connectionRef.current = connection

    fetch(`/stream/video`)
      .then(async response => {
        const reader = response.body!.getReader()

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          jmuxer.feed({
            video: value,
            duration: 0,
          })
          clearRetryTimeout()
        }
      })
      .catch(err => {
        console.error('Error in video stream', err)
        if (retryTimeoutRef.current == null) {
          console.error(`Reloading page in ${RETRY_DELAY_MS}ms`)
          retryTimeoutRef.current = setTimeout(() => {
            window.location.reload()
          }, RETRY_DELAY_MS)
        }
      })
  }, [])

  const sendTouchEvent: React.PointerEventHandler<HTMLDivElement> = useCallback(
    e => {
      let action = TouchAction.Up
      if (e.type === 'pointerdown') {
        action = TouchAction.Down
        setPointerDown(true)
      } else if (pointerdown) {
        switch (e.type) {
          case 'pointermove':
            action = TouchAction.Move
            break
          case 'pointerup':
          case 'pointercancel':
          case 'pointerout':
            setPointerDown(false)
            action = TouchAction.Up
            break
        }
      } else {
        return
      }

      const { offsetX: x, offsetY: y } = e.nativeEvent

      connectionRef.current?.send(
        JSON.stringify({
          type: 'touch',
          x,
          y,
          action,
        }),
      )
    },
    [pointerdown],
  )

  return (
    <div
      style={{ height: '100%', touchAction: 'none', cursor: 'default' }}
      id={'main'}
      className="App"
    >
      <div
        id="videoContainer"
        onPointerDown={sendTouchEvent}
        onPointerMove={sendTouchEvent}
        onPointerUp={sendTouchEvent}
        onPointerCancel={sendTouchEvent}
        onPointerOut={sendTouchEvent}
        style={{
          height: '100%',
          width: '100%',
          padding: 0,
          margin: 0,
          display: 'flex',
        }}
      >
        <video id="video" style={{ height: '100%' }} autoPlay muted />
      </div>
    </div>
  )
}

export default App
