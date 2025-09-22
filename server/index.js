// 简单的Socket.io服务器
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 内存存储房间数据
const rooms = new Map();
const players = new Map();

// 生成房间ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// 生成随机颜色（避免重复可改进成用 Set 管控）
function getRandomColor() {
  return (
    "#" +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")
  );
}

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  // 创建房间
  socket.on("room:create", (data, callback) => {
    try {
      const roomId = generateRoomId();
      const room = {
        id: roomId,
        name: data.roomName,
        hostId: socket.id,
        players: [
          {
            id: socket.id,
            socketId: socket.id,
            name: data.playerName,
            color: getRandomColor(),
            position: 0,
            score: 0,
            iconType: "airplane",
            completedTasks: [],
            achievements: [],
            isHost: true,
            isConnected: true,
            joinedAt: new Date(),
            lastSeen: new Date(),
          },
        ],
        maxPlayers: data.maxPlayers,
        gameStatus: "waiting",
        currentPlayerIndex: 0,
        taskSetId: data.taskSetId,
        gameType: data.gameType,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      rooms.set(roomId, room);
      players.set(socket.id, { roomId, playerId: socket.id });
      socket.join(roomId);

      console.log(`Room created: ${roomId} by ${data.playerName}`);

      if (typeof callback === "function") {
        callback({ success: true, room });
      } else {
        socket.emit("room:update", room);
      }

      broadcastRoomList();
    } catch (error) {
      console.error("Create room error:", error);
      if (typeof callback === "function") {
        callback({ success: false, error: "创建房间失败" });
      }
    }
  });

  // 加入房间
  socket.on("room:join", (data, callback) => {
    try {
      const room = rooms.get(data.roomId);
      if (!room) {
        if (typeof callback === "function")
          callback({ success: false, error: "房间不存在" });
        return;
      }

      if (room.players.length >= room.maxPlayers) {
        if (typeof callback === "function")
          callback({ success: false, error: "房间已满" });
        return;
      }

      if (room.gameStatus !== "waiting") {
        if (typeof callback === "function")
          callback({ success: false, error: "游戏已开始" });
        return;
      }

      const playerIcons = ["airplane", "helicopter", "rocket", "ufo"];

      const newPlayer = {
        id: socket.id,
        socketId: socket.id,
        name: data.playerName,
        color: getRandomColor(),
        position: 0,
        score: 0,
        iconType: playerIcons[room.players.length % playerIcons.length],
        completedTasks: [],
        achievements: [],
        isHost: false,
        isConnected: true,
        joinedAt: new Date(),
        lastSeen: new Date(),
      };

      room.players.push(newPlayer);
      room.lastActivity = new Date();

      players.set(socket.id, { roomId: data.roomId, playerId: socket.id });
      socket.join(data.roomId);

      console.log(`Player ${data.playerName} joined room ${data.roomId}`);

      io.to(data.roomId).emit("room:update", room);
      if (typeof callback === "function") callback({ success: true, room });

      broadcastRoomList();
    } catch (error) {
      console.error("Join room error:", error);
      if (typeof callback === "function")
        callback({ success: false, error: "加入房间失败" });
    }
  });

  // 离开房间
  socket.on("room:leave", () => {
    handlePlayerLeave(socket.id);
  });

  // 开始游戏
  socket.on("game:start", (data) => {
    const room = rooms.get(data.roomId);
    if (room && room.hostId === socket.id) {
      room.gameStatus = "playing";
      room.lastActivity = new Date();

      io.to(data.roomId).emit("room:update", room);
      io.to(data.roomId).emit("game:start");

      console.log(`Game started in room ${data.roomId}`);
      broadcastRoomList();
    }
  });

  // 投掷骰子
  socket.on("game:dice-roll", (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.lastActivity = new Date();
      io.to(data.roomId).emit("game:dice-roll", data);
    }
  });

  // 玩家移动
  socket.on("game:player-move", (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      const player = room.players.find((p) => p.id === data.playerId);
      if (player) {
        player.position = data.toPosition;
      }

      room.lastActivity = new Date();
      io.to(data.roomId).emit("game:player-move", data);
      io.to(data.roomId).emit("room:update", room);
    }
  });

  // 任务触发
  socket.on("game:task-trigger", (data) => {
    const room = rooms.get(data.roomId);
    if (room) {
      room.lastActivity = new Date();
      io.to(data.roomId).emit("game:task-trigger", data);
    }
  });

  // 任务完成
  socket.on("game:task-complete", (data) => {
    const room = rooms.get(data.roomId);
    if (room && room.players.length > 0) {
      room.lastActivity = new Date();
      room.currentPlayerIndex =
        (room.currentPlayerIndex + 1) % room.players.length;

      io.to(data.roomId).emit("game:task-complete", data);
      io.to(data.roomId).emit("room:update", room);
    }
  });

  // 获取房间列表
  socket.on("room:list", () => {
    const roomList = Array.from(rooms.values()).map((room) => ({
      id: room.id,
      name: room.name,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      gameType: room.gameType,
      status: room.gameStatus,
      taskSetName: `任务集 ${room.taskSetId}`,
    }));

    socket.emit("room:list", roomList);
  });

  // 断开连接
  socket.on("disconnect", () => {
    handlePlayerLeave(socket.id);
  });

  socket.onAny((event, ...args) => {
    console.log("收到事件:", event, args);
  });

  // 处理玩家离开
  function handlePlayerLeave(socketId) {
    const playerInfo = players.get(socketId);
    if (playerInfo) {
      const room = rooms.get(playerInfo.roomId);
      if (room) {
        room.players = room.players.filter((p) => p.socketId !== socketId);

        // 转移房主
        if (room.hostId === socketId && room.players.length > 0) {
          room.players.forEach((p) => (p.isHost = false));
          room.hostId = room.players[0].socketId;
          room.players[0].isHost = true;
        }

        if (room.players.length === 0) {
          rooms.delete(playerInfo.roomId);
          console.log(`Room ${playerInfo.roomId} deleted (empty)`);
        } else {
          io.to(playerInfo.roomId).emit("room:update", room);
        }

        broadcastRoomList();
      }
      players.delete(socketId);
    }
  }

  // 广播房间列表
  function broadcastRoomList() {
    const roomList = Array.from(rooms.values()).map((room) => ({
      id: room.id,
      name: room.name,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      gameType: room.gameType,
      status: room.gameStatus,
      taskSetName: `任务集 ${room.taskSetId}`,
    }));

    io.emit("room:list", roomList);
  }
});

// 清理超时房间
setInterval(() => {
  const now = new Date();
  const timeout = 30 * 60 * 1000; // 30分钟超时

  for (const [roomId, room] of rooms.entries()) {
    if (now.getTime() - room.lastActivity.getTime() > timeout) {
      io.to(roomId).emit("error", {
        code: "ROOM_TIMEOUT",
        message: "房间因长时间不活跃已关闭",
      });
      rooms.delete(roomId);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});

module.exports = { app, server, io };
