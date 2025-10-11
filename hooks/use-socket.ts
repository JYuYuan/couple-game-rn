// 重新导出 SocketContext 中的 useSocket hook
// 这样保持向后兼容，不需要修改所有使用 useSocket 的地方
export { useSocket } from '@/contexts/SocketContext'
