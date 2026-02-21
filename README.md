# 🏆 Real-Time Sports Broadcast Engine

A high-fidelity, production-ready backend engine that broadcasts live sports scores and play-by-play commentary in under 10 milliseconds. Built from the ground up to handle high-traffic live events, this project demonstrates advanced WebSocket architectural patterns, enterprise-grade security, and robust data persistence.

## 🚀 Overview

This project bypasses black-box "WebSocket-as-a-Service" platforms to teach and implement the core mechanics of real-time communication. It utilizes a hybrid architecture: a **REST API** for initial state and entity creation, and a **native WebSocket server** for instant, bi-directional live updates.

## ✨ Key Features

* **Sub-10ms Live Broadcasting:** Instantly pushes goals, fouls, and match events to connected clients.
* **Pub/Sub Architecture:** Implements selective room-based broadcasting. Users subscribe to specific `match_id` rooms, ensuring data is only sent to fans actively watching that game (saving bandwidth and client memory).
* **Advanced Connection Management:** Prevents "ghost connections" and server memory leaks using automated Ping/Pong heartbeats and stale socket cleanup.
* **Hybrid Routing (REST + WS):** Shares a single HTTP port for both Express REST routes and WebSocket upgrade requests.
* **Enterprise Security:** Secured by **Arcjet** to provide rate limiting and bot detection natively on both the HTTP endpoints and the WebSocket handshake.
* **Data Persistence & Validation:** Uses **PostgreSQL** (via Neon) and **Drizzle ORM** for stable data storage, with strict payload validation handled by **Zod**.
* **Application Performance Monitoring:** Integrated with **Site24x7 APM** to track latency, resource usage, and backend health under heavy load.

## 🛠 Tech Stack

* **Runtime & Framework:** Node.js, Express.js
* **WebSockets:** Native `ws` library
* **Database:** PostgreSQL (hosted on Neon)
* **ORM:** Drizzle ORM
* **Validation:** Zod
* **Security:** Arcjet (Rate limiting, bot protection)
* **Monitoring:** Site24x7 APM Insight

## 🏗 Architecture & Data Flow

1. **Initial Load:** A client makes a standard `GET /matches` request to fetch the initial schedule and scores.
2. **The Handshake:** The client connects to `ws://[domain]/ws`. The HTTP server upgrades the connection to a persistent TCP tunnel (HTTP 101 Switching Protocols).
3. **Subscription:** The client sends a targeted `{ "type": "subscribe", "matchId": 1 }` envelope. The server maps this socket to the specific match room.
4. **The Broadcast:** When an admin posts a new commentary event via `POST /matches/:id/commentary`, the Express route saves it to PostgreSQL and triggers the WebSocket server to push the JSON update strictly to the subscribers of that `matchId`.

## ⚙️ Installation & Setup

**1. Clone the repository**

```bash
git clone https://github.com/your-username/sports-broadcast-engine.git
cd sports-broadcast-engine

```

**2. Install dependencies**

```bash
npm install

```

**3. Configure Environment Variables**
Create a `.env` file in the root directory and add the following:

```env
PORT=8000
HOST=0.0.0.0
API_URL=http://localhost:8000

# Database
DATABASE_URL=postgres://[user]:[password]@[host]/[dbname]

# Arcjet Security
ARCJET_KEY=your_arcjet_key
ARCJET_ENV=development

# APM Insight (Optional)
SITE24X7_LICENSE_KEY=your_site24x7_key

```

**4. Setup the Database**
Generate the SQL files and migrate your schema to PostgreSQL:

```bash
npm run db:generate
npm run db:migrate

```

**5. Start the Server**

```bash
# Development mode with watch
npm run dev

# Production mode
npm start

```

## 📡 API Reference

### REST Endpoints

* `GET /matches` - Fetch a list of matches (ordered by newest).
* `POST /matches` - Create a new match (requires sport, teams, start/end times).
* `GET /matches/:id/commentary` - Fetch historical commentary events for a specific match.
* `POST /matches/:id/commentary` - Add a new commentary event (triggers a live WS broadcast).

### WebSocket Envelopes

Connect to: `ws://localhost:8000/ws`

**Client to Server (Subscribe to a match):**

```json
{
  "type": "subscribe",
  "matchId": 1
}

```

**Server to Client (Broadcasted Commentary):**

```json
{
  "type": "commentary",
  "data": {
    "minute": 42,
    "sequence": 128,
    "period": "First Half",
    "eventType": "Goal",
    "actor": "Alex Morgan",
    "message": "Goal! Powerful finish from the edge of the box."
  }
}

```

## 🛡 Security Rules

The application uses Arcjet to shield endpoints from malicious activity:

* **HTTP:** Blocks common bot/scraping signatures and limits traffic to 50 requests per 10-second sliding window.
* **WebSocket Handshake:** Strictly limits upgrade requests to 5 attempts per 2 seconds to prevent connection spamming and DDoS attacks.
