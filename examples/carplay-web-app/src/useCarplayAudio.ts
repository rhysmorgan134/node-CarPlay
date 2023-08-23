import { useCallback, useEffect, useState } from 'react'
import './App.css'
import {
  AudioCommand,
  AudioData,
  WebMicrophone,
  AudioFormat,
} from 'node-carplay/dist/web'
import PCMPlayer from 'pcm-player'
import { CarPlayWorker } from './worker/types'

const emptyFunc = () => {
  return {}
}

//TODO: allow to configure
const defaultAudioVolume = 1
const defaultNavVolume = 0.5

const useCarplayAudio = (worker: CarPlayWorker) => {
  const [mic, setMic] = useState<WebMicrophone | null>(null)
  const [audioPlayers] = useState(new Map<string, PCMPlayer>())

  const getAudioPlayer = useCallback(
    (format: AudioFormat): PCMPlayer => {
      const key = `${format.frequency}_${format.bitrate}_${format.channel}`
      let player = audioPlayers.get(key)
      if (player) return player
      player = new PCMPlayer({
        channels: format.channel,
        sampleRate: format.frequency,
        inputCodec: 'Int16',
        flushTime: 50,
        onstatechange: emptyFunc,
        onended: emptyFunc,
      })
      audioPlayers.set(key, player)
      player.volume(defaultAudioVolume)
      return player
    },
    [audioPlayers],
  )

  const processAudio = useCallback(
    (audio: AudioData) => {
      if (audio.data && audio.format) {
        const {
          format,
          data: { buffer: audioData },
        } = audio

        const player = getAudioPlayer(format)
        player.feed(audioData)
      } else if (audio.command) {
        switch (audio.command) {
          case AudioCommand.AudioSiriStart:
          case AudioCommand.AudioPhonecallStart:
            mic?.start()
            break
          case AudioCommand.AudioSiriStop:
          case AudioCommand.AudioPhonecallStop:
            mic?.stop()
            break
          case AudioCommand.AudioNaviStart:
            const navPlayer = getAudioPlayer(audio.format)
            navPlayer.volume(defaultNavVolume)
            break
          case AudioCommand.AudioMediaStart:
          case AudioCommand.AudioOutputStart:
            const mediaPlayer = getAudioPlayer(audio.format)
            mediaPlayer.volume(defaultAudioVolume)
            break
        }
      }
    },
    [getAudioPlayer, mic],
  )

  // audio init
  useEffect(() => {
    const initMic = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        })
        const mic = new WebMicrophone(mediaStream)
        mic.on('data', payload => {
          worker.postMessage({
            type: 'microphoneInput',
            payload,
          })
        })

        setMic(mic)
      } catch (err) {
        console.error('Failed to init microphone', err)
      }
    }

    initMic()

    return () => {
      audioPlayers.forEach(p => p.destroy())
    }
  }, [audioPlayers, worker])

  return { processAudio }
}

export default useCarplayAudio
