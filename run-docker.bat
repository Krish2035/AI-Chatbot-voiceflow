@echo off
echo ========================================================
echo   VOICEFLOW AI - STARTING ALL REPLICATED SERVICES
echo ========================================================
echo.
echo Launching:
echo  [1] Nginx Load Balancer (Port 80 & 5000)
echo  [2] Backend Instance 1 (Drizzle ORM + Search Indexing)
echo  [3] Backend Instance 2 (Drizzle ORM + Search Indexing)
echo  [4] Frontend SPA (Vite + Nginx)
echo  [5] PostgreSQL Primary (Port 5432)
echo  [6] PostgreSQL Read Replica (Port 5433)
echo  [7] Redis Cache & BullMQ Broker (Port 6379)
echo.

docker compose up -d --build

echo.
echo ========================================================
echo   STATUS: ALL SERVICES WAKING UP
echo ========================================================
echo.
echo Check running containers: docker compose ps
echo View live system logs:    docker compose logs -f
echo Load Balancer UI:         http://localhost
echo Swagger Documentation:    http://localhost/api-docs
echo.
pause
