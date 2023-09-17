import { useCallback, useEffect, useMemo, useState } from 'react'
import { RotatingLines } from 'react-loader-spinner'
import './App.css'
import { findDevice, requestDevice, DongleConfig } from 'node-carplay/web'
import JMuxer from 'jmuxer'
import { CarPlayWorker } from './worker/types'
import useCarplayAudio from './useCarplayAudio'
import { useCarplayTouch } from './useCarplayTouch'

const width = window.innerWidth
const height = window.innerHeight

const config: Partial<DongleConfig> = {
  width,
  height,
  fps: 60,
  mediaDelay: 0,
}
const RETRY_DELAY_MS = 5000

function App() {
  const [isPlugged, setPlugged] = useState(false)
  const [noDevice, setNoDevice] = useState(false)
  const [receivingVideo, setReceivingVideo] = useState(false)
  const [jmuxer, setJmuxer] = useState<JMuxer | null>(null)

  const carplayWorker = useMemo(
    () =>
      new Worker(
        new URL('./worker/carplay.ts', import.meta.url),
      ) as CarPlayWorker,
    [],
  )

  const { processAudio } = useCarplayAudio(carplayWorker)

  // subscribe to worker messages
  useEffect(() => {
    carplayWorker.onmessage = ev => {
      const { type } = ev.data
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
          const { message: video } = ev.data
          jmuxer.feed({
            video: video.data,
            duration: 0,
          })
          break
        case 'audio':
          const { message: audio } = ev.data
          processAudio(audio)
          break
        case 'media':
          //TODO: implement
          break
        case 'failure':
          console.error(
            `Carplay initialization failed -- Reloading page in ${RETRY_DELAY_MS}ms`,
          )
          setTimeout(() => {
            window.location.reload()
          }, RETRY_DELAY_MS)
          break
      }
    }
  }, [carplayWorker, jmuxer, processAudio, receivingVideo])

  // video init
  useEffect(() => {
    const jmuxer = new JMuxer({
      node: 'video',
      mode: 'video',
      fps: config.fps,
      flushingTime: 0,
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
        carplayWorker.postMessage({ type: 'start', payload: config })
      } else {
        setNoDevice(true)
      }
    },
    [carplayWorker],
  )

  // usb connect/disconnect handling and device check
  useEffect(() => {
    navigator.usb.onconnect = async () => {
      checkDevice()
    }

    navigator.usb.ondisconnect = async () => {
      const device = await findDevice()
      if (!device) {
        carplayWorker.postMessage({ type: 'stop' })
        setNoDevice(true)
      }
    }

    checkDevice()
  }, [carplayWorker, checkDevice])

  const onClick = useCallback(() => {
    checkDevice(true)
  }, [checkDevice])

  const sendTouchEvent = useCarplayTouch(carplayWorker, width, height)

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
