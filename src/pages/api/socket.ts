import { Server } from 'socket.io'
import socketHandler from '@/handlers/sockets';

export default function SocketHandler(req: any, res: any){
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    console.log('Socket is initializing');
    const io = new Server(res.socket.server);
    socketHandler(io);
    res.socket.server.io = io;
  }
  res.end();
}
