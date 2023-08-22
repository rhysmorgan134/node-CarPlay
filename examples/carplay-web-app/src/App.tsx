import { useCallback, useEffect, useRef, useState } from 'react';
import { RotatingLines } from 'react-loader-spinner'
import './App.css';
import { 
  AudioCommand, 
  AudioData,  
  TouchAction, 
  findDevice,
  requestDevice,
  DongleConfig,
  WebMicrophone
}  from 'node-carplay/dist/web'
import JMuxer from 'jmuxer';
import { CarPlayWorker } from './worker/types';

export const config: DongleConfig = {
  dpi: 160,
  nightMode: false,
  hand: 0,
  boxName: 'nodePlay',
  width: window.innerWidth,
  height: window.innerHeight,
  fps: 60,
}

const START_MIC_COMMANDS = [AudioCommand.AudioPhonecallStart, AudioCommand.AudioSiriStart]
const STOP_MIC_COMMANDS = [AudioCommand.AudioPhonecallStop, AudioCommand.AudioSiriStop]

function App() {
  const [isPlugged, setPlugged] = useState(false);
  const [noDevice, setNoDevice] = useState(false);
  const [pointerdown, setPointerDown] = useState(false);
  const [receivingVideo, setReceivingVideo] = useState(false);
  const [audioState, setAudioState] = useState<{ context: AudioContext, gainNode: GainNode, mic: WebMicrophone } | null>(null)
  const [jmuxer, setJmuxer] = useState<JMuxer | null>(null)

  const carplayWorker = useRef(
    new Worker(new URL("./worker/carplay.ts", import.meta.url))
    ).current as CarPlayWorker

  const processAudio = useCallback((audio: AudioData) => {
    if (!audioState) return
    const { context, gainNode, mic } = audioState
    if (audio.data && audio.format) {

      const { format, volume, data: { buffer: audioData } } = audio

      if(volume) {
        gainNode.gain.value = audio.volume
      }

      const data = new Float32Array(new Int16Array(audioData)).map(
        (d) => d / 32768
      )
      const sampleRate = format.frequency
      const channels = format.channel
      const audioBuffer = context.createBuffer(
        channels,
        data.length / channels,
        sampleRate
      );

      for (let ch = 0; ch < channels; ++ch) {
        audioBuffer
          .getChannelData(ch)
          .set(data.filter((_, i) => i % channels === ch));
      }

      const src = context.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(context.destination);
      src.start();
    } else if (audio.command && START_MIC_COMMANDS.includes(audio.command)) {
      mic.start()
    } else if (audio.command && STOP_MIC_COMMANDS.includes(audio.command)) {
      mic.stop()
    }
  }, [audioState])

  // audio init
  useEffect(() => {
    const initAudio = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const audioContext = new AudioContext();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1;
        gainNode.connect(audioContext.destination)
  
        const mic = new WebMicrophone(mediaStream)
        mic.on('data', (payload) => {
          carplayWorker.postMessage({
            type: 'microphoneInput',
            payload
          })
        })
  
        setAudioState({
          context: audioContext,
          gainNode: gainNode,
          mic
        })
      } catch (err) {
        console.error('Failed to init audio', err)
      }
    }
    
    initAudio()
  }, [carplayWorker])
  
  // subscribe to worker messages
  useEffect(() => {
    carplayWorker.onmessage = (ev) => {
      const { type } = ev.data
      switch (type) {
        case 'plugged':
          setPlugged(true)
          break;
        case 'unplugged':
          setPlugged(false)
          break;
        case 'video':
          // if document is hidden we dont need to feed frames
          if (!jmuxer || document.hidden) return
          if (!receivingVideo) setReceivingVideo(true)
          const { message: video } = ev.data
          jmuxer.feed({
            video: video.data,
            duration: 0
          })
          break;
        case 'audio':
          const { message: audio } = ev.data
          processAudio(audio)
          break;
        case 'media':
          //TODO: implement
          break;
      }
    }
  }, [carplayWorker, jmuxer, processAudio, receivingVideo])

  // video init
  useEffect(() => {
    const jmuxer = new JMuxer({
      node: 'video',
      mode: 'video',
      fps: config.fps,
      flushingTime: 100,
      debug: false
    })
    setJmuxer(jmuxer)
    return () => {
      jmuxer.destroy()
    }
  }, []);
  
  const checkDevice = useCallback(async (request: boolean = false) => {
    const device = request ? await requestDevice() : await findDevice()
    if (device) {
      setNoDevice(false)
      carplayWorker.postMessage({ type: 'start', payload: config })
    } else{
      setNoDevice(true)
    }
  }, [carplayWorker])

  // usb connect/disconnect handling and device check
  useEffect(() => {
    navigator.usb.onconnect = async () => {
      checkDevice()
    }

    navigator.usb.ondisconnect = async () => {
      const device = await findDevice()
      if(!device) { 
        carplayWorker.postMessage({ type: 'stop' })
        setNoDevice(true)
      }
    }

    checkDevice()
  }, [carplayWorker, checkDevice])

  const onClick = useCallback(() => {
    checkDevice(true)
  }, [checkDevice])

  const sendTouchEvent: React.PointerEventHandler<HTMLDivElement> = useCallback((e) => {
    let action = TouchAction.Up;
    if (e.type === "pointerdown") {
      action = TouchAction.Down;
      setPointerDown(true);
    } else if (pointerdown) {
      switch (e.type) {
        case "pointermove":
          action = TouchAction.Move;
          break;
        case "pointerup":
        case "pointercancel":
        case "pointerout":
          setPointerDown(false);
          action = TouchAction.Up;
          break;
      }
    } else {
      return;
    }

    const { offsetX, offsetY } = e.nativeEvent
    carplayWorker.postMessage({
      type: 'touch',
      payload : { x: offsetX, y: offsetY, action }
    })
  }, [carplayWorker, pointerdown]);

  const isLoading = !noDevice && !receivingVideo

  return (
    <div style={{height: '100%'}}  id={'main'} className="App">
      {(noDevice || isLoading) &&
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
        {noDevice && <button
          onClick={onClick}
          rel="noopener noreferrer"
        >
          Plug-In Carplay Dongle and Press
        </button>}
        {isLoading && <RotatingLines
          strokeColor="grey"
          strokeWidth="5"
          animationDuration="0.75"
          width="96"
          visible={true}
        />}
        </div>}
      <div
        id="videoContainer" 
        onPointerDown={sendTouchEvent}
        onPointerMove={sendTouchEvent}
        onPointerUp={sendTouchEvent}
        onPointerCancel={sendTouchEvent}
        onPointerOut={sendTouchEvent}
        style={{height: '100%', width: '100%', padding: 0, margin: 0, display: 'flex'}}>
        <video
          id="video" 
          style={isPlugged ? { height: '100%' } : undefined} 
          autoPlay 
          muted />
      </div>
    </div>
  );
}

export default App;
