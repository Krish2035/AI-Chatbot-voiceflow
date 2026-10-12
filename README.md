# Voiceflow AI - Top 1% Tier Scalable Architecture

An enterprise-grade, high-availability architecture for the **Voiceflow AI Chatbot**, built with an **Nginx Load Balancer**, **Drizzle ORM**, **PostgreSQL Read Replicas**, **Full-Text Search Indexing**, **Redis Cache**, **BullMQ Background Queues**, **JWT + Firebase Google Authentication**, and **Docker Compose Orchestration**.

---

## 🚀 One-Command Full Stack Startup

To wake up **all services** across the entire stack, open your terminal (or run Docker Desktop) and execute:

```bash
docker compose up -d --build
```
*(Or double-click `run-docker.bat` on Windows)*

---

## 🏗️ Services Architecture

When you run `docker compose up -d`, the following 7 services wake up automatically:

| Container Name | Service | Port | Description |
| :--- | :--- | :--- | :--- |
| `voiceflow-load-balancer` | **Nginx Load Balancer** | `80`, `5000` | Reverse proxy with least-connections balancing across backend instances, gzip compression, and 30MB audio upload support. |
| `voiceflow-backend-1` | **Backend Replica 1** | Internal `5000` | Node.js cluster node running Drizzle ORM, multi-key Groq/HF pool, rate limiting, and JWT auth. |
| `voiceflow-backend-2` | **Backend Replica 2** | Internal `5000` | Horizontally-scaled second instance sharing live load from the load balancer. |
| `voiceflow-frontend` | **Frontend SPA** | Internal `80` | Production React/Vite Single Page Application with voice visualizer, Firebase Google sign-in, and auth modal. |
| `voiceflow-postgres-primary` | **PostgreSQL Primary** | `5432` | Write Master database handling user registrations, new messages, and conversation updates. |
| `voiceflow-postgres-replica` | **PostgreSQL Read Replica**| `5433` | Dedicated read node handling high-throughput queries, conversation listings, and search indexing. |
| `voiceflow-redis` | **Redis Cache & BullMQ** | `6379` | In-memory distributed caching for conversation turns, rate limit state, and BullMQ background task workers. |

---

## 🌐 Endpoints & URLs

- **Web Application**: [http://localhost](http://localhost) (or [http://localhost:5000](http://localhost:5000))
- **Interactive Swagger UI**: [http://localhost/api-docs](http://localhost/api-docs)
- **Infrastructure Health Check**: [http://localhost/api/health](http://localhost/api/health)
- **Full-Text Search API**: `http://localhost/api/history/search?q=your_query`

---

## 🛠️ Management Commands

```bash
# View status of all running services
docker compose ps

# View live streaming logs across all containers
docker compose logs -f

# View backend logs only
docker compose logs -f backend-1 backend-2

# Restart a specific service
docker compose restart load-balancer

# Stop and shut down all services
docker compose down
```

---

## 🛡️ Security & Environment Variables

All confidential credentials (such as Google Firebase keys, Groq API keys, Hugging Face tokens, and database passwords) are stored in `.env` files and protected from Git publication via root `.gitignore`.
