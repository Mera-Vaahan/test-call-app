import { AddPeerData, RoomEventProps } from './inerface'
import { ADD_PEER_EVENT } from '../../constants'


export function onRoomJoinEvent({
    io, socket, roomId, iceServers
}: RoomEventProps & { roomId: string }) {
    console.log(`Socket: ${socket.id} wants to join room: ${roomId}`);
    socket.join(roomId);

    // Emit add-peer to all existing peers in the room
    socket.to(roomId).emit(ADD_PEER_EVENT, {
        peer_id: socket.id,
        should_create_offer: false,
        iceServers: iceServers,
    } as AddPeerData);
    
    io.of('/').adapter.rooms.get(roomId)?.forEach(otherSocketId => {
        if(otherSocketId == socket.id) return;
        // Emit add-peer to new peer for all existing peers in the room
        socket.emit(ADD_PEER_EVENT, {
            peer_id: otherSocketId,
            should_create_offer: true,
            iceServers: iceServers,
        } as AddPeerData);
    });
}