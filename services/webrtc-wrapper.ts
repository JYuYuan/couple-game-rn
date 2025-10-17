/**
 * WebRTC Wrapper - 动态加载 react-native-webrtc
 * 避免在 Expo Go 中直接导入导致崩溃
 */

// 检查是否在 Expo Go 环境中
const isExpoGo = !!(global as any).__expo?.isExpoGo

// 导出的类和函数 - 使用 any 以避免类型冲突
let RTCPeerConnection: any
let RTCSessionDescription: any
let RTCIceCandidate: any

// 根据环境加载真实或模拟实现
if (isExpoGo) {
  console.warn('🔶 Running in Expo Go - WebRTC features are mocked and will not work')

  // 模拟 RTCPeerConnection
  class MockRTCPeerConnection {
    connectionState = 'disconnected'
    remoteDescription = null

    createDataChannel() {
      console.warn('[WebRTC] Mock: createDataChannel called in Expo Go')
      return {
        onopen: null,
        onclose: null,
        onerror: null,
        onmessage: null,
        readyState: 'closed',
        send: () => console.warn('[WebRTC] Mock: DataChannel send not available in Expo Go'),
        close: () => {},
      }
    }

    async createOffer() {
      console.warn('[WebRTC] Mock: createOffer called in Expo Go')
      return { type: 'offer', sdp: 'mock-sdp' }
    }

    async createAnswer() {
      console.warn('[WebRTC] Mock: createAnswer called in Expo Go')
      return { type: 'answer', sdp: 'mock-sdp' }
    }

    async setLocalDescription() {
      console.warn('[WebRTC] Mock: setLocalDescription called in Expo Go')
    }

    async setRemoteDescription() {
      console.warn('[WebRTC] Mock: setRemoteDescription called in Expo Go')
    }

    async addIceCandidate() {
      console.warn('[WebRTC] Mock: addIceCandidate called in Expo Go')
    }

    close() {
      console.warn('[WebRTC] Mock: close called in Expo Go')
    }

    addEventListener() {
      console.warn('[WebRTC] Mock: addEventListener called in Expo Go')
    }

    removeEventListener() {
      console.warn('[WebRTC] Mock: removeEventListener called in Expo Go')
    }
  }

  // 模拟 RTCSessionDescription
  class MockRTCSessionDescription {
    type: string
    sdp: string

    constructor(init: any) {
      this.type = init?.type || 'offer'
      this.sdp = init?.sdp || 'mock-sdp'
    }
  }

  // 模拟 RTCIceCandidate
  class MockRTCIceCandidate {
    candidate: string
    sdpMid: string | null
    sdpMLineIndex: number | null

    constructor(init: any) {
      this.candidate = init?.candidate || ''
      this.sdpMid = init?.sdpMid || null
      this.sdpMLineIndex = init?.sdpMLineIndex || null
    }
  }

  RTCPeerConnection = MockRTCPeerConnection
  RTCSessionDescription = MockRTCSessionDescription
  RTCIceCandidate = MockRTCIceCandidate
} else {
  try {
    // 动态导入真实的 WebRTC
    const webrtc = require('react-native-webrtc')
    RTCPeerConnection = webrtc.RTCPeerConnection
    RTCSessionDescription = webrtc.RTCSessionDescription
    RTCIceCandidate = webrtc.RTCIceCandidate
    console.log('✅ WebRTC loaded successfully')
  } catch (error) {
    console.warn('⚠️ Failed to load react-native-webrtc, using mock implementation:', error)
    // 如果加载失败，使用模拟实现
    class MockRTCPeerConnection {
      connectionState = 'disconnected'
      remoteDescription = null
      createDataChannel() {
        return {}
      }
      async createOffer() {
        return { type: 'offer', sdp: 'mock-sdp' }
      }
      async createAnswer() {
        return { type: 'answer', sdp: 'mock-sdp' }
      }
      async setLocalDescription() {}
      async setRemoteDescription() {}
      async addIceCandidate() {}
      close() {}
      addEventListener() {}
      removeEventListener() {}
    }

    class MockRTCSessionDescription {
      type: string
      sdp: string
      constructor(init: any) {
        this.type = init?.type || 'offer'
        this.sdp = init?.sdp || 'mock-sdp'
      }
    }

    class MockRTCIceCandidate {
      candidate: string
      sdpMid: string | null
      sdpMLineIndex: number | null
      constructor(init: any) {
        this.candidate = init?.candidate || ''
        this.sdpMid = init?.sdpMid || null
        this.sdpMLineIndex = init?.sdpMLineIndex || null
      }
    }

    RTCPeerConnection = MockRTCPeerConnection
    RTCSessionDescription = MockRTCSessionDescription
    RTCIceCandidate = MockRTCIceCandidate
  }
}

// 检查 WebRTC 是否可用
export const isWebRTCAvailable = (): boolean => {
  return (
    !isExpoGo &&
    typeof (RTCPeerConnection as any).name === 'string' &&
    (RTCPeerConnection as any).name !== 'MockRTCPeerConnection'
  )
}

export { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate }

// 类型别名，用于向后兼容
export type RTCPeerConnectionType = typeof RTCPeerConnection
export type RTCSessionDescriptionType = typeof RTCSessionDescription
export type RTCIceCandidateType = typeof RTCIceCandidate
