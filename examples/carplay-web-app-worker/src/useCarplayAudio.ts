import { useCallback, useEffect, useState } from 'react'
import './App.css'
import {
  AudioCommand,
  AudioData,
  WebMicrophone,
  AudioFormat,
  PcmPlayer,
  decodeTypeMap,
} from 'node-carplay/dist/web'
import { CarPlayWorker } from './worker/types'

//TODO: allow to configure
const defaultAudioVolume = 1
const defaultNavVolume = 0.5

const useCarplayAudio = (worker: CarPlayWorker) => {
  const [mic, setMic] = useState<WebMicrophone | null>(null)
  const [audioPlayers] = useState(new Map<AudioFormat, PcmPlayer>())

  const getAudioPlayer = useCallback(
    (format: AudioFormat): PcmPlayer => {
      let player = audioPlayers.get(format)
      if (player) return player
      player = new PcmPlayer(format.frequency, format.channel)
      player.volume(defaultAudioVolume)
      player.start()
      audioPlayers.set(format, player)
      return player
    },
    [audioPlayers],
  )

  const processAudio = useCallback(
    (audio: AudioData) => {
      if (audio.data) {
        const {
          decodeType,
          data: { buffer: audioData },
        } = audio

        const player = getAudioPlayer(decodeTypeMap[decodeType])
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
            const navPlayer = getAudioPlayer(decodeTypeMap[audio.decodeType])
            navPlayer.volume(defaultNavVolume)
            break
          case AudioCommand.AudioMediaStart:
          case AudioCommand.AudioOutputStart:
            const mediaPlayer = getAudioPlayer(decodeTypeMap[audio.decodeType])
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
          worker.postMessage(
            {
              type: 'microphoneInput',
              payload,
            },
            [payload.buffer],
          )
        })

        setMic(mic)
      } catch (err) {
        console.error('Failed to init microphone', err)
      }
    }

    initMic()

    return () => {
      audioPlayers.forEach(p => p.stop())
    }
  }, [audioPlayers, worker])

  return { processAudio }
}

export default useCarplayAudio
