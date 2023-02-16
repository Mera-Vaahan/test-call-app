"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postLeavingRoom = exports.onLeaveRoomEvent = void 0;
const constants_1 = require("@/constants");
function onLeaveRoomEvent({ io, socket, iceServers, roomId }) {
    var _a;
    (_a = io.of('/').adapter.rooms.get(roomId)) === null || _a === void 0 ? void 0 : _a.forEach(otherSocketId => {
        // Emit remove-peer to new peer for all existing peers in the room
        socket.emit(constants_1.REMOVE_PEER_EVENT, {
            peer_id: otherSocketId,
            should_create_offer: true,
            iceServers: iceServers,
        });
    });
    socket.leave(roomId);
}
exports.onLeaveRoomEvent = onLeaveRoomEvent;
function postLeavingRoom({ io, socketId, iceServers, roomId }) {
    // Emit remove-peer to all existing peers in the room
    io.to(roomId).emit(constants_1.REMOVE_PEER_EVENT, {
        peer_id: socketId,
        should_create_offer: false,
        iceServers: iceServers,
    });
}
exports.postLeavingRoom = postLeavingRoom;
//# sourceMappingURL=onLeaveRoomEvent.js.map