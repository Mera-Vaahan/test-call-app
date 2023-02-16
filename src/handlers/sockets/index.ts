import { Server, Socket } from 'socket.io'
import _ from 'lodash';
import { 
    GET_PEERS_EVENT,
    ICE_CANDIDATE_EVENT, JOIN_ROOM_EVENT,  LEAVE_ROOM_EVENT, 
    PEERS_RESULT_EVENT, 
    RELAY_ICE_EVENT, RELAY_SDP_EVENT, RTC_ANSWER_EVENT, RTC_CANDIDATE_EVENT, RTC_OFFER_EVENT, SESSION_DESCRIPTION_EVENT, SOCKET_BASE_NAMESPACE, SOCKET_DISCONNECT_EVENT, SOCKET_UPGRADE_EVENT 
} from '@/constants'
import { onRoomJoinEvent } from './onRoomJoinEvent';
import { onLeaveRoomEvent, postLeavingRoom } from './onLeaveRoomEvent';
import { AnswerEventData, CandidateEventData, OfferEventData } from './inerface';
const log = console;


const PORT = process.env.PORT ?? '3000';
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
const iceServers: any[] = [];
// Stun is always needed
iceServers.push({ urls: STUN_ENDPOINT });

if (turnEnabled) {
    iceServers.push({
        urls: turnUrls,
        username: turnUsername,
        credential: turnCredential,
    });
} else {
    // As backup if not configured, please configure your own in the .env file
    // https://www.metered.ca/tools/openrelay/
    iceServers.push({
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    });
}

export default function socketHandler(io: Server) {
    console.log(`HOST: (${HOST})`);

    io.on('connection', socket => {
        log.debug(`[${socket.id}] connection accepted. host: ${socket.handshake?.headers?.host?.split(':')[0]}`);

        const transport = socket.conn.transport.name; // in most cases, "polling"
        log.debug('[' + socket.id + '] Connection transport', transport);

        /**
         * Check upgrade transport
         */
        socket.conn.on(SOCKET_UPGRADE_EVENT, () => {
            const upgradedTransport = socket.conn.transport.name; // in most cases, "websocket"
            log.debug('[' + socket.id + '] Connection upgraded transport', upgradedTransport);
        });

        socket.on(JOIN_ROOM_EVENT, roomId => {
            const sockets = io.of(SOCKET_BASE_NAMESPACE).adapter.rooms.get(roomId);
            console.log("Sockets: ", sockets);
            socket.emit(PEERS_RESULT_EVENT, sockets? Array.from(sockets.keys()): []);
            onRoomJoinEvent({
                io, socket, iceServers, roomId
            });
        });
        
        socket.on(LEAVE_ROOM_EVENT, roomId => onLeaveRoomEvent({
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
        socket.on(RELAY_ICE_EVENT, async (config) => {
            let peer_id = config.peer_id;
            let ice_candidate = config.ice_candidate;

            log.debug('[' + socket.id + '] relay ICE-candidate to [' + peer_id + '] ', {
                address: config.ice_candidate,
            });
            io.to(peer_id).emit(ICE_CANDIDATE_EVENT, {
                peer_id: socket.id,
                ice_candidate
            });
        });

        /**
         * Relay SDP to peers
         */
        socket.on(RELAY_SDP_EVENT, async (config) => {
            let peer_id = config.peer_id;
            let session_description = config.session_description;

            log.debug('[' + socket.id + '] relay SessionDescription to [' + peer_id + '] ', {
                type: session_description.type,
            });
            io.to(peer_id).emit(SESSION_DESCRIPTION_EVENT, {
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

        });

        socket.on(RTC_OFFER_EVENT, async (data: OfferEventData) => {
            log.debug(`relay OFFER from ${socket.id} to ${data.peer_id}`);
            io.to(data.peer_id).emit(RTC_OFFER_EVENT, {
                offer: data.offer,
                peer_id: socket.id
            });
        });

        socket.on(RTC_ANSWER_EVENT, async (data: AnswerEventData) => {
            log.debug(`relay ANSWER from ${socket.id} to ${data.peer_id}`);
            io.to(data.peer_id).emit(RTC_ANSWER_EVENT, {
                peer_id: socket.id,
                answer: data.answer
            } as AnswerEventData);
        });

        socket.on(RTC_CANDIDATE_EVENT, (data: CandidateEventData) => {
            log.debug(`relay CANDIDATE from ${socket.id}`);
            socket.rooms.forEach(roomId => io.to(roomId).emit(RTC_CANDIDATE_EVENT, {
                candidate: data.candidate
            } as CandidateEventData));
        });

        socket.on(GET_PEERS_EVENT, async () => {
            const sockets = await io.of(SOCKET_BASE_NAMESPACE).adapter.fetchSockets({
                rooms: socket.rooms
            });
            socket.emit(PEERS_RESULT_EVENT, {
                peers: sockets
            });
        });
    });

    io.of(SOCKET_BASE_NAMESPACE).adapter.on(LEAVE_ROOM_EVENT, (roomId, socketId) => {
        console.log(`socket ${socketId} has left room ${roomId}`);
        postLeavingRoom({
            roomId, io, socketId, iceServers
        });
    });

}