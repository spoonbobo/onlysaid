const connectionTimestamps = new Map();

function setupSocketIO(io, client) {
  console.log('🚀 Socket.IO server initialized and waiting for connections...');
  
  io.on("connection", async (socket) => {
    console.log('🔗 NEW CONNECTION ATTEMPT:', {
      socketId: socket.id,
      auth: socket.handshake.auth,
      query: socket.handshake.query,
      headers: socket.handshake.headers
    });
    
    try {
      const user = socket.handshake.auth.user;
      const deviceId = socket.handshake.auth.deviceId;
      const serviceAuth = socket.handshake.auth.service;
      
      // Handle Electron main process connections
      if (user && user.id === 'electron-main-process') {
        console.log(`🔧 Electron main process connected with socket ${socket.id}`);
        socket.emit("connection_established", { socketId: socket.id });
        
        socket.on("disconnect", () => {
          console.log(`🔧 Electron main process disconnected socket ${socket.id}`);
        });
        
        return; // Early return for electron main process
      }
      
      // Handle backend service connections
      if (serviceAuth && serviceAuth.type === 'backend-service') {
        console.log(`🔧 Backend service connected with socket ${socket.id}`);
        socket.emit("service_connection_established", { socketId: socket.id });
        
        // Handle service broadcast events and forward to electron main process
        socket.on("broadcast:file:progress", async (data) => {
          const { operationId, progress, stage, userId } = data;
          console.log(`📊 Broadcasting file progress: ${operationId} - ${progress}% for user ${userId}`);
          
          // ✅ Add deduplication here
          if (this.lastProgress && 
              this.lastProgress.operationId === operationId && 
              this.lastProgress.progress === progress && 
              this.lastProgress.stage === stage) {
            return; // Skip duplicate
          }
          this.lastProgress = { operationId, progress, stage };
          
          // Broadcast to users
          if (userId) {
            const socketIds = await client.smembers(`user:${userId}:sockets`);
            socketIds.forEach(socketId => {
              io.to(socketId).emit("file:progress", { operationId, progress, stage });
            });
          }
          
          // Forward to Electron main process
          io.emit("file:progress", { operationId, progress, stage });
        });

        socket.on("broadcast:file:completed", async (data) => {
          const { operationId, result, userId } = data;
          console.log(`✅ Broadcasting file completed: ${operationId} for user ${userId}`);
          
          // Broadcast to users
          if (userId) {
            const socketIds = await client.smembers(`user:${userId}:sockets`);
            socketIds.forEach(socketId => {
              io.to(socketId).emit("file:completed", { operationId, result });
            });
          }
          
          // Forward to Electron main process
          io.emit("file:completed", { operationId, result });
        });

        socket.on("broadcast:file:error", async (data) => {
          const { operationId, error, userId } = data;
          console.log(`❌ Broadcasting file error: ${operationId} for user ${userId}`);
          
          // Broadcast to users
          if (userId) {
            const socketIds = await client.smembers(`user:${userId}:sockets`);
            socketIds.forEach(socketId => {
              io.to(socketId).emit("file:error", { operationId, error });
            });
          }
          
          // Forward to Electron main process
          io.emit("file:error", { operationId, error });
        });

        socket.on("disconnect", () => {
          console.log(`🔧 Backend service disconnected socket ${socket.id}`);
        });

        return; // Early return for service connections
      }

      // Handle user device connections
      if (!user || !deviceId) {
        console.error('Connection rejected: missing user or device ID');
        socket.disconnect(true);
        return;
      }

      const userId = user.id;
      const userToken = socket.handshake.auth.token; // Get token from auth
      
      // Store token for API calls
      await client.set(`user:${userId}:token`, userToken);
      
      console.log(`👤 User ${user.username} (${userId}) connected from device ${deviceId} with socket ${socket.id}`);

      socket.emit("connection_established", { socketId: socket.id, deviceId: deviceId });
      connectionTimestamps.set(socket.id, Date.now());

      // Store simple device-socket mapping
      await client.set(`socket:${socket.id}:user`, userId);
      await client.set(`socket:${socket.id}:device`, deviceId);
      await client.set(`user:${userId}:device:${deviceId}:socket`, socket.id);
      await client.sadd(`user:${userId}:devices:active`, deviceId);
      await client.sadd(`user:${userId}:sockets`, socket.id);

      // Update device last seen timestamp
      await client.set(`device:${deviceId}:lastSeen`, new Date().toISOString());

      // Check for device conflicts (same device connected elsewhere)
      const existingSocket = await client.get(`user:${userId}:device:${deviceId}:socket`);
      if (existingSocket && existingSocket !== socket.id) {
        const conflictSocket = io.sockets.sockets.get(existingSocket);
        if (conflictSocket) {
          console.log(`⚠️ Device conflict detected for ${deviceId}, disconnecting old connection`);
          conflictSocket.emit('device_conflict', { 
            deviceId: deviceId, 
            message: 'This device has been connected from another location' 
          });
          conflictSocket.disconnect(true);
        }
      }

      // Auto-join user's workspaces when device connects
      const userWorkspaces = await getUserWorkspacesFromDB(userId, client);
      for (const workspaceId of userWorkspaces) {
        await client.sadd(`workspace:${workspaceId}:users`, userId);
        console.log(`📍 Auto-joined user ${userId} to workspace ${workspaceId} from device ${deviceId}`);
      }

      // Send unread messages for this device
      await sendUnreadMessagesForDevice(socket, client, userId, deviceId);

      socket.emit('device_registered', { 
        deviceId: deviceId, 
        message: `Device ${deviceId} registered successfully` 
      });

      // Socket event handlers
      socket.on("ping", async (data) => {
        connectionTimestamps.set(socket.id, Date.now());
        await client.set(`device:${deviceId}:lastSeen`, new Date().toISOString());
        socket.emit("pong", { timestamp: Date.now(), deviceId: deviceId });
      });

      socket.on("disconnect", async () => {
        console.log(`👤 User ${userId} disconnected device ${deviceId} socket ${socket.id}`);
        
        // Clean up device-specific data
        await client.del(`socket:${socket.id}:user`);
        await client.del(`socket:${socket.id}:device`);
        await client.del(`user:${userId}:device:${deviceId}:socket`);
        await client.srem(`user:${userId}:devices:active`, deviceId);
        await client.srem(`user:${userId}:sockets`, socket.id);
        await client.set(`device:${deviceId}:lastSeen`, new Date().toISOString());
        connectionTimestamps.delete(socket.id);
      });

      // Message handling with device awareness
      socket.on("message", async (data) => {
        console.log("👤 Message received:", data);
        const workspaceId = data.workspaceId;
        try {
          const usersInWorkspace = await client.smembers(`workspace:${workspaceId}:users`);
          for (const targetUserId of usersInWorkspace) {
            await deliverMessageToUser(client, io, targetUserId, data);
          }
        } catch (error) {
          console.error("Error processing message event:", error.message);
        }
      });

      // NEW: User-level workspace joining (called from client when user joins workspace)
      socket.on("user_join_workspace", async (workspaceId) => {
        console.log(`👤 User ${userId} joining workspace ${workspaceId}`);
        
        // Add user to workspace
        await client.sadd(`workspace:${workspaceId}:users`, userId);
        await client.sadd(`user:${userId}:workspaces`, workspaceId);
        
        // Notify all user's devices about the workspace join
        const userDevices = await client.smembers(`user:${userId}:devices:active`);
        for (const userDeviceId of userDevices) {
          const socketId = await client.get(`user:${userId}:device:${userDeviceId}:socket`);
          if (socketId) {
            const deviceSocket = io.sockets.sockets.get(socketId);
            if (deviceSocket) {
              deviceSocket.emit('workspace_joined', { workspaceId, userId });
              console.log(`📍 Notified device ${userDeviceId} about workspace ${workspaceId} join`);
            }
          }
        }
      });

      // NEW: User-level workspace leaving
      socket.on("user_leave_workspace", async (workspaceId) => {
        console.log(`👤 User ${userId} leaving workspace ${workspaceId}`);
        
        // Remove user from workspace
        await client.srem(`workspace:${workspaceId}:users`, userId);
        await client.srem(`user:${userId}:workspaces`, workspaceId);
        
        // Notify all user's devices about the workspace leave
        const userDevices = await client.smembers(`user:${userId}:devices:active`);
        for (const userDeviceId of userDevices) {
          const socketId = await client.get(`user:${userId}:device:${userDeviceId}:socket`);
          if (socketId) {
            const deviceSocket = io.sockets.sockets.get(socketId);
            if (deviceSocket) {
              deviceSocket.emit('workspace_left', { workspaceId, userId });
              console.log(`📍 Notified device ${userDeviceId} about workspace ${workspaceId} leave`);
            }
          }
        }
      });

    } catch (error) {
      console.error("❌ Error in socket connection handler:", error);
      socket.disconnect(true);
    }
  });

  const cleanupStaleConnections = async () => {
    try {
      const userKeys = await client.keys("user:*:sockets");
      for (const userKey of userKeys) {
        const userIdFromKey = userKey.split(":")[1];
        const userSockets = await client.smembers(userKey);
        for (const socketId of userSockets) {
          const socket = io.sockets.sockets.get(socketId);
          if (!socket) {
            console.log(`Cleaning up disconnected socket ${socketId} for user ${userIdFromKey}`);
            await client.srem(userKey, socketId);
            connectionTimestamps.delete(socketId);
          }
        }
      }
    } catch (error) {
      console.error("Error in periodic socket cleanup:", error);
    }
  };

  setInterval(cleanupStaleConnections, 12 * 60 * 60 * 1000);
}

async function sendUnreadMessagesForDevice(socket, client, userId, deviceId) {
  try {
    // Get device-specific unread messages
    const deviceUnreadMessages = await client.lrange(
      `user:${userId}:device:${deviceId}:unread`,
      0,
      -1
    );

    console.log(`📬 Sending ${deviceUnreadMessages.length} unread messages to device ${deviceId}`);

    deviceUnreadMessages.forEach((msg) => {
      try {
        const parsedMsg = JSON.parse(msg);
        // Use different event name for unread messages to avoid notification duplication
        console.log("unread message received (no notification)", parsedMsg);
        socket.emit("unread-message", parsedMsg);
      } catch (e) {
        console.error("Error parsing unread message:", e);
      }
    });

    // Clear unread messages after delivery
    await client.del(`user:${userId}:device:${deviceId}:unread`);
    
  } catch (err) {
    console.error(`Error sending unread messages for device ${deviceId}:`, err);
  }
}

async function deliverMessageToUser(client, io, targetUserId, messageData) {
  const activeDevices = await client.smembers(`user:${targetUserId}:devices:active`);
  let messageDelivered = false;

  // Try to deliver to all active devices for this user
  for (const deviceId of activeDevices) {
    const socketId = await client.get(`user:${targetUserId}:device:${deviceId}:socket`);
    if (socketId) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit("message", messageData);
        messageDelivered = true;
        console.log(`📨 Message delivered to user ${targetUserId} device ${deviceId}`);
      }
    }
  }

  // If no devices are online, queue the message for all known devices
  if (!messageDelivered) {
    console.log(`📪 Queueing message for offline user ${targetUserId}`);
    
    // Get all devices for this user from your database
    const allUserDevices = await getUserDevicesFromDB(targetUserId, client);
    
    if (allUserDevices.length > 0) {
      // Queue for each device
      for (const deviceId of allUserDevices) {
        await client.lpush(
          `user:${targetUserId}:device:${deviceId}:unread`,
          JSON.stringify(messageData)
        );
      }
    }
  }
}

async function getUserDevicesFromDB(userId, client) {
  try {
    const axios = require('axios');
    const userToken = await client.get(`user:${userId}:token`);
    
    const response = await axios.get(`${process.env.CLIENT_URL}/api/v2/user/devices`, {
      params: { userId },
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    return response.data.data?.map(device => device.device_id) || [];
  } catch (error) {
    console.error('Error fetching user devices:', error);
    return [];
  }
}

async function getUserWorkspacesFromDB(userId, client) {
  try {
    const axios = require('axios');
    const userToken = await client.get(`user:${userId}:token`);
    
    const response = await axios.get(`${process.env.CLIENT_URL}/api/v2/workspace`, {
      params: { userId },
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });
    return response.data.data?.map(workspace => workspace.id) || [];
  } catch (error) {
    console.error('Error fetching user workspaces:', error);
    return [];
  }
}

module.exports = { setupSocketIO };