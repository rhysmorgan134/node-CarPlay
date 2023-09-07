import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotatingLines } from 'react-loader-spinner'
import './App.css'
import CarplayWeb, {
  TouchAction,
  findDevice,
  requestDevice,
  DongleConfig,
  SendTouch,
} from 'node-carplay/dist/web'
import JMuxer from 'jmuxer'
import useCarplayAudio from './useCarplayAudio'

export const config: DongleConfig = {
  dpi: 160,
  nightMode: false,
  hand: 0,
  boxName: 'nodePlay',
  width: window.innerWidth,
  height: window.innerHeight,
  fps: 60,
  mediaDelay: 0
}

function App() {
  const [isPlugged, setPlugged] = useState(false)
  const [noDevice, setNoDevice] = useState(false)
  const [pointerdown, setPointerDown] = useState(false)
  const [receivingVideo, setReceivingVideo] = useState(false)
  const [jmuxer, setJmuxer] = useState<JMuxer | null>(null)

  const carplay = useMemo(() => new CarplayWeb(config), [])

  const { processAudio } = useCarplayAudio(carplay)

  // subscribe to worker messages
  useEffect(() => {
    carplay.onmessage = ev => {
      const { type } = ev
      switch (type) {
        case 'plugged':
          setPlugged(true)
          break
        case 'unplugged':
          setPlugged(false)
          break
        case 'video':
          // if document is hidden we dont need to feed frames
          if (!jmuxer || document.hidden) return
          if (!receivingVideo) setReceivingVideo(true)
          const { message: video } = ev
          jmuxer.feed({
            video: video.data,
            duration: 0,
          })
          break
        case 'audio':
          const { message: audio } = ev
          processAudio(audio)
          break
        case 'media':
          //TODO: implement
          break
      }
    }
  }, [carplay, jmuxer, processAudio, receivingVideo])

  // video init
  useEffect(() => {
    const jmuxer = new JMuxer({
      node: 'video',
      mode: 'video',
      fps: config.fps,
      flushingTime: 100,
      debug: false,
    })
    setJmuxer(jmuxer)
    return () => {
      jmuxer.destroy()
    }
  }, [])

  const checkDevice = useCallback(
    async (request: boolean = false) => {
      const device = request ? await requestDevice() : await findDevice()
      if (device) {
        setNoDevice(false)
        carplay.start(device)
      } else {
        setNoDevice(true)
      }
    },
    [carplay],
  )

  // usb connect/disconnect handling and device check
  useEffect(() => {
    navigator.usb.onconnect = async () => {
      checkDevice()
    }

    navigator.usb.ondisconnect = async () => {
      const device = await findDevice()
      if (!device) {
        carplay.stop()
        setNoDevice(true)
      }
    }

    checkDevice()
  }, [carplay, checkDevice])

  const onClick = useCallback(() => {
    checkDevice(true)
  }, [checkDevice])

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
      carplay.dongleDriver.send(
        new SendTouch(x / config.width, y / config.height, action),
      )
    },
    [carplay, pointerdown],
  )

  const isLoading = !noDevice && !receivingVideo

  return (
    <div
      style={{ height: '100%', touchAction: 'none' }}
      id={'main'}
      className="App"
    >
      {(noDevice || isLoading) && (
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {noDevice && (
            <button onClick={onClick} rel="noopener noreferrer">
              Plug-In Carplay Dongle and Press
            </button>
          )}
          {isLoading && (
            <RotatingLines
              strokeColor="grey"
              strokeWidth="5"
              animationDuration="0.75"
              width="96"
              visible={true}
            />
          )}
        </div>
      )}
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
        <video
          id="video"
          style={isPlugged ? { height: '100%' } : undefined}
          autoPlay
          muted
        />
      </div>
    </div>
  )
}

export default App
