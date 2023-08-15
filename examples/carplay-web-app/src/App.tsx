import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import CarPlayWeb, { 
  AudioCommand, 
  AudioData, 
  SendTouch, 
  TouchAction, 
  VideoData, 
  DongleConfig,
  StartResult
}  from 'node-carplay/dist/web'
import JMuxer from 'jmuxer';

const START_MIC_COMMANDS = [AudioCommand.AudioPhonecallStart, AudioCommand.AudioSiriStart]
const STOP_MIC_COMMANDS = [AudioCommand.AudioPhonecallStop, AudioCommand.AudioSiriStop]
const settings: DongleConfig = {
  dpi: 160,
  nightMode: false,
  hand: 0,
  boxName: 'nodePlay',
  width: 1280,
  height: 480,
  fps: 30,
}

function App() {
  const [isPlugged, setPlugged] = useState(false);
  const [requiresPermissions, setRequiresPermissions] = useState(false);
  const [pointerdown, setPointerDown] = useState(false);
  const [audioState, setAudioState] = useState<{ context: AudioContext, gainNode: GainNode } | null>(null)
  const carplayRef = useRef<CarPlayWeb>(new CarPlayWeb(settings))
  const { start, stop, requestDevice, dongleDriver: { send } } = carplayRef.current

  // audio init
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
    .then(() => {
        const audioContext = new AudioContext();
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 1;
        gainNode.connect(audioContext.destination)
        setAudioState({
          context: audioContext,
          gainNode: gainNode
        })
    })
  }, [send])
  
  useEffect(() => {
    if (!audioState) return

    const { context, gainNode } = audioState
    const cp = carplayRef.current

    cp.on('audio', (audio: AudioData) => {
      if (audio.data && audio.format){

        if(audio.volume) {
          gainNode.gain.value = audio.volume
        }

        const data = new Float32Array(new Int16Array(audio.data)).map(
          (d) => d / 32768
        );
        const sampleRate = audio.format.frequency
        const channels = audio.format.channel
        const audioBuffer = context.createBuffer(
          channels,
          audio.data.length / channels,
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
        //START MIC
      } else if (audio.command && STOP_MIC_COMMANDS.includes(audio.command)) {
        //STOP MIC
      }
    })
  }, [audioState])

  // video init
  useEffect(() => {
    const jmuxer = new JMuxer({
      node: 'video',
      mode: 'video',
      fps: settings.fps,
      flushingTime: 100,
      debug: false
    });

    const cp = carplayRef.current
    
    cp.on('video', (video: VideoData) => {
      jmuxer.feed({
        video: video.data,
      })
    })

    return () => {
      cp.dongleDriver.close()
      jmuxer.destroy()
    }
  }, [send]);

  // connect/plug init
  useEffect(() => {
    navigator.usb.onconnect = async () => {
      const res = await start()
      if (res === StartResult.RequiresPermission) {
        setRequiresPermissions(true)
      }
    }
    
    navigator.usb.ondisconnect = async () => {
      stop()
    }

    const cp = carplayRef.current
    
    cp.on('plugged', () => {
      setPlugged(true)
    })

    cp.on('unplugged', () => {
      setPlugged(false)
    })
  }, [start, stop])

  const onClick = useCallback(async () => {
    const device = await requestDevice()
    if (device) {
      start()
      setRequiresPermissions(false)
    }
  }, [requestDevice, start])

  const sendTouchEvent: React.PointerEventHandler<HTMLVideoElement> = useCallback((e) => {
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
    send(new SendTouch(offsetX, offsetY, action, settings))
  }, [pointerdown, send]);

  const isLoading = !isPlugged && !requiresPermissions

  return (
    <div style={{height: '100%'}}  id={'main'} className="App">
      {requiresPermissions && <button
          onClick={onClick}
          rel="noopener noreferrer"
        >
          Request USB Permissions
        </button>}
      <div
        id="videoContainer" 
        style={{height: '100%', width: '100%', padding: 0, margin: 0, display: 'flex'}}>
        <video
          onPointerDown={sendTouchEvent}
          onPointerMove={sendTouchEvent}
          onPointerUp={sendTouchEvent}
          onPointerCancel={sendTouchEvent}
          onPointerOut={sendTouchEvent}
          id="video" 
          style={isPlugged ? { height: '100%', width: '100%' } : undefined} 
          autoPlay 
          muted />
      </div>
    </div>
  );
}

export default App;
