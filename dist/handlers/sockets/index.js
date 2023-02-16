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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const constants_1 = require("@/constants");
const onRoomJoinEvent_1 = require("./onRoomJoinEvent");
const onLeaveRoomEvent_1 = require("./onLeaveRoomEvent");
const log = console;
const PORT = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : '3000';
const DOMAIN = process.env.DOMAIN;
const MAX_HTTP_BUFFER_SIZE = 1e7;
const API_KEY_SECRET = process.env.API_KEY_SECRET || 'web-rtc-default-secret';
const IS_HTTPS = process.env.HTTPS == 'true';
const HOST = `http${IS_HTTPS ? 's' : ''}://${DOMAIN}:${PORT}`;
// Stun config
const STUN_ENDPOINT = process.env.STUN || 'stun:stun.l.google.com:19302';
// Turn config
const turnEnabled = process.env.TURN_ENABLED == 'true' ? true : false;
const turnUrls = process.env.TURN_URLS;
const turnUsername = process.env.TURN_USERNAME;
const turnCredential = process.env.TURN_PASSWORD;
/**
* You should probably use a different stun-turn server
* doing commercial stuff, also see:
*
* https://github.com/coturn/coturn
* https://gist.github.com/zziuni/3741933
* https://www.twilio.com/docs/stun-turn
*
* Check the functionality of STUN/TURN servers:
* https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
*/
const iceServers = [];
// Stun is always needed
iceServers.push({ urls: STUN_ENDPOINT });
if (turnEnabled) {
    iceServers.push({
        urls: turnUrls,
        username: turnUsername,
        credential: turnCredential,
    });
}
else {
    // As backup if not configured, please configure your own in the .env file
    // https://www.metered.ca/tools/openrelay/
    iceServers.push({
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    });
}
function socketHandler(io) {
    console.log(`HOST: (${HOST})`);
    io.on('connection', socket => {
        var _a, _b, _c;
        log.debug(`[${socket.id}] connection accepted. host: ${(_c = (_b = (_a = socket.handshake) === null || _a === void 0 ? void 0 : _a.headers) === null || _b === void 0 ? void 0 : _b.host) === null || _c === void 0 ? void 0 : _c.split(':')[0]}`);
        const transport = socket.conn.transport.name; // in most cases, "polling"
        log.debug('[' + socket.id + '] Connection transport', transport);
        /**
         * Check upgrade transport
         */
        socket.conn.on(constants_1.SOCKET_UPGRADE_EVENT, () => {
            const upgradedTransport = socket.conn.transport.name; // in most cases, "websocket"
            log.debug('[' + socket.id + '] Connection upgraded transport', upgradedTransport);
        });
        socket.on(constants_1.JOIN_ROOM_EVENT, roomId => {
            const sockets = io.of(constants_1.SOCKET_BASE_NAMESPACE).adapter.rooms.get(roomId);
            console.log("Sockets: ", sockets);
            socket.emit(constants_1.PEERS_RESULT_EVENT, sockets ? Array.from(sockets.keys()) : []);
            (0, onRoomJoinEvent_1.onRoomJoinEvent)({
                io, socket, iceServers, roomId
            });
        });
        socket.on(constants_1.LEAVE_ROOM_EVENT, roomId => (0, onLeaveRoomEvent_1.onLeaveRoomEvent)({
            roomId, io, socket, iceServers
        }));
        /**
         * On peer join
         */
        // socket.on('join', async (data: PeerJoinEventData) => {
        //     // log.debug('Join room', data);
        //     // log.debug('[' + socket.id + '] join ', data);
        //     // const roomId = data.roomId;
        //     // const peer_name = data.peer_name;
        //     // const peer_audio = data.peer_audio;
        //     // const peer_audio_status = data.peer_audio_status;
        //     // const peer_privacy_status = data.peer_privacy_status;
        //     // if (roomId in socket.rooms) {
        //     //     return log.debug('[' + socket.id + '] [Warning] already joined', roomId);
        //     // }
        //     // // no channel aka room in channels init
        //     // if (!(channel in channels)) channels[channel] = {};
        //     // // no channel aka room in peers init
        //     // if (!(channel in peers)) peers[channel] = {};
        //     // // room locked by the participants can't join
        //     // if (peers[channel]['lock'] === true && peers[channel]['password'] != channel_password) {
        //     //     log.debug('[' + socket.id + '] [Warning] Room Is Locked', channel);
        //     //     return socket.emit('roomIsLocked');
        //     // }
        //     // // collect peers info grp by channels
        //     // peers[channel][socket.id] = {
        //     //     peer_name: peer_name,
        //     //     peer_video: peer_video,
        //     //     peer_audio: peer_audio,
        //     //     peer_video_status: peer_video_status,
        //     //     peer_audio_status: peer_audio_status,
        //     //     peer_screen_status: peer_screen_status,
        //     //     peer_hand_status: peer_hand_status,
        //     //     peer_rec_status: peer_rec_status,
        //     //     peer_privacy_status: peer_privacy_status,
        //     // };
        //     // log.debug('[Join] - connected peers grp by roomId', peers);
        //     // await addPeerTo(channel);
        //     // channels[channel][socket.id] = socket;
        //     // socket.channels[channel] = channel;
        //     // // Send some server info to joined peer
        //     // await sendToPeer(socket.id, sockets, 'serverInfo', {
        //     //     peers_count: Object.keys(peers[channel]).length,
        //     //     survey: {
        //     //         active: surveyEnabled,
        //     //         url: surveyURL,
        //     //     },
        //     // });
        // });
        /**
         * Relay ICE to peers
         */
        socket.on(constants_1.RELAY_ICE_EVENT, (config) => __awaiter(this, void 0, void 0, function* () {
            let peer_id = config.peer_id;
            let ice_candidate = config.ice_candidate;
            log.debug('[' + socket.id + '] relay ICE-candidate to [' + peer_id + '] ', {
                address: config.ice_candidate,
            });
            io.to(peer_id).emit(constants_1.ICE_CANDIDATE_EVENT, {
                peer_id: socket.id,
                ice_candidate
            });
        }));
        /**
         * Relay SDP to peers
         */
        socket.on(constants_1.RELAY_SDP_EVENT, (config) => __awaiter(this, void 0, void 0, function* () {
            let peer_id = config.peer_id;
            let session_description = config.session_description;
            log.debug('[' + socket.id + '] relay SessionDescription to [' + peer_id + '] ', {
                type: session_description.type,
            });
            io.to(peer_id).emit(constants_1.SESSION_DESCRIPTION_EVENT, {
                peer_id: socket.id,
                session_description: session_description,
            });
            // /**
            //  * On peer diconnected
            //  */
            // socket.on(SOCKET_DISCONNECT_EVENT, async (reason) => {
            //     for (let room in socket.rooms) {
            //         await removePeerFrom(channel);
            //     }
            //     log.debug('[' + socket.id + '] disconnected', { reason: reason });
            //     delete sockets[socket.id];
            // });
        }));
        socket.on(constants_1.RTC_OFFER_EVENT, (data) => __awaiter(this, void 0, void 0, function* () {
            log.debug(`relay OFFER from ${socket.id} to ${data.peer_id}`);
            io.to(data.peer_id).emit(constants_1.RTC_OFFER_EVENT, {
                offer: data.offer,
                peer_id: socket.id
            });
        }));
        socket.on(constants_1.RTC_ANSWER_EVENT, (data) => __awaiter(this, void 0, void 0, function* () {
            log.debug(`relay ANSWER from ${socket.id} to ${data.peer_id}`);
            io.to(data.peer_id).emit(constants_1.RTC_ANSWER_EVENT, {
                peer_id: socket.id,
                answer: data.answer
            });
        }));
        socket.on(constants_1.RTC_CANDIDATE_EVENT, (data) => {
            log.debug(`relay CANDIDATE from ${socket.id}`);
            socket.rooms.forEach(roomId => io.to(roomId).emit(constants_1.RTC_CANDIDATE_EVENT, {
                candidate: data.candidate
            }));
        });
        socket.on(constants_1.GET_PEERS_EVENT, () => __awaiter(this, void 0, void 0, function* () {
            const sockets = yield io.of(constants_1.SOCKET_BASE_NAMESPACE).adapter.fetchSockets({
                rooms: socket.rooms
            });
            socket.emit(constants_1.PEERS_RESULT_EVENT, {
                peers: sockets
            });
        }));
    });
    io.of(constants_1.SOCKET_BASE_NAMESPACE).adapter.on(constants_1.LEAVE_ROOM_EVENT, (roomId, socketId) => {
        console.log(`socket ${socketId} has left room ${roomId}`);
        (0, onLeaveRoomEvent_1.postLeavingRoom)({
            roomId, io, socketId, iceServers
        });
    });
}
exports.default = socketHandler;
//# sourceMappingURL=index.js.map