/**
 * LAN 模块延迟加载
 * 避免在应用启动时加载原生模块,只在需要时加载
 */

let _udpBroadcastService: any = null
let _tcpServer: any = null
let _tcpClient: any = null
let _lanService: any = null
let _isLoaded = false
let _isAvailable: boolean | null = null

/**
 * 检查 LAN 模块是否可用
 */
export const isLANAvailable = (): boolean => {
  if (_isAvailable !== null) {
    return _isAvailable
  }

  try {
    // 尝试 require,但不实际导入
    require.resolve('react-native-tcp-socket')
    require.resolve('react-native-udp')
    _isAvailable = true
    return true
  } catch {
    _isAvailable = false
    console.warn('⚠️ LAN 模块不可用')
    console.warn('💡 提示: 使用 expo-dev-client 或生产构建来启用 LAN 功能')
    return false
  }
}

/**
 * 加载 LAN 模块
 */
export const loadLANModules = async (): Promise<void> => {
  if (_isLoaded) {
    return
  }

  if (!isLANAvailable()) {
    throw new Error(
      'LAN 功能不可用。\n' +
      '请使用以下方式启用:\n' +
      '1. 安装 expo-dev-client: npx expo install expo-dev-client\n' +
      '2. 重新构建: npx expo run:ios\n' +
      '或使用生产构建。',
    )
  }

  try {
    console.log('📦 开始加载 LAN 模块...')

    // 动态导入模块
    const [udpModule, tcpServerModule, tcpClientModule, lanServiceModule] = await Promise.all([
      import('./udp-broadcast'),
      import('./tcp-server'),
      import('./tcp-client'),
      import('./lan-service'),
    ])

    _udpBroadcastService = udpModule.udpBroadcastService
    _tcpServer = tcpServerModule.tcpServer
    _tcpClient = tcpClientModule.tcpClient
    _lanService = lanServiceModule.lanService

    _isLoaded = true
    console.log('✅ LAN 模块加载成功')
  } catch (error) {
    console.error('❌ LAN 模块加载失败:', error)
    throw new Error(
      '无法加载 LAN 模块。请确保:\n' +
      '1. 已安装 expo-dev-client\n' +
      '2. 使用 npx expo run:ios 运行\n' +
      '3. 不是在 Expo Go 中运行',
    )
  }
}

/**
 * 获取 LAN Service
 */
export const getLANService = () => {
  if (!_lanService) {
    throw new Error('LAN 模块未加载。请先调用 loadLANModules()')
  }
  return _lanService
}

/**
 * 获取 UDP Broadcast Service
 */
export const getUDPBroadcastService = () => {
  if (!_udpBroadcastService) {
    throw new Error('LAN 模块未加载。请先调用 loadLANModules()')
  }
  return _udpBroadcastService
}

/**
 * 获取 TCP Server
 */
export const getTCPServer = () => {
  if (!_tcpServer) {
    throw new Error('LAN 模块未加载。请先调用 loadLANModules()')
  }
  return _tcpServer
}

/**
 * 获取 TCP Client
 */
export const getTCPClient = () => {
  if (!_tcpClient) {
    throw new Error('LAN 模块未加载。请先调用 loadLANModules()')
  }
  return _tcpClient
}

/**
 * 检查模块是否已加载
 */
export const isLANModulesLoaded = (): boolean => {
  return _isLoaded
}

/**
 * 卸载 LAN 模块
 */
export const unloadLANModules = (): void => {
  _udpBroadcastService = null
  _tcpServer = null
  _tcpClient = null
  _lanService = null
  _isLoaded = false
  console.log('🧹 LAN 模块已卸载')
}
