# Voiceflow AI Chatbot - Backend

Node.js + Express backend powering the Voiceflow conversational assistant with **Groq AI**, **Hugging Face**, **PostgreSQL conversational memory**, and **Whisper speech-to-text**.

---

## 🚀 Features

- **Conversational Memory**: Automatically manages multi-turn dialogue context across interactions.
- **PostgreSQL Persistence**: Saves conversation sessions and message history into relational tables (`conversations`, `messages`).
- **Groq API**: High-speed LLM inference (e.g., `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) and audio transcription via `whisper-large-v3`.
- **Hugging Face Inference**: Alternative open-source model execution.
- **Voice Pipeline**: Audio transcription and voice-ready conversational responses.
- **Secure `.env` Architecture**: API keys are isolated strictly on the backend.

---

## 📦 Setup & Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure your environment variables in `.env`:
   ```env
   PORT=5000
   GROQ_API_KEY=gsk_your_actual_groq_api_key
   HUGGINGFACE_API_KEY=hf_your_actual_hf_key
   PGHOST=localhost
   PGPORT=5432
   PGDATABASE=voiceflow_db
   PGUSER=postgres
   PGPASSWORD=postgres
   ```

4. Start the server:
   ```bash
   npm start
   # or for auto-reload during development:
   npm run dev
   ```

---

## 📡 API Endpoints

- `GET /api/health` — System status, API key detection, and DB connection check.
- `POST /api/chat` — Ask questions with automatic conversational memory.
  ```json
  {
    "message": "Hello, who are you?",
    "conversationId": "conv_optional_id",
    "provider": "groq",
    "voiceMode": false
  }
  ```
- `POST /api/voice/transcribe` — Transcribe voice audio file.
- `POST /api/voice/chat` — End-to-end voice question answering with memory.
- `GET /api/history/conversations` — List all conversations with message count.
- `GET /api/history/conversations/:id` — Retrieve messages for a specific conversation.
- `DELETE /api/history/conversations/:id` — Delete a conversation.
