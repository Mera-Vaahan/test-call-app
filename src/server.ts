import next from 'next'
import { createServer, Server } from 'http'
import * as socketio from 'socket.io'
import express, { Express } from 'express'
import socketHandler from './handlers/sockets'
import _ from 'lodash'

const DEV = process.env.NODE_ENV !== 'production'
const HOSTNAME = process.env.HOSTNAME || 'localhost'
const PORT = _.toNumber(process.env.PORT || '3000');

// when using middleware `hostname` and `port` must be provided below
const nextApp = next({ dev: DEV, hostname: HOSTNAME, port: PORT })
const nextHandler = nextApp.getRequestHandler()

nextApp.prepare().then(async () => {
  try {
    const app: Express = express();
    const server: Server = createServer(app);
    const io: socketio.Server = new socketio.Server();
    io.attach(server);
    socketHandler(io);
    
    app.get('/ping', (_, res) => {
      res.send('pong');
    });
    
    app.all('*', (req: any, res: any) => nextHandler(req, res));
    
    server.listen(PORT, HOSTNAME, undefined, () => {
      console.log(`> Ready on http://${HOSTNAME}:${PORT}`)
    });
  } catch (err) {
      console.error('Error in starting server',  err);
  }
});
