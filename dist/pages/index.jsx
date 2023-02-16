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
const constants_1 = require("@/constants");
const react_1 = require("react");
const socket_io_client_1 = __importDefault(require("socket.io-client"));
function Hey() {
    const [socket, setSocket] = (0, react_1.useState)();
    const [input, setInput] = (0, react_1.useState)('');
    const localAudio = (0, react_1.useRef)(null);
    const remoteAudio = (0, react_1.useRef)(null);
    const [yourConn, setYourConn] = (0, react_1.useState)();
    (0, react_1.useEffect)(() => {
        socketInitializer();
    }, []);
    (0, react_1.useEffect)(() => {
        console.log("SOCKET: ", socket);
        if (socket) {
            if (yourConn) {
                yourConn.onicecandidate = function (event) {
                    console.log("On-Ice-Candidate: ", event);
                    if (event.candidate) {
                        console.log('ICE CANDIDATE: ', event.candidate);
                        console.log('Socket: ', socket);
                        socket === null || socket === void 0 ? void 0 : socket.emit(constants_1.RTC_CANDIDATE_EVENT, {
                            roomId: input,
                            candidate: {
                                sdpMLineIndex: event.candidate.sdpMLineIndex,
                                candidate: event.candidate.candidate,
                            }
                        });
                    }
                };
            }
            socket.on('connect', () => {
                console.log('connected');
            });
            socket.on(constants_1.ADD_PEER_EVENT, (data) => {
                // socket.emit(RTC_OFFER_EVENT, {
                //     peer_id: data.peer_id,
                //     offer: Math.random()
                // } as OfferEventData);
            });
            socket.on(constants_1.RTC_OFFER_EVENT, (data) => {
                yourConn === null || yourConn === void 0 ? void 0 : yourConn.setRemoteDescription(new RTCSessionDescription(data.offer));
                //create an answer to an offer 
                yourConn === null || yourConn === void 0 ? void 0 : yourConn.createAnswer().then(function (answer) {
                    yourConn.setLocalDescription(answer);
                    socket.emit(constants_1.RTC_ANSWER_EVENT, {
                        peer_id: data.peer_id,
                        answer
                    });
                });
            });
            socket.on(constants_1.RTC_ANSWER_EVENT, (data) => {
                yourConn === null || yourConn === void 0 ? void 0 : yourConn.setRemoteDescription(new RTCSessionDescription(data.answer));
                // yourConn?.restartIce();
            });
            socket.on(constants_1.RTC_CANDIDATE_EVENT, (data) => {
                if (yourConn === null || yourConn === void 0 ? void 0 : yourConn.remoteDescription) {
                    console.log("youConn.RemoteDescription: ", yourConn === null || yourConn === void 0 ? void 0 : yourConn.remoteDescription);
                    console.log("DATA from ICE-CANDIDATE: ", data);
                    yourConn === null || yourConn === void 0 ? void 0 : yourConn.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            });
            socket.on(constants_1.PEERS_RESULT_EVENT, (peers) => {
                peers.forEach(peer => {
                    yourConn === null || yourConn === void 0 ? void 0 : yourConn.createOffer().then(function (offer) {
                        socket.emit(constants_1.RTC_OFFER_EVENT, {
                            peer_id: peer, offer
                        });
                        yourConn === null || yourConn === void 0 ? void 0 : yourConn.setLocalDescription(offer);
                    });
                });
            });
        }
    }, [socket, yourConn]);
    return (<div>
            {socket && <div>User ID: {socket.id}</div>}
            <input placeholder="Type something" value={input} onChange={onChangeHandler}/>
            <button onClick={joinRoom}>Join</button>
            <button onClick={leaveRoom}>Leave</button>

            <div className="row"> 
                <div className="col-md-6 text-right"> 
                Local audio: 
                <audio id="localAudio" ref={localAudio} muted controls autoPlay></audio> 
                </div>
                    
                <div className="col-md-6 text-left"> 
                Remote audio: 
                <audio id="remoteAudio" ref={remoteAudio} controls autoPlay></audio> 
                </div>
            </div>
        </div>);
    function joinRoom() {
        socket === null || socket === void 0 ? void 0 : socket.emit(constants_1.JOIN_ROOM_EVENT, input);
    }
    function leaveRoom() {
        socket === null || socket === void 0 ? void 0 : socket.emit(constants_1.LEAVE_ROOM_EVENT, input);
    }
    function socketInitializer() {
        return __awaiter(this, void 0, void 0, function* () {
            yield fetch('/api/socket');
            // setSocket(io({transports: ['websocket']}));
            setSocket((0, socket_io_client_1.default)());
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
                document.getElementById('localAudio').srcObject = myStream;
                //using Google public stun server 
                const configuration = {
                    iceServers: [
                        { urls: "stun:stun2.1.google.com:19302" },
                        { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" }
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
                    document.getElementById('remoteAudio').srcObject = firstStream;
                };
                // Setup ice handling 
                conn.onicecandidate = function (candidate) {
                    console.log('ICE CANDIDATE: ', candidate);
                    console.log('Socket: ', socket);
                    if (candidate) {
                        socket === null || socket === void 0 ? void 0 : socket.emit(constants_1.RTC_CANDIDATE_EVENT, {
                            roomId: input,
                            candidate
                        });
                    }
                };
            }).catch(function (error) {
                console.log(error);
            });
        });
    }
    function onChangeHandler(e) {
        setInput(e.target.value);
    }
}
exports.default = Hey;
//# sourceMappingURL=index.jsx.map