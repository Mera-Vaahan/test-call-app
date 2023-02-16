import { Server, Socket } from 'Socket.IO'

export interface RoomEventProps {
    io: Server;
    socket: Socket;
    iceServers: any[];
    roomId: string;
}

export interface PeerJoinEventData {
    roomId: string;
    peer_name: string;
    peer_audio: any;
    peer_audio_status: string;
    peer_privacy_status: string;
}

export interface AddPeerData {
    peer_id: string;
    should_create_offer: boolean;
    iceServers: any[]
}

export interface OfferEventData {
    peer_id: string;
    offer: any;
}

export interface AnswerEventData {
    peer_id: string;
    answer: any;
}

export interface CandidateEventData {
    candidate: any;
    roomId: string;
}