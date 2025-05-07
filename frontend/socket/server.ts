import { WebSocketServer } from 'ws';
import { TLSocketRoom } from '@tldraw/sync-core';

const PORT = process.env.SOCKET_PORT ? parseInt(process.env.SOCKET_PORT) : 5858;
const rooms = new Map<string, TLSocketRoom>();

async function makeOrLoadRoom(roomId: string) {
  let room = rooms.get(roomId);
  if (!room) {
    room = new TLSocketRoom({
      onDataChange: () => {
        // Optional: Handle data changes
      },
    });
    rooms.set(roomId, room);
  }
  return room;
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', async (socket, request) => {
  try {
    const url = new URL(request.url || '', 'http://localhost');
    const roomId = url.pathname.split('/').pop();
    const sessionId = url.searchParams.get('sessionId');

    if (!roomId || !sessionId) {
      socket.close();
      return;
    }

    const room = await makeOrLoadRoom(roomId);
    room.handleSocketConnect({ sessionId, socket });
  } catch (error) {
    console.error('WebSocket connection error:', error);
    socket.close();
  }
});

console.log(`WebSocket server running on ws://localhost:${PORT}`);