import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { v4 as uuidv4 } from "uuid";

const app = express();
const PORT = 3000;

// Create HTTP server to attach WebSocket to
const server = createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server });

interface Client {
  ws: WebSocket;
  id: string;
  roomId?: string;
  name?: string;
}

const clients = new Map<string, Client>();
const rooms = new Map<string, Set<string>>(); // roomId -> Set<clientId>
const roomHosts = new Map<string, string>(); // roomId -> hostClientId

wss.on("connection", (ws) => {
  const clientId = uuidv4();
  const client: Client = { ws, id: clientId };
  clients.set(clientId, client);

  console.log(`Client connected: ${clientId}`);

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      handleMessage(client, data);
    } catch (e) {
      console.error("Invalid message format", e);
    }
  });

  ws.on("close", () => {
    handleDisconnect(client);
  });
});

function handleMessage(client: Client, data: any) {
  const { type, payload } = data;

  switch (type) {
    case "create_room": {
      const roomId = uuidv4().slice(0, 8); // Short ID for easier sharing
      client.roomId = roomId;
      client.name = payload.name || "Host";
      
      rooms.set(roomId, new Set([client.id]));
      roomHosts.set(roomId, client.id);
      
      client.ws.send(JSON.stringify({
        type: "room_created",
        payload: { roomId, clientId: client.id }
      }));
      break;
    }

    case "join_request": {
      const { roomId, name } = payload;
      if (!rooms.has(roomId)) {
        client.ws.send(JSON.stringify({ type: "error", payload: { message: "Room not found" } }));
        return;
      }

      client.roomId = roomId;
      client.name = name || "Guest";
      
      // Notify host
      const hostId = roomHosts.get(roomId);
      if (hostId && clients.has(hostId)) {
        clients.get(hostId)!.ws.send(JSON.stringify({
          type: "join_request",
          payload: { clientId: client.id, name: client.name }
        }));
      }
      break;
    }

    case "approve_join": {
      const { targetClientId } = payload;
      const targetClient = clients.get(targetClientId);
      
      if (targetClient && targetClient.roomId === client.roomId) {
        rooms.get(client.roomId!)?.add(targetClientId);
        
        // Notify target they are in
        targetClient.ws.send(JSON.stringify({
          type: "joined",
          payload: { roomId: client.roomId, clientId: targetClientId, isHost: false }
        }));

        // Notify everyone in room of new peer
        broadcastToRoom(client.roomId!, {
          type: "peer_joined",
          payload: { clientId: targetClientId, name: targetClient.name }
        }, targetClientId); // Don't send back to joiner yet, or do? Usually peer_joined is for others.

        // Send existing peers to the new joiner
        const peers = Array.from(rooms.get(client.roomId!) || []).filter(id => id !== targetClientId);
        targetClient.ws.send(JSON.stringify({
          type: "existing_peers",
          payload: { peers: peers.map(id => ({ id, name: clients.get(id)?.name })) }
        }));
      }
      break;
    }

    case "reject_join": {
      const { targetClientId } = payload;
      const targetClient = clients.get(targetClientId);
      if (targetClient) {
        targetClient.ws.send(JSON.stringify({ type: "error", payload: { message: "Host rejected your request" } }));
        targetClient.roomId = undefined;
      }
      break;
    }

    case "signal": {
      const { target, signal } = payload;
      const targetClient = clients.get(target);
      if (targetClient) {
        targetClient.ws.send(JSON.stringify({
          type: "signal",
          payload: { sender: client.id, signal }
        }));
      }
      break;
    }
    
    case "cursor_move": {
        // Broadcast cursor position to room
        if (client.roomId) {
            broadcastToRoom(client.roomId, {
                type: "cursor_update",
                payload: { clientId: client.id, position: payload.position }
            }, client.id);
        }
        break;
    }

    default:
      console.log("Unknown message type:", type);
  }
}

function handleDisconnect(client: Client) {
  console.log(`Client disconnected: ${client.id}`);
  clients.delete(client.id);
  
  if (client.roomId) {
    const room = rooms.get(client.roomId);
    if (room) {
      room.delete(client.id);
      
      // If host left, maybe close room or reassign? For now, just notify.
      if (roomHosts.get(client.roomId) === client.id) {
        broadcastToRoom(client.roomId, { type: "host_left" });
        rooms.delete(client.roomId);
        roomHosts.delete(client.roomId);
      } else {
        broadcastToRoom(client.roomId, {
          type: "peer_left",
          payload: { clientId: client.id }
        });
      }
    }
  }
}

function broadcastToRoom(roomId: string, message: any, excludeClientId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;

  const msgString = JSON.stringify(message);
  room.forEach(clientId => {
    if (clientId !== excludeClientId) {
      const client = clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(msgString);
      }
    }
  });
}

// Vite integration
async function startServer() {
  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
