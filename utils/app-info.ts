import appConfig from '../app.json'

export interface AppInfo {
  version: string
  buildNumber?: string
  buildDate: string
}

export const getAppInfo = (): AppInfo => {
  const buildDate = `${new Date().getFullYear()}.${String(new Date().getMonth() + 1).padStart(2, '0')}.${String(new Date().getDate()).padStart(2, '0')}`

  return {
    version: appConfig.expo.version || '1.0.0',
    buildDate,
  }
}

export const checkForUpdates = async (): Promise<{
  hasUpdate: boolean
  latestVersion?: string
  updateUrl?: string
  message?: string
}> => {
  try {
    const currentVersion = getAppInfo().version

    // 从 GitHub 获取最新版本信息
    const response = await fetch(
      'https://raw.githubusercontent.com/JYuYuan/couple-game-rn/refs/heads/main/app.json',
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const remotePackageInfo = await response.json()
    const latestVersion = remotePackageInfo.expo.version

    // 比较版本号
    const hasUpdate = compareVersions(currentVersion, latestVersion) < 0

    return {
      hasUpdate,
      latestVersion,
      updateUrl: hasUpdate ? 'https://github.com/JYuYuan/couple-game-rn/releases' : undefined,
      message: hasUpdate ? `发现新版本 ${latestVersion}！` : '当前已是最新版本',
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    return {
      hasUpdate: false,
      message: '检查更新失败，请检查网络连接',
    }
  }
}

// 简单的版本号比较函数
const compareVersions = (current: string, latest: string): number => {
  const currentParts = current.split('.').map(Number)
  const latestParts = latest.split('.').map(Number)

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0
    const latestPart = latestParts[i] || 0

    if (currentPart < latestPart) return -1
    if (currentPart > latestPart) return 1
  }

  return 0
}
