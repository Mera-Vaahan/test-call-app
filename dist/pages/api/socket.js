"use strict";
// import { Server } from 'socket.io'
// import socketHandler from '@/handlers/sockets';
Object.defineProperty(exports, "__esModule", { value: true });
function SocketHandler(req, res) {
    // if (res.socket.server.io) {
    //   console.log('Socket is already running');
    // } else {
    //   console.log('Socket is initializing');
    //   const io = new Server(res.socket.server);
    //   socketHandler(io);
    //   res.socket.server.io = io;
    // }
    res.end();
}
exports.default = SocketHandler;
//# sourceMappingURL=socket.js.map