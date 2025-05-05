import { TLSocketRoom } from '@tldraw/sync-core'

const rooms = new Map<string, TLSocketRoom>()

export async function makeOrLoadRoom(roomId: string) {
  let room = rooms.get(roomId)
  if (!room) {
    room = new TLSocketRoom({
      onDataChange: () => {
        // Optional: Handle data changes
      },
    })
    rooms.set(roomId, room)
  }
  return room
} 