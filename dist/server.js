"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const next_1 = __importDefault(require("next"));
const http_1 = require("http");
const url_1 = require("url");
const socket_io_1 = require("socket.io");
const sockets_1 = __importDefault(require("@/handlers/sockets"));
const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
// when using middleware `hostname` and `port` must be provided below
const app = (0, next_1.default)({ dev, hostname, port });
const handle = app.getRequestHandler();
app.prepare().then(() => {
    const server = (0, http_1.createServer)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            // Be sure to pass `true` as the second argument to `url.parse`.
            // This tells it to parse the query portion of the URL.
            const parsedUrl = (0, url_1.parse)((_a = req.url) !== null && _a !== void 0 ? _a : '', true);
            const { pathname, query } = parsedUrl;
            if (pathname === '/a') {
                yield app.render(req, res, '/a', query);
            }
            else if (pathname === '/b') {
                yield app.render(req, res, '/b', query);
            }
            else {
                yield handle(req, res, parsedUrl);
            }
        }
        catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    })).listen(port, hostname, undefined, () => {
        console.log(`> Ready on http://${hostname}:${port}`);
    });
    const io = new socket_io_1.Server({
        maxHttpBufferSize: 1e7,
        transports: ['websocket'],
    }).listen(server);
    console.log('Attaching IO Server: ', io);
    (0, sockets_1.default)(io);
});
//# sourceMappingURL=server.js.map