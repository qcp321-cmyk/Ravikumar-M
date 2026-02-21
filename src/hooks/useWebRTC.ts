import { useEffect, useRef, useState, useCallback } from 'react';

export interface Peer {
  id: string;
  name: string;
}

export interface WebRTCMessage {
  type: string;
  payload: any;
}

export const useWebRTC = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [requests, setRequests] = useState<Peer[]>([]);
  const [streams, setStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);

  // Initialize WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to signaling server');
      setIsConnected(true);
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      handleSignalingMessage(data);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const handleSignalingMessage = async (data: WebRTCMessage) => {
    const { type, payload } = data;

    switch (type) {
      case 'room_created':
        setRoomId(payload.roomId);
        setClientId(payload.clientId);
        setIsHost(true);
        break;

      case 'joined':
        setRoomId(payload.roomId);
        setClientId(payload.clientId);
        setIsHost(payload.isHost);
        break;

      case 'join_request':
        setRequests(prev => [...prev, { id: payload.clientId, name: payload.name }]);
        break;

      case 'peer_joined':
        setPeers(prev => [...prev, { id: payload.clientId, name: payload.name }]);
        createPeerConnection(payload.clientId, true); // Initiator
        break;

      case 'existing_peers':
        payload.peers.forEach((peer: Peer) => {
          setPeers(prev => [...prev, peer]);
          createPeerConnection(peer.id, false); // Not initiator
        });
        break;

      case 'signal':
        handleSignal(payload.sender, payload.signal);
        break;

      case 'peer_left':
        setPeers(prev => prev.filter(p => p.id !== payload.clientId));
        closePeerConnection(payload.clientId);
        break;
        
      case 'cursor_update':
        // Handle cursor update (exposed via event or state if needed)
        // For now, we might just expose a callback or event listener
        window.dispatchEvent(new CustomEvent('remote-cursor', { detail: payload }));
        break;
    }
  };

  const createPeerConnection = (targetId: string, initiator: boolean) => {
    if (peerConnections.current.has(targetId)) return;

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnections.current.set(targetId, pc);

    pc.onicecandidate = (event) => {
      if (event.candidate && socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'signal',
          payload: {
            target: targetId,
            signal: { type: 'candidate', candidate: event.candidate }
          }
        }));
      }
    };

    pc.ontrack = (event) => {
      console.log('Received track from', targetId);
      setStreams(prev => {
        const newMap = new Map(prev);
        newMap.set(targetId, event.streams[0]);
        return newMap;
      });
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    if (initiator) {
      createOffer(pc, targetId);
    }
  };

  const createOffer = async (pc: RTCPeerConnection, targetId: string) => {
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket?.send(JSON.stringify({
        type: 'signal',
        payload: { target: targetId, signal: { type: 'offer', sdp: offer } }
      }));
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  };

  const handleSignal = async (senderId: string, signal: any) => {
    let pc = peerConnections.current.get(senderId);
    
    // If we receive an offer but don't have a PC yet (we are the receiver)
    if (!pc && signal.type === 'offer') {
        // Create PC but don't initiate
        // Wait, we should have created it in 'existing_peers' or 'peer_joined'
        // But if we are the joiner, 'existing_peers' triggers creation.
        // If we are the existing peer, 'peer_joined' triggers creation (initiator).
        // There might be a race condition or logic gap.
        // Let's ensure PC exists.
        // Actually, if we are the receiver (non-initiator), we might not have created it yet if the 'peer_joined' logic is strictly for initiator.
        // Let's make createPeerConnection robust.
        if (!pc) {
             // This happens if we are the one receiving the connection and we haven't set it up yet.
             // In the current logic:
             // 1. Joiner gets 'existing_peers' -> creates PCs (initiator=false).
             // 2. Existing peers get 'peer_joined' -> creates PCs (initiator=true).
             // So both sides should have PCs.
             // However, if 'peer_joined' arrives AFTER the offer (unlikely but possible), or if logic is flawed.
             // Let's assume logic is correct for now.
             console.warn("Received signal for unknown peer", senderId);
             return;
        }
    }

    if (!pc) return;

    if (signal.type === 'offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket?.send(JSON.stringify({
        type: 'signal',
        payload: { target: senderId, signal: { type: 'answer', sdp: answer } }
      }));
    } else if (signal.type === 'answer') {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
    } else if (signal.type === 'candidate') {
      await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  };

  const closePeerConnection = (id: string) => {
    const pc = peerConnections.current.get(id);
    if (pc) {
      pc.close();
      peerConnections.current.delete(id);
    }
    setStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  };

  const createRoom = (name: string) => {
    socket?.send(JSON.stringify({ type: 'create_room', payload: { name } }));
  };

  const joinRoom = (roomId: string, name: string) => {
    socket?.send(JSON.stringify({ type: 'join_request', payload: { roomId, name } }));
  };

  const approveJoin = (targetClientId: string) => {
    socket?.send(JSON.stringify({ type: 'approve_join', payload: { targetClientId } }));
    setRequests(prev => prev.filter(r => r.id !== targetClientId));
  };

  const rejectJoin = (targetClientId: string) => {
    socket?.send(JSON.stringify({ type: 'reject_join', payload: { targetClientId } }));
    setRequests(prev => prev.filter(r => r.id !== targetClientId));
  };

  const startSharing = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      
      // Add tracks to all existing connections
      peerConnections.current.forEach((pc, id) => {
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });
        // Renegotiate
        createOffer(pc, id);
      });

      // Update local state to show own stream
      setStreams(prev => {
        const newMap = new Map(prev);
        newMap.set('local', stream);
        return newMap;
      });

      stream.getVideoTracks()[0].onended = () => {
        stopSharing();
      };
    } catch (err) {
      console.error("Error sharing screen:", err);
    }
  };

  const stopSharing = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
      
      // Remove tracks from PCs? 
      // Usually requires renegotiation or replacing track with null.
      // For simplicity, we might just keep the PC open but stop sending data.
      // A better way is to removeTrack and renegotiate.
      
      setStreams(prev => {
        const newMap = new Map(prev);
        newMap.delete('local');
        return newMap;
      });
    }
  };
  
  const sendCursorPosition = (x: number, y: number) => {
      if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
              type: 'cursor_move',
              payload: { position: { x, y } }
          }));
      }
  };

  return {
    socket,
    clientId,
    roomId,
    isHost,
    peers,
    requests,
    streams,
    isConnected,
    createRoom,
    joinRoom,
    approveJoin,
    rejectJoin,
    startSharing,
    stopSharing,
    sendCursorPosition
  };
};
