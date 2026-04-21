const { Server } = require('socket.io');

let io;
const userSockets = new Map();

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('register', (userId) => {
      if (userId) {
        userSockets.set(userId.toString(), socket.id);
        console.log(`User ${userId} registered with socket ${socket.id}`);
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

const sendNotification = (userId, notification) => {
  if (!io) return;
  
  const socketId = userSockets.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit('notification', notification);
    console.log(`Notification sent to user ${userId} via socket ${socketId}`);
  } else {
    console.log(`User ${userId} not connected via socket`);
  }
};

const broadcastNotification = (notification) => {
  if (!io) return;
  io.emit('notification', notification);
  console.log('Broadcasted notification to all users');
};

module.exports = {
  initSocket,
  getIO,
  sendNotification,
  broadcastNotification
};
