# ==========================================
# Voiceflow AI Frontend - Production Dockerfile
# Multi-Stage Build: Vite Build -> Nginx SPA Server
# ==========================================
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Set Vite build environment variables
ENV VITE_API_URL=""
ENV VITE_FIREBASE_API_KEY="AIzaSyAY4UmzzbUoH6MSOEunG9HjPcYqKblhKxg"
ENV VITE_FIREBASE_AUTH_DOMAIN="ai-chatbot-voiceflow-2840c.firebaseapp.com"
ENV VITE_FIREBASE_PROJECT_ID="ai-chatbot-voiceflow-2840c"
ENV VITE_FIREBASE_STORAGE_BUCKET="ai-chatbot-voiceflow-2840c.firebasestorage.app"
ENV VITE_FIREBASE_MESSAGING_SENDER_ID="159576126320"
ENV VITE_FIREBASE_APP_ID="1:159576126320:web:6d96f56a6bb8c8df1b95b5"

RUN npm run build

# Production Server Stage
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html

# Nginx Single Page Application routing configuration
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
