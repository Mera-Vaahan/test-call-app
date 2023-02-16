import { useEffect, useRef, useState } from 'react'
import io, { Socket } from 'socket.io-client'
import { ADD_PEER_EVENT, JOIN_ROOM_EVENT, LEAVE_ROOM_EVENT, PEERS_RESULT_EVENT, RTC_ANSWER_EVENT, RTC_CANDIDATE_EVENT, RTC_OFFER_EVENT } from '../constants';
import { AddPeerData, AnswerEventData, CandidateEventData, OfferEventData } from '../handlers/sockets/inerface';

export default function Hey() {
    const [socket, setSocket] = useState<Socket>();
    const [input, setInput] = useState<string>('');
    const localAudio = useRef<HTMLAudioElement>(null);
    const remoteAudio = useRef<HTMLAudioElement>(null);
    const [yourConn, setYourConn] = useState<RTCPeerConnection>();

    useEffect(() => {
        socketInitializer()
    }, []);
    useEffect(() => {
        console.log("SOCKET: ", socket);
        if(socket) {
            if(yourConn) {
                yourConn.onicecandidate = function (event) { 
                    console.log("On-Ice-Candidate: ", event);
                    if (event.candidate) { 
                        console.log('ICE CANDIDATE: ', event.candidate);
                        console.log('Socket: ', socket);
                        socket?.emit(RTC_CANDIDATE_EVENT, {
                            roomId: input,
                            candidate: {
                                sdpMLineIndex: event.candidate.sdpMLineIndex,
                                candidate: event.candidate.candidate,
                            }
                        } as CandidateEventData); 
                    } 
                };
            }
            socket.on(ADD_PEER_EVENT, (data: AddPeerData) => {
                // socket.emit(RTC_OFFER_EVENT, {
                //     peer_id: data.peer_id,
                //     offer: Math.random()
                // } as OfferEventData);
            });
    
            socket.on(RTC_OFFER_EVENT, (data: OfferEventData) => {
                yourConn?.setRemoteDescription(new RTCSessionDescription(data.offer)); 
                //create an answer to an offer 
                yourConn?.createAnswer().then(function (answer) { 
                    yourConn.setLocalDescription(answer); 
                    socket.emit(RTC_ANSWER_EVENT, {
                        peer_id: data.peer_id,
                        answer
                    } as AnswerEventData);
                });
            });

            socket.on(RTC_ANSWER_EVENT, (data: AnswerEventData) => {
                yourConn?.setRemoteDescription(new RTCSessionDescription(data.answer));
                // yourConn?.restartIce();
            });

            socket.on(RTC_CANDIDATE_EVENT, (data: CandidateEventData) => {
                if(yourConn?.remoteDescription) {
                    console.log("youConn.RemoteDescription: ", yourConn?.remoteDescription);
                    console.log("DATA from ICE-CANDIDATE: ", data);
                    yourConn?.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            });

            socket.on(PEERS_RESULT_EVENT, (peers: string[]) => {
                peers.forEach(peer => {
                    yourConn?.createOffer().then(function (offer) { 
                        socket.emit(RTC_OFFER_EVENT, {
                            peer_id: peer, offer
                        } as OfferEventData);
                        yourConn?.setLocalDescription(offer); 
                    });
                });
            });
        }
    }, [ socket, yourConn ]);

    return (
        <div>
            {socket && <div>User ID: {socket.id}</div>}
            <input
            placeholder="Type something"
            value={input}
            onChange={onChangeHandler}
            />
            <button onClick={joinRoom}>Join</button>
            <button onClick={leaveRoom}>Leave</button>

            <div className="row"> 
                <div className="col-md-6 text-right"> 
                Local audio: 
                <audio 
                    id = "localAudio" 
                    ref={localAudio}
                    muted
                    controls autoPlay></audio> 
                </div>
                    
                <div className="col-md-6 text-left"> 
                Remote audio: 
                <audio id = "remoteAudio" 
                    ref={remoteAudio}
                    controls autoPlay></audio> 
                </div>
            </div>
        </div>
    );


    function joinRoom() {
        socket?.emit(JOIN_ROOM_EVENT, input);
    }

    function leaveRoom() {
        socket?.emit(LEAVE_ROOM_EVENT, input);
    }

    async function socketInitializer() {
        // setSocket(io({transports: ['websocket']}));
        setSocket(io('http://localhost:8000', {
            transports: [ "websocket" ],
            protocols: ['echo-protocol']
        }));

        //getting local audio stream 
        navigator.mediaDevices.getUserMedia({ video: false, audio: true })
        .then(function (myStream) { 
            // stream = myStream; 
            
            //displaying local audio stream on the page
            console.log('Local Audio: ', localAudio.current);
            console.log('FirstStream: ', myStream);
            // if(localAudio?.current?.srcObject) {
            //     (localAudio.current.srcObject as any) = myStream;
            // }
            (document.getElementById('localAudio') as any).srcObject = myStream;
            
            //using Google public stun server 
            const configuration = { 
                iceServers: [
                    { urls: "stun:stun2.1.google.com:19302" },
                    { urls:"turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject"}
                ] 
            }; 
            
            const conn = new RTCPeerConnection(configuration);

            setYourConn(conn);
            // setup stream listening 
            myStream.getTracks().forEach(track => {
                conn.addTrack(track, myStream);
            });
            
            //when a remote user adds stream to the peer connection, we display it 
            conn.ontrack = function (e) { 
                const firstStream = e.streams[0];
                console.log('Remote Audio: ', remoteAudio.current);
                console.log('FirstStream: ', e.streams[0]);
                // if(remoteAudio?.current?.srcObject) {
                //     (remoteAudio.current.srcObject as any) = firstStream
                // }
                (document.getElementById('remoteAudio') as any).srcObject = firstStream;
            }; 
            
            // Setup ice handling 
            conn.onicecandidate = function (candidate) { 
                console.log('ICE CANDIDATE: ', candidate);
                console.log('Socket: ', socket);
                if (candidate) { 
                    socket?.emit(RTC_CANDIDATE_EVENT, {
                        roomId: input,
                        candidate
                    } as CandidateEventData); 
                } 
            };  
            
        }).catch(function (error) { 
            console.log(error); 
        });
    }

    function onChangeHandler(e: any) {
        setInput(e.target.value);
    }
}
