// chat.ts - do not delete
// responsible for handling chat session, message db insertion
// share same interface with next app

// socket.io + redis
// on: connect, disconnect, message. off: message
// it provides single source of truth for all chat data:
// handles user room (de)registration.
// including room real-time info, user-info.

// maintains a map for rooms: Map<room:str, userIds:str[]>
// if explicitly request room deregistration, remove userIds from room.
// if user disconnects, store pending messages in redis
