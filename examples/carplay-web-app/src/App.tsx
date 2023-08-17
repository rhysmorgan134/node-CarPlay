import { useCallback, useEffect, useState } from 'react';
import './App.css';
import { 
  AudioCommand, 
  AudioData,  
  TouchAction, 
  VideoData, 
  Message,
}  from 'node-carplay/dist/web'
import JMuxer from 'jmuxer';
import { config as settings } from './worker/carplay'

const START_MIC_COMMANDS = [AudioCommand.AudioPhonecallStart, AudioCommand.AudioSiriStart]
const STOP_MIC_COMMANDS = [AudioCommand.AudioPhonecallStop, AudioCommand.AudioSiriStop]

const carplayWorker = new Worker(new URL("./worker/carplay.ts", import.meta.url))

function App() {
  const [isPlugged, setPlugged] = useState(false);
  //const [requiresPermissions, setRequiresPermissions] = useState(false);
  const [pointerdown, setPointerDown] = useState(false);
  const [audioState, setAudioState] = useState<{ context: AudioContext, gainNode: GainNode } | null>(null)
  const [jmuxer, setJmuxer] = useState<JMuxer | null>(null)


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
  }, [])
  
  useEffect(() => {
    if (!audioState || !jmuxer) return

    const { context, gainNode } = audioState

    carplayWorker.onmessage = (ev) => {
      const { type, message }: { type: string, message: Message } = ev.data;
      switch (type) {
        case 'plugged':
          setPlugged(true)
          break;
        case 'unplugged':
          setPlugged(false)
          break;
        case 'video':
          const video = message as VideoData
          jmuxer.feed({
            video: video.data,
          })
          break;
        case 'audio':
          const audio = message as AudioData
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
            //START MIC
          } else if (audio.command && STOP_MIC_COMMANDS.includes(audio.command)) {
            //STOP MIC
          }
          break;
        case 'media':
          //TODO: implement
          break;
      }
    }
  }, [audioState, jmuxer])

  // video init
  useEffect(() => {
    const jmuxer = new JMuxer({
      node: 'video',
      mode: 'video',
      fps: settings.fps,
      flushingTime: 100,
      debug: false
    });
    setJmuxer(jmuxer)    
    return () => {
      jmuxer.destroy()
    }
  }, []);

  const onClick = useCallback(async () => {
  }, [])

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
      data : { x: offsetX, y: offsetY, action }
    })
  }, [pointerdown]);

  return (
    <div style={{height: '100%'}}  id={'main'} className="App">
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
