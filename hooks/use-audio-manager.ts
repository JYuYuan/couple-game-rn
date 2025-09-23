import { useEffect, useRef, useState } from 'react'
import { Audio } from 'expo-av'
import { useSettingsStore } from '@/store'

export interface AudioManager {
  isPlaying: boolean
  volume: number
  isMuted: boolean
  play: () => Promise<void>
  pause: () => Promise<void>
  stop: () => Promise<void>
  setVolume: (volume: number) => Promise<void>
  toggleMute: () => Promise<void>
  togglePlayPause: () => Promise<void>
  playSoundEffect: (soundName: 'step' | 'dice' | 'victory') => Promise<void>
}

export const useAudioManager = (): AudioManager => {
  const soundRef = useRef<Audio.Sound | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolumeState] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const { soundSettings } = useSettingsStore()

  // 初始化音频
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        // 设置音频模式
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        })

        // 加载背景音乐 - 使用条件加载避免文件不存在的错误
        let sound: Audio.Sound
        try {
          const { sound: bgmSound } = await Audio.Sound.createAsync(
            require('@/assets/audio/bgm.mp3'),
            {
              isLooping: true,
              volume: soundSettings.globalMute ? 0 : volume,
              shouldPlay: false,
            },
          )
          sound = bgmSound
          console.log('BGM loaded successfully')
        } catch (error) {
          console.log('BGM file not found, audio manager will work without background music', error)
          return // 如果音频文件不存在，直接返回
        }

        // 监听播放状态
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying || false)
            setIsLoaded(true)
            // console.log('Audio status:', { isPlaying: status.isPlaying, isLoaded: status.isLoaded });
          } else {
            setIsLoaded(false)
            console.log('Audio not loaded')
          }
        })

        soundRef.current = sound
        setIsLoaded(true)
      } catch (error) {
        console.error('Audio initialization failed:', error)
      }
    }

    initializeAudio().catch(console.error)

    // 清理函数
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(console.error)
      }
    }
  }, []) // 移除 soundSettings 依赖，避免重复初始化

  // 同步设置状态
  useEffect(() => {
    if (soundRef.current && isLoaded) {
      soundRef.current.setVolumeAsync(soundSettings.globalMute ? 0 : volume).catch(console.error)
    }
    setIsMuted(soundSettings.globalMute)
  }, [soundSettings.globalMute, volume, isLoaded])

  const play = async () => {
    try {
      console.log('Attempting to play audio...', { isLoaded, globalMute: soundSettings.globalMute })
      if (soundRef.current && isLoaded && !soundSettings.globalMute) {
        const status = await soundRef.current.getStatusAsync()
        console.log('Current audio status before play:', status)

        await soundRef.current.playAsync()
        console.log('Audio play command sent')
        setIsPlaying(true)
      } else {
        console.log('Cannot play audio:', {
          hasSound: !!soundRef.current,
          isLoaded,
          globalMute: soundSettings.globalMute,
        })
      }
    } catch (error) {
      console.error('Play failed:', error)
    }
  }

  const pause = async () => {
    try {
      if (soundRef.current && isLoaded) {
        await soundRef.current.pauseAsync()
        setIsPlaying(false)
      }
    } catch (error) {
      console.error('Pause failed:', error)
    }
  }

  const stop = async () => {
    try {
      if (soundRef.current && isLoaded) {
        await soundRef.current.stopAsync()
        setIsPlaying(false)
      }
    } catch (error) {
      console.error('Stop failed:', error)
    }
  }

  const setVolume = async (newVolume: number) => {
    try {
      const clampedVolume = Math.max(0, Math.min(1, newVolume))
      setVolumeState(clampedVolume)

      if (soundRef.current && isLoaded && !soundSettings.globalMute) {
        await soundRef.current.setVolumeAsync(clampedVolume)
      }
    } catch (error) {
      console.error('Set volume failed:', error)
    }
  }

  const toggleMute = async () => {
    try {
      const newMuteState = !isMuted
      setIsMuted(newMuteState)

      if (soundRef.current && isLoaded) {
        await soundRef.current.setVolumeAsync(newMuteState ? 0 : volume)
      }
    } catch (error) {
      console.error('Toggle mute failed:', error)
    }
  }

  const togglePlayPause = async () => {
    if (isPlaying) {
      await pause()
    } else {
      await play()
    }
  }

  // 播放音效
  const playSoundEffect = async (soundName: 'step' | 'dice' | 'victory') => {
    try {
      if (soundSettings.globalMute) return // 如果静音则不播放

      let soundFile
      switch (soundName) {
        case 'step':
          soundFile = require('@/assets/audio/step.wav')
          break
        case 'dice':
          soundFile = require('@/assets/audio/roll-dice.mp3')
          break
        case 'victory':
          soundFile = require('@/assets/audio/victory.mp3')
          break
        default:
          return
      }

      // 创建并播放音效
      const { sound } = await Audio.Sound.createAsync(soundFile, {
        volume: volume * 0.7, // 音效音量稍微小一点
        shouldPlay: true,
      })

      // 音效播放完毕后自动卸载
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(console.error)
        }
      })
    } catch (error) {
      console.log(`Sound effect ${soundName} not found or failed to play:`, error)
    }
  }

  return {
    isPlaying,
    volume,
    isMuted,
    play,
    pause,
    stop,
    setVolume,
    toggleMute,
    togglePlayPause,
    playSoundEffect,
  }
}
