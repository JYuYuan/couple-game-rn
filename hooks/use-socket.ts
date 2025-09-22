import {useCallback, useEffect, useState} from 'react';
import {socketService} from '@/services/socket-service';
import {CreateRoomData, JoinRoomData, OnlineRoom} from '@/types/online';

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(socketService.getIsConnected());
    const [connectionError, setConnectionError] = useState(socketService.getConnectionError());
    const [currentRoom, setCurrentRoom] = useState(socketService.getCurrentRoom());

    // 监听 SocketService 的状态变化
    useEffect(() => {
        const handleConnect = () => {
            console.log('useSocket: Received connect event');
            setIsConnected(true);
            setConnectionError(null);
        };

        const handleDisconnect = () => {
            console.log('useSocket: Received disconnect event');
            setIsConnected(false);
        };

        const handleConnectError = () => {
            console.log('useSocket: Received connect_error event');
            setIsConnected(false);
            setConnectionError(socketService.getConnectionError());
        };

        const handleCurrentRoomChanged = (room: OnlineRoom | null) => {
            console.log('useSocket: Received currentRoomChanged event:', room?.id);
            setCurrentRoom(room);
        };

        const handleError = () => {
            console.log('useSocket: Received error event');
            setConnectionError(socketService.getConnectionError());
        };

        // 注册事件监听器
        socketService.on('connect', handleConnect);
        socketService.on('disconnect', handleDisconnect);
        socketService.on('connect_error', handleConnectError);
        socketService.on('currentRoomChanged', handleCurrentRoomChanged);
        socketService.on('error', handleError);

        return () => {
            // 清理事件监听器
            socketService.off('connect', handleConnect);
            socketService.off('disconnect', handleDisconnect);
            socketService.off('connect_error', handleConnectError);
            socketService.off('currentRoomChanged', handleCurrentRoomChanged);
            socketService.off('error', handleError);
        };
    }, []);

    // 包装的方法
    const connect = useCallback(() => {
        socketService.connect();
    }, []);

    const disconnect = useCallback(() => {
        socketService.disconnect();
    }, []);

    const createRoom = useCallback((data: CreateRoomData): Promise<OnlineRoom> => {
        return socketService.createRoom(data);
    }, []);

    const joinRoom = useCallback((data: JoinRoomData): Promise<OnlineRoom> => {
        return socketService.joinRoom(data);
    }, []);

    const leaveRoom = useCallback(() => {
        socketService.leaveRoom();
    }, []);

    const resetRoomState = useCallback(() => {
        socketService.resetRoomState();
    }, []);

    // 游戏事件
    const startGame = useCallback((data: any) => {
        socketService.startGame(data);
    }, []);

    const rollDice = useCallback((data: any) => {
        socketService.rollDice(data);
    }, []);

    const movePlayer = useCallback((data: any) => {
        socketService.movePlayer(data);
    }, []);

    const triggerTask = useCallback((data: any) => {
        socketService.triggerTask(data);
    }, []);

    const completeTask = useCallback((data: any) => {
        socketService.completeTask(data);
    }, []);

    const addEventListener = useCallback((event: string, listener: (...args: any[]) => void) => {
        socketService.on(event, listener);
    }, []);

    const removeEventListener = useCallback((event: string, listener: (...args: any[]) => void) => {
        socketService.off(event, listener);
    }, []);

    return {
        // 连接状态
        isConnected,
        connectionError,
        currentRoom,

        // 连接管理
        connect,
        disconnect,

        // 房间管理
        createRoom,
        joinRoom,
        leaveRoom,
        resetRoomState,

        // 游戏事件
        startGame,
        rollDice,
        movePlayer,
        triggerTask,
        completeTask,

        // 事件管理
        addEventListener,
        removeEventListener,

        // 实用函数
        isHost: socketService.isHost,
        currentPlayer: socketService.currentPlayer,
    };
};