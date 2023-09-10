import { useCallback, useEffect, useState } from 'react'
import './App.css'
import CarplayWeb, {
  AudioCommand,
  AudioData,
  WebMicrophone,
  AudioFormat,
  decodeTypeMap,
  SendAudio,
} from 'node-carplay/dist/web'
import { PcmPlayer } from 'pcm-ringbuf-player'

//TODO: allow to configure
const defaultAudioVolume = 1
const defaultNavVolume = 0.5

const useCarplayAudio = (carplay: CarplayWeb) => {
  const [mic, setMic] = useState<WebMicrophone | null>(null)
  const [audioPlayers] = useState(new Map<AudioFormat, PcmPlayer>())

  const getAudioPlayer = useCallback(
    (format: AudioFormat): PcmPlayer => {
      let player = audioPlayers.get(format)
      if (player) return player
      player = new PcmPlayer(format.frequency, format.channel)
      audioPlayers.set(format, player)
      player.volume(defaultAudioVolume)
      player.start()
      return player
    },
    [audioPlayers],
  )

  const processAudio = useCallback(
    (audio: AudioData) => {
      if (audio.data) {
        const { decodeType, data } = audio
        const format = decodeTypeMap[decodeType]
        const player = getAudioPlayer(format)
        player.feed(data)
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

  // microphone init
  useEffect(() => {
    const initMic = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        })
        const mic = new WebMicrophone(mediaStream)
        mic.on('data', payload => {
          carplay.dongleDriver.send(new SendAudio(payload))
        })

        setMic(mic)
      } catch (err) {
        console.error('Failed to init microphone', err)
      }
    }

    initMic()
  }, [carplay.dongleDriver])

  // cleanup
  useEffect(() => {
    return () => {
      audioPlayers.forEach(p => p.stop())
      mic?.destroy()
    }
  }, [audioPlayers, mic])

  return { processAudio }
}

export default useCarplayAudio
