import { WebSocket, WebSocketServer } from 'ws';
import { wsArcjet } from '../arcjet.js';

function sendJson(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify(payload));
}

function broadcast(wss, payload) {
    for (const client of wss.clients) {
        if (client.readyState !== WebSocket.OPEN) continue;

        client.send(JSON.stringify(payload));
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
        sendJson(socket, { type: 'Welcome' });

        socket.on('error', console.error);
    });

    function broadcastMatchCreated(match) {
        broadcast(wss, { type: 'match_created', data: match });
    }

    return { broadcastMatchCreated };
}
