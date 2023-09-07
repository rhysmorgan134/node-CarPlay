import { useCallback, useEffect, useState } from 'react'
import './App.css'
import CarplayWeb, {
  AudioCommand,
  AudioData,
  WebMicrophone,
  AudioFormat,
  SendAudio,
  decodeTypeMap,
} from 'node-carplay/dist/web'
import PCMPlayer from 'pcm-player'

const emptyFunc = () => {
  return {}
}

//TODO: allow to configure
const defaultAudioVolume = 1
const defaultNavVolume = 0.5

const useCarplayAudio = (carplay: CarplayWeb) => {
  const [mic, setMic] = useState<WebMicrophone | null>(null)
  const [audioPlayers] = useState(new Map<AudioFormat, PCMPlayer>())

  const getAudioPlayer = useCallback(
    (format: AudioFormat): PCMPlayer => {
      let player = audioPlayers.get(format)
      if (player) return player
      player = new PCMPlayer({
        channels: format.channel,
        sampleRate: format.frequency,
        inputCodec: 'Int16',
        flushTime: 50,
        onstatechange: emptyFunc,
        onended: emptyFunc,
      })
      audioPlayers.set(format, player)
      player.volume(defaultAudioVolume)
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
      audioPlayers.forEach(p => p.destroy())
      mic?.destroy()
    }
  }, [audioPlayers, mic])

  return { processAudio }
}

export default useCarplayAudio
