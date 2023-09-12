import { useCallback, useEffect, useState, useRef } from 'react'
import JMuxer from 'jmuxer'
import { TouchAction } from 'node-carplay/dist/web'

export const config = {
  width: window.innerWidth,
  height: window.innerHeight,
  fps: 30,
}

function App() {
  const [pointerdown, setPointerDown] = useState(false)

  const connectionRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (connectionRef.current) {
      return
    }
    const jmuxer = new JMuxer({
      node: 'video',
      mode: 'video',
      fps: config.fps,
      flushingTime: 100,
      debug: false,
    })

    const connectionUrl = new URL('/', window.location.href)
    connectionUrl.protocol = connectionUrl.protocol.replace('http', 'ws')

    const connection = new WebSocket(connectionUrl.href)
    connectionRef.current = connection

    connection.onopen = () => {
      connection.send(
        JSON.stringify({
          type: 'start',
          ...config,
        }),
      )
    }

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
        }
      })
      .catch(err => {
        console.error('Error in video stream', err)
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
