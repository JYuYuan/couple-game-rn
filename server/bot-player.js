// 模拟玩家脚本
const io = require('socket.io-client');

class BotPlayer {
    constructor(options = {}) {
        this.serverUrl = options.serverUrl || 'http://localhost:3001';
        this.playerName = options.playerName || `Bot_${Math.random().toString(36).substring(2, 6)}`;
        this.autoPlay = options.autoPlay !== false; // 默认开启自动游戏
        this.diceDelay = options.diceDelay || 2000; // 投骰子间隔（毫秒）
        this.taskDelay = options.taskDelay || 1500; // 任务完成延迟（毫秒）

        this.socket = null;
        this.roomId = null;
        this.playerId = null;
        this.currentRoom = null;
        this.isMyTurn = false;
        this.gameStarted = false;

        console.log(`🤖 创建机器人玩家: ${this.playerName}`);
    }

    // 连接到服务器
    connect() {
        return new Promise((resolve, reject) => {
            console.log(`🔗 ${this.playerName} 正在连接到服务器: ${this.serverUrl}`);

            this.socket = io(this.serverUrl, {
                timeout: 10000,
                retries: 3,
                forceNew: true,
                transports: ['websocket', 'polling']
            });

            this.socket.on('connect', () => {
                console.log(`✅ ${this.playerName} 已连接到服务器，Socket ID: ${this.socket.id}`);
                this.playerId = this.socket.id;
                this.setupEventListeners();
                resolve();
            });

            this.socket.on('connect_error', (error) => {
                console.error(`❌ ${this.playerName} 连接失败:`, error.message);
                reject(error);
            });

            this.socket.on('disconnect', (reason) => {
                console.log(`🔌 ${this.playerName} 断开连接:`, reason);
            });
        });
    }

    // 设置事件监听器
    setupEventListeners() {
        // 房间更新
        this.socket.on('room:update', (room) => {
            console.log(`🏠 ${this.playerName} 收到房间更新:`, {
                roomId: room.id,
                playerCount: room.players.length,
                gameStatus: room.gameStatus
            });

            this.currentRoom = room;
            this.roomId = room.id;

            // 检查是否轮到自己
            const currentPlayer = room.players[room.currentPlayerIndex];
            this.isMyTurn = currentPlayer && currentPlayer.socketId === this.socket.id;

            // 如果游戏开始了且是自己的回合
            if (room.gameStatus === 'playing' && this.isMyTurn && this.autoPlay) {
                this.scheduleNextMove();
            }
        });

        // 游戏事件
        this.socket.on('game:dice-roll', (data) => {
            console.log(`🎲 ${this.playerName} 收到投骰子事件:`, data);
        });

        this.socket.on('game:player-move', (data) => {
            console.log(`🏃 ${this.playerName} 收到玩家移动事件:`, data);
        });

        this.socket.on('game:task-trigger', (data) => {
            console.log(`📋 ${this.playerName} 收到任务触发事件:`, data);

            // 如果是自己需要执行的任务，自动完成
            if (data.executorPlayerId === this.playerId && this.autoPlay) {
                setTimeout(() => {
                    this.completeTask(data.task.id, Math.random() > 0.3); // 70% 成功率
                }, this.taskDelay);
            }
        });

        this.socket.on('game:task-complete', (data) => {
            console.log(`✅ ${this.playerName} 收到任务完成事件:`, data);
        });

        this.socket.on('game:victory', (data) => {
            console.log(`🏆 ${this.playerName} 游戏结束! 获胜者: ${data.winnerName}`);
            this.gameStarted = false;
        });

        // 错误处理
        this.socket.on('error', (error) => {
            console.error(`❌ ${this.playerName} 收到错误:`, error);
        });
    }

    // 创建房间
    createRoom(roomName, maxPlayers = 2, taskSetId = 'default', gameType = 'fly') {
        return new Promise((resolve, reject) => {
            console.log(`🏗️ ${this.playerName} 正在创建房间: ${roomName}`);

            const roomData = {
                roomName,
                playerName: this.playerName,
                maxPlayers,
                taskSetId,
                gameType
            };

            this.socket.emit('room:create', roomData, (response) => {
                if (response.success) {
                    console.log(`✅ ${this.playerName} 房间创建成功:`, response.room.id);
                    this.roomId = response.room.id;
                    this.currentRoom = response.room;
                    resolve(response.room);
                } else {
                    console.error(`❌ ${this.playerName} 房间创建失败:`, response.error);
                    reject(new Error(response.error));
                }
            });
        });
    }

    // 加入房间
    joinRoom(roomId) {
        return new Promise((resolve, reject) => {
            console.log(`🚪 ${this.playerName} 正在加入房间: ${roomId}`);

            const joinData = {
                roomId,
                playerName: this.playerName
            };

            this.socket.emit('room:join', joinData, (response) => {
                if (response.success) {
                    console.log(`✅ ${this.playerName} 成功加入房间:`, response.room.id);
                    this.roomId = response.room.id;
                    this.currentRoom = response.room;
                    resolve(response.room);
                } else {
                    console.error(`❌ ${this.playerName} 加入房间失败:`, response.error);
                    reject(new Error(response.error));
                }
            });
        });
    }

    // 开始游戏（仅房主可用）
    startGame() {
        if (!this.roomId) {
            console.error(`❌ ${this.playerName} 尝试开始游戏但未在房间中`);
            return;
        }

        console.log(`🎮 ${this.playerName} 开始游戏`);
        this.socket.emit('game:start', { roomId: this.roomId });
        this.gameStarted = true;
    }

    // 投骰子
    rollDice() {
        if (!this.isMyTurn || !this.gameStarted) {
            console.log(`⏳ ${this.playerName} 不是自己的回合或游戏未开始`);
            return;
        }

        const diceValue = Math.floor(Math.random() * 6) + 1;
        console.log(`🎲 ${this.playerName} 投掷骰子: ${diceValue}`);

        this.socket.emit('game:dice-roll', {
            roomId: this.roomId,
            playerId: this.playerId,
            diceValue
        });
    }

    // 移动玩家
    movePlayer(fromPosition, toPosition, steps) {
        console.log(`🏃 ${this.playerName} 移动: ${fromPosition} -> ${toPosition} (${steps} 步)`);

        this.socket.emit('game:player-move', {
            roomId: this.roomId,
            playerId: this.playerId,
            fromPosition,
            toPosition,
            steps
        });
    }

    // 完成任务
    completeTask(taskId, completed = true) {
        console.log(`📋 ${this.playerName} 完成任务: ${taskId}, 结果: ${completed ? '成功' : '失败'}`);

        this.socket.emit('game:task-complete', {
            roomId: this.roomId,
            taskId,
            playerId: this.playerId,
            completed
        });
    }

    // 调度下一步行动
    scheduleNextMove() {
        if (!this.autoPlay || !this.isMyTurn || !this.gameStarted) return;

        console.log(`⏰ ${this.playerName} 计划在 ${this.diceDelay}ms 后投掷骰子`);

        setTimeout(() => {
            if (this.isMyTurn && this.gameStarted) {
                this.rollDice();
            }
        }, this.diceDelay);
    }

    // 离开房间
    leaveRoom() {
        if (!this.roomId) return;

        console.log(`🚪 ${this.playerName} 离开房间: ${this.roomId}`);
        this.socket.emit('room:leave', { roomId: this.roomId });
        this.roomId = null;
        this.currentRoom = null;
        this.gameStarted = false;
    }

    // 断开连接
    disconnect() {
        if (this.socket) {
            console.log(`👋 ${this.playerName} 断开连接`);
            this.socket.disconnect();
            this.socket = null;
        }
    }

    // 获取当前状态
    getStatus() {
        return {
            playerName: this.playerName,
            playerId: this.playerId,
            roomId: this.roomId,
            isMyTurn: this.isMyTurn,
            gameStarted: this.gameStarted,
            connected: this.socket && this.socket.connected
        };
    }
}

module.exports = BotPlayer;