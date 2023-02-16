"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onRoomJoinEvent = void 0;
const constants_1 = require("@/constants");
function onRoomJoinEvent({ io, socket, roomId, iceServers }) {
    var _a;
    console.log(`Socket: ${socket.id} wants to join room: ${roomId}`);
    socket.join(roomId);
    // Emit add-peer to all existing peers in the room
    socket.to(roomId).emit(constants_1.ADD_PEER_EVENT, {
        peer_id: socket.id,
        should_create_offer: false,
        iceServers: iceServers,
    });
    (_a = io.of('/').adapter.rooms.get(roomId)) === null || _a === void 0 ? void 0 : _a.forEach(otherSocketId => {
        if (otherSocketId == socket.id)
            return;
        // Emit add-peer to new peer for all existing peers in the room
        socket.emit(constants_1.ADD_PEER_EVENT, {
            peer_id: otherSocketId,
            should_create_offer: true,
            iceServers: iceServers,
        });
    });
}
exports.onRoomJoinEvent = onRoomJoinEvent;
//# sourceMappingURL=onRoomJoinEvent.js.map