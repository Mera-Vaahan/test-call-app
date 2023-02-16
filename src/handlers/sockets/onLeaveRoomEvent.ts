import { RoomEventProps } from './inerface'
import { REMOVE_PEER_EVENT } from '@/constants'
import { Server } from 'socket.io'

export function onLeaveRoomEvent({
    io, socket, iceServers, roomId
}: RoomEventProps) {
    io.of('/').adapter.rooms.get(roomId)?.forEach(otherSocketId => {
        // Emit remove-peer to new peer for all existing peers in the room
        socket.emit(REMOVE_PEER_EVENT, {
            peer_id: otherSocketId,
            should_create_offer: true,
            iceServers: iceServers,
        });
    });
    socket.leave(roomId);
}

interface PostLeavingRoomProps {
    io: Server;
    roomId: string;
    socketId: string;
    iceServers: any[];
}

export function postLeavingRoom({
    io, socketId, iceServers, roomId
}: PostLeavingRoomProps) {
    // Emit remove-peer to all existing peers in the room
    io.to(roomId).emit(REMOVE_PEER_EVENT, {
        peer_id: socketId,
        should_create_offer: false,
        iceServers: iceServers,
    });
}