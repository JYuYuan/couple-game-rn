import {Platform} from 'react-native';

import {
    CreateLANRoomData,
    JoinLANRoomData,
    LANRoom,
    LANRoomDiscovery,
    NetworkPlayer,
    WebRTCConnectionState,
    WebRTCSignalingData,
} from '@/types/online';
import {roomDiscoveryService} from './room-discovery-service';

let RTCPeerConnection: any;

if (Platform.OS !== 'web') {
    const webrtc = require('react-native-webrtc');
    RTCPeerConnection = webrtc.RTCPeerConnection;
}


// WebRTC 配置
const RTC_CONFIGURATION: any = {
    iceServers: [
        {urls: 'stun:stun.l.google.com:19302'},
        {urls: 'stun:stun1.l.google.com:19302'},
    ],
};

// 局域网房间广播端口
const DISCOVERY_PORT = 8080;

export class WebRTCService {
    private static instance: WebRTCService;
    private peerConnections: Map<string, any> = new Map();
    private dataChannels: Map<string, any> = new Map();
    private currentRoom: LANRoom | null = null;
    private readonly myPeerId: string;
    private connectionStates: Map<string, WebRTCConnectionState> = new Map();
    private listeners: Map<string, Set<Function>> = new Map();

    private constructor() {
        this.myPeerId = this.generatePeerId();
    }

    static getInstance(): WebRTCService {
        if (!webrtcService.instance) {
            webrtcService.instance = new WebRTCService();
        }
        return webrtcService?.instance;
    }

    private generatePeerId(): string {
        return `peer_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

// 事件管理
    on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: Function): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.delete(callback);
        }
    }

    private emit(event: string, ...args: any[]): void {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => callback(...args));
        }
    }

// 获取当前状态
    getCurrentRoom(): LANRoom | null {
        return this.currentRoom;
    }

    getMyPeerId(): string {
        return this.myPeerId;
    }

    getConnectionState(peerId: string): WebRTCConnectionState {
        return this.connectionStates.get(peerId) || 'disconnected';
    }

// 创建局域网房间
    async createLANRoom(data: CreateLANRoomData): Promise<LANRoom> {
        try {
            // 获取本地网络信息
            const networkInfo = await this.getNetworkInfo();

            const room: LANRoom = {
                id: `lan_${Date.now()}`,
                name: data.roomName,
                hostId: this.myPeerId, // 使用统一的 hostId
                players: [{
                    id: this.myPeerId,
                    name: data.playerName,
                    isHost: true,
                    isConnected: true,
                    position: 0,
                    color: '#FF6B6B',
                    score: 0,
                    iconType: 'airplane',
                    completedTasks: [],
                    achievements: [],
                }],
                maxPlayers: data.maxPlayers,
                gameStatus: 'waiting',
                currentPlayerIndex: 0,
                taskSetId: data.taskSetId,
                gameType: data.gameType,
                connectionType: 'lan',
                networkInfo,
                createdAt: new Date(),
                lastActivity: new Date(),
            };

            this.currentRoom = room;
            await this.startRoomDiscovery(room);
            this.emit('roomCreated', room);

            return room;
        } catch (error: any) {
            console.error('创建局域网房间失败:', error);
            throw new Error(`创建局域网房间失败: ${error.message}`);
        }
    }

// 加入局域网房间
    async joinLANRoom(data: JoinLANRoomData): Promise<LANRoom> {
        try {
            // 连接到房主
            await this.connectToPeer(data.hostIP, data.roomId);

            // 发送加入请求
            const joinRequest = {
                type: 'join_request',
                playerName: data.playerName,
                peerId: this.myPeerId,
            };

            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('加入房间超时'));
                }, 10000);

                this.once('roomJoined', (room: LANRoom) => {
                    clearTimeout(timeout);
                    this.currentRoom = room;
                    resolve(room);
                });

                this.once('joinError', (error: string) => {
                    clearTimeout(timeout);
                    reject(new Error(error));
                });

                // 发送加入请求到房主
                this.sendToHost(joinRequest);
            });
        } catch (error: any) {
            console.error('加入局域网房间失败:', error);
            throw new Error(`加入局域网房间失败: ${error.message}`);
        }
    }

// 连接到对等端
    private async connectToPeer(targetIP: string, roomId: string): Promise<void> {
        const peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
        this.peerConnections.set(targetIP, peerConnection);
        this.connectionStates.set(targetIP, 'connecting');

        // 创建数据通道
        const dataChannel = peerConnection.createDataChannel('game', {
            ordered: true,
        });
        this.dataChannels.set(targetIP, dataChannel);

        // 设置事件监听器
        this.setupPeerConnectionEvents(peerConnection, dataChannel, targetIP);

        // 创建offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        // 通过信令服务器发送offer (这里简化为直接发送)
        this.sendSignalingMessage({
            type: 'offer',
            data: offer,
            fromPeerId: this.myPeerId,
            toPeerId: targetIP,
            roomId,
        });
    }

// 设置对等连接事件
    private setupPeerConnectionEvents(
        peerConnection: any,
        dataChannel: any,
        peerId: string
    ): void {
        peerConnection.on('connectionStateChange', (state: any) => {
            console.log(`WebRTC连接状态变化 [${peerId}]:`, state);

            let connectionState: WebRTCConnectionState;
            switch (state) {
                case 'connected':
                    connectionState = 'connected';
                    break;
                case 'connecting':
                    connectionState = 'connecting';
                    break;
                case 'failed':
                case 'closed':
                    connectionState = 'failed';
                    break;
                default:
                    connectionState = 'disconnected';
            }

            this.connectionStates.set(peerId, connectionState);
            this.emit('connectionStateChanged', peerId, connectionState);
        });

        peerConnection.on('iceCandidate', (event: any) => {
            if (event.candidate) {
                this.sendSignalingMessage({
                    type: 'ice-candidate',
                    data: event.candidate,
                    fromPeerId: this.myPeerId,
                    toPeerId: peerId,
                    roomId: this.currentRoom?.id || '',
                });
            }
        });

        dataChannel.on('open', () => {
            console.log(`数据通道已打开 [${peerId}]`);
            this.emit('dataChannelOpen', peerId);
        });

        dataChannel.on('message', (event: any) => {
            try {
                const message = JSON.parse(event.data);
                this.handleDataChannelMessage(message, peerId);
            } catch (error) {
                console.error('解析数据通道消息失败:', error);
            }
        });

        dataChannel.on('close', () => {
            console.log(`数据通道已关闭 [${peerId}]`);
            this.emit('dataChannelClose', peerId);
        });
    }

// 处理数据通道消息
    private handleDataChannelMessage(message: any, fromPeerId: string): void {
        console.log('收到数据通道消息:', message, '来自:', fromPeerId);

        switch (message.type) {
            case 'join_request':
                this.handleJoinRequest(message, fromPeerId);
                break;
            case 'room_update':
                this.handleRoomUpdate(message.room);
                break;
            case 'game_event':
                this.handleGameEvent(message.event, message.data);
                break;
            default:
                this.emit('message', message, fromPeerId);
        }
    }

// 处理加入请求
    private handleJoinRequest(message: any, fromPeerId: string): void {
        if (!this.currentRoom || !this.isHost()) {
            return;
        }

        if (this.currentRoom.players.length >= this.currentRoom.maxPlayers) {
            this.sendToPeer(fromPeerId, {
                type: 'join_error',
                error: '房间已满',
            });
            return;
        }

        // 添加新玩家
        const newPlayer: NetworkPlayer = {
            id: fromPeerId,
            name: message.playerName,
            isHost: false,
            isConnected: true,
            position: 0,
            color: this.generatePlayerColor(),
            score: 0,
            iconType: 'airplane',
            completedTasks: [],
            achievements: [],
        };

        this.currentRoom.players.push(newPlayer);
        this.currentRoom.lastActivity = new Date();

        // 通知所有玩家房间更新
        this.broadcastRoomUpdate();

        // 确认加入成功
        this.sendToPeer(fromPeerId, {
            type: 'join_success',
            room: this.currentRoom,
        });

        this.emit('playerJoined', newPlayer);
    }

// 处理房间更新
    private handleRoomUpdate(room: LANRoom): void {
        this.currentRoom = room;
        this.emit('roomUpdated', room);
    }

// 处理游戏事件
    private handleGameEvent(eventType: string, data: any): void {
        this.emit('gameEvent', eventType, data);
    }

// 发送消息给特定对等端
    private sendToPeer(peerId: string, message: any): void {
        const dataChannel = this.dataChannels.get(peerId);
        if (dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify(message));
        }
    }

// 发送消息给房主
    private sendToHost(message: any): void {
        if (this.currentRoom) {
            this.sendToPeer(this.currentRoom.hostId, message);
        }
    }

// 广播消息给所有玩家
    private broadcast(message: any): void {
        this.currentRoom?.players.forEach(player => {
            if (player.id !== this.myPeerId) {
                this.sendToPeer(player.id, message);
            }
        });
    }

// 广播房间更新
    private broadcastRoomUpdate(): void {
        this.broadcast({
            type: 'room_update',
            room: this.currentRoom,
        });
    }

// 发送信令消息
    private sendSignalingMessage(message: WebRTCSignalingData): void {
        // 这里应该通过信令服务器发送
        // 简化实现：直接通过UDP广播
        console.log('发送信令消息:', message);
        this.emit('signalingMessage', message);
    }

// 获取网络信息
    private async getNetworkInfo(): Promise<{ hostIP: string; port?: number; ssid?: string }> {
        try {
            const networkInfo = await roomDiscoveryService.getLocalNetworkInfo();
            return {
                hostIP: networkInfo.ip,
                port: DISCOVERY_PORT,
                ssid: networkInfo.ssid,
            };
        } catch (error) {
            console.error('获取网络信息失败:', error);
            throw error;
        }
    }

// 开始房间发现广播
    private async startRoomDiscovery(room: LANRoom): Promise<void> {
        try {
            console.log('开始房间发现广播:', room.id);
            roomDiscoveryService.startBroadcast(room);
        } catch (error) {
            console.error('启动房间发现失败:', error);
        }
    }

// 获取发现的房间列表
    getDiscoveredRooms(): LANRoomDiscovery[] {
        return roomDiscoveryService.getDiscoveredRooms();
    }

// 开始扫描局域网房间
    async startRoomScan(): Promise<void> {
        await roomDiscoveryService.startDiscovery();
    }

// 停止扫描局域网房间
    stopRoomScan(): void {
        roomDiscoveryService.stopDiscovery();
    }

// 生成玩家颜色
    private generatePlayerColor(): string {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

// 工具方法
    private once(event: string, callback: Function): void {
        const onceCallback = (...args: any[]) => {
            callback(...args);
            this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
    }

    isHost(): boolean {
        return this.currentRoom ? this.currentRoom.hostId === this.myPeerId : false;
    }

// 离开房间
    leaveRoom(): void {
        if (this.currentRoom) {
            // 停止房间广播
            roomDiscoveryService.stopBroadcast();

            // 通知其他玩家我要离开
            this.broadcast({
                type: 'player_leave',
                peerId: this.myPeerId,
            });

            // 关闭所有连接
            this.peerConnections.forEach((pc) => {
                pc.close();
            });

            // 关闭所有数据通道
            this.dataChannels.forEach((dc) => {
                dc.close();
            });

            // 清理状态
            this.peerConnections.clear();
            this.dataChannels.clear();
            this.connectionStates.clear();
            this.currentRoom = null;

            this.emit('roomLeft');
        }
    }

// 游戏事件方法
    startGame(data: any): void {
        this.broadcast({
            type: 'game_event',
            event: 'start',
            data,
        });
    }

    rollDice(data: any): void {
        this.broadcast({
            type: 'game_event',
            event: 'dice_roll',
            data,
        });
    }

    movePlayer(data: any): void {
        this.broadcast({
            type: 'game_event',
            event: 'player_move',
            data,
        });
    }

    triggerTask(data: any): void {
        this.broadcast({
            type: 'game_event',
            event: 'task_trigger',
            data,
        });
    }

    completeTask(data: any): void {
        this.broadcast({
            type: 'game_event',
            event: 'task_complete',
            data,
        });
    }
}

export const webrtcService:any = Platform.OS !== 'web' ? WebRTCService.getInstance() : null;