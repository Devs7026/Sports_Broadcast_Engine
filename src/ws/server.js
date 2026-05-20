import { WebSocket, WebSocketServer } from 'ws';
import { wsArcjet } from '../arcjet.js';

const matchSubscribers = new Map();

function subscribe(matchId, socket) {
    if (!matchSubscribers.has(matchId)) {
        matchSubscribers.set(matchId, new Set());
    }
    matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId, socket) {
    const subscribers = matchSubscribers.get(matchId);
    if (!subscribers) return;
    subscribers.delete(socket);
    if (subscribers.size === 0) {
        matchSubscribers.delete(matchId);
    }
}

function cleanupSubscriptions(socket) {
    for (const matchId of socket.subscriptions) {
        unsubscribe(matchId, socket);
    }
}

function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
    }
}

function broadcastToMatch(matchId, payload) {
    const subscribers = matchSubscribers.get(matchId);
    if (!subscribers || subscribers.size === 0) return;

    const message = JSON.stringify(payload);

    for (const client of subscribers) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

function handleMessage(socket, data) {
    let message;

    try {
        message = JSON.parse(data.toString());
    } catch {
        sendJson(socket, { type: "error", message: "Invalid JSON" });
    }

    if (message?.type === "subscribe" && Number.isInteger(message.matchId)) {
        subscribe(message.matchId, socket);
        socket.subscriptions.add(message.matchId);;
        sendJson(socket, { type: "subscribed", matchId: message.matchId });
        return;
    }

    if (message?.type === "unsubscribe" && Number.isInteger(message.matchId)) {
        unsubscribe(message.matchId, socket);
        socket.subscriptions.delete(message.matchId);
        sendJson(socket, { type: "unsubscribed", matchId: message.matchId });
        return;
    }
}

function rejectUpgrade(socket, statusCode, message) {
    socket.write(
        `HTTP/1.1 ${statusCode} ${message}\r\n` +
        `Connection: close\r\n` +
        `Content-Type: text/plain\r\n` +
        `Content-Length: ${Buffer.byteLength(message)}\r\n` +
        `\r\n` +
        message
    );
    socket.destroy();
}

export function attachWebSocketServer(server) {
    // noServer: true — we handle the upgrade manually so Arcjet runs before the handshake
    const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });

    server.on('upgrade', async (req, socket, head) => {
        // Only handle requests aimed at /ws
        if (req.url !== '/ws') {
            rejectUpgrade(socket, 404, 'Not Found');
            return;
        }

        if (wsArcjet) {
            try {
                const decision = await wsArcjet.protect(req);

                if (decision.isDenied()) {
                    if (decision.reason.isRateLimit()) {
                        rejectUpgrade(socket, 429, 'Too Many Requests');
                    } else {
                        rejectUpgrade(socket, 403, 'Access Denied');
                    }
                    return;
                }
            } catch (e) {
                console.error('Arcjet WS protection error:', e);
                rejectUpgrade(socket, 503, 'Service Unavailable');
                return;
            }
        }


        wss.handleUpgrade(req, socket, head, (ws) => {
            wss.emit('connection', ws, req);
        });
    });

    wss.on('connection', (socket) => {
        socket.subscriptions = new Set();
        sendJson(socket, { type: 'Welcome' });
        socket.on('message', (data) => {
            handleMessage(socket, data);
        })
        socket.on('error', () => {
            socket.terminate();
        })

        socket.on('close', () => {
            cleanupSubscriptions(socket);
        })
        socket.on('error', console.error);
    });

    function broadcastMatchCreated(match) {
        broadcastToAll(wss, { type: 'match_created', data: match });
    }

    function broadcastCommentary(matchId, comment) {
        broadcastToMatch(matchId, { type: 'commentary', data: comment });
    }

    return { broadcastMatchCreated, broadcastCommentary };
}
