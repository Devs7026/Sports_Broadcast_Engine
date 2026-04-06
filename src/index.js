import express from 'express';
import http from 'http';
import { matchRouter } from './routes/matches.js';
import { attachWebSocketServer } from './ws/server.js';

const app = express();
const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || '0.0.0.0';

const server = http.createServer(app);

// JSON middleware
app.use(express.json());

// Root GET route
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Sports Broadcast Engine API!' });
});

app.use('/matches', matchRouter);

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

// Start server and log the URL
server.listen(PORT, HOST, () => {
    const baseUrl = HOST === '0.0.0.0' ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;
    console.log(`Server is running at ${baseUrl}`);
    console.log(`WebSocket server running on ${baseUrl.replace('http', 'ws')}/ws`);
});
