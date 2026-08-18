# MediScribe AI - Local Deployment Guide

**Status:** ✅ **READY FOR LOCAL HOSTING**  
**Date:** August 16, 2026  
**Version:** 1.0.0

---

## 📋 **SYSTEM REQUIREMENTS**

### **Hardware Minimum**
- CPU: 2 cores (4 cores recommended)
- RAM: 4GB (8GB recommended)
- Storage: 10GB available disk space
- Network: Internet connection for Docker images

### **Software Requirements**
- **Docker:** 20.10+ ([Install Docker](https://docs.docker.com/install/))
- **Docker Compose:** 2.0+ ([Install Docker Compose](https://docs.docker.com/compose/install/))
- **Git:** (Optional, for cloning repository)
- **Node.js:** 18+ (for local development without Docker)

### **Operating Systems**
- ✅ Linux (Ubuntu 20.04+, Debian 11+, etc.)
- ✅ macOS (Intel & Apple Silicon)
- ✅ Windows (with WSL2 or Docker Desktop)

---

## 🚀 **QUICK START - 5 MINUTES**

### **1. Clone or Download Repository**
```bash
cd /path/to/mediscribe-ai
```

### **2. Configure Environment**
```bash
cp .env.example .env
# Edit .env with your settings (optional, defaults work for local dev)
```

### **3. Start Services**
```bash
./scripts/start.sh
```

### **4. Access Applications**
- **Main App:** http://localhost:4200
- **API Docs:** http://localhost:3000/api
- **pgAdmin:** http://localhost:5050
- **Redis Cmd:** http://localhost:8081

### **5. Stop Services**
```bash
docker-compose down
```

---

## 🏗️ **ARCHITECTURE**

### **Services Deployed**

```
┌─────────────────────────────────────────────────────┐
│            MediScribe AI - Local Stack               │
├─────────────────────────────────────────────────────┤
│                                                       │
│  ┌──────────────┐      ┌──────────────┐             │
│  │   Frontend   │◄────►│    Backend    │             │
│  │ (Angular)    │      │   (NestJS)    │             │
│  │ :4200        │      │    :3000      │             │
│  └──────────────┘      └───────┬──────┘             │
│                                 │                    │
│                    ┌────────────┼────────────┐       │
│                    │            │            │       │
│              ┌─────▼──┐    ┌────▼──┐    ┌──▼──┐     │
│              │PostgreSQL  │ Redis  │    │Redis Cmd  │
│              │ (DB)       │(Cache) │    │ (UI)      │
│              │ :5432      │ :6379  │    │ :8081     │
│              └────────────┘────────┘    └───────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │   pgAdmin (Database Management)              │   │
│  │   :5050                                      │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### **Services Overview**

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| **Frontend** | 4200 | http://localhost:4200 | Angular web application |
| **Backend API** | 3000 | http://localhost:3000 | NestJS REST API |
| **PostgreSQL** | 5432 | localhost:5432 | Primary database |
| **Redis** | 6379 | localhost:6379 | Cache & sessions |
| **pgAdmin** | 5050 | http://localhost:5050 | DB management |
| **Redis Cmd** | 8081 | http://localhost:8081 | Cache management |

---

## 📝 **DETAILED SETUP INSTRUCTIONS**

### **Step 1: Install Docker**

**Linux (Ubuntu/Debian):**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

**macOS:**
```bash
# Install via Homebrew
brew install --cask docker

# Or download Docker Desktop from: https://www.docker.com/products/docker-desktop

# Verify installation
docker --version
docker-compose --version
```

**Windows:**
- Download [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
- Install and follow setup wizard
- Enable WSL2 backend
- Verify: `docker --version`

### **Step 2: Prepare Repository**

```bash
# Clone repository (if you have git)
git clone https://github.com/yourusername/mediscribe-ai.git
cd mediscribe-ai

# OR download and extract ZIP file
cd /path/to/mediscribe-ai
```

### **Step 3: Configure Environment**

```bash
# Copy environment template
cp .env.example .env

# Edit .env file (optional - defaults work for local dev)
# nano .env  (on Linux/macOS)
# code .env  (with VS Code)
```

**Default Configuration (Works Out-of-Box):**
```
NODE_ENV=development
BACKEND_PORT=3000
FRONTEND_PORT=4200
DB_NAME=mediscribe
DB_USER=mediscribe_user
DB_PASSWORD=secure_password_change_me
REDIS_PASSWORD=redis_change_me
JWT_SECRET=your_jwt_secret_key_change_in_production_min_32_chars
CORS_ORIGIN=http://localhost:4200
```

### **Step 4: Start Services**

```bash
# Make script executable (Linux/macOS)
chmod +x scripts/start.sh

# Start services
./scripts/start.sh

# OR start manually with Docker Compose
docker-compose up -d
```

### **Step 5: Verify Services**

```bash
# Check running containers
docker ps

# Check service logs
docker-compose logs

# Check specific service
docker-compose logs backend
docker-compose logs frontend
```

### **Step 6: Access Applications**

Once services are running, access them at:

- **Frontend:** http://localhost:4200
- **Backend API:** http://localhost:3000
- **API Documentation:** http://localhost:3000/api
- **Database Tool (pgAdmin):** http://localhost:5050
  - Email: admin@mediscribe.local
  - Password: admin_change_me
- **Cache Tool (Redis Cmd):** http://localhost:8081

---

## 🛠️ **COMMON OPERATIONS**

### **View Logs**
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres

# Last 50 lines
docker-compose logs --tail=50
```

### **Stop Services**
```bash
# Stop but keep data
docker-compose stop

# Stop and remove containers (keep volumes)
docker-compose down

# Stop and remove everything (including data - ⚠️ BE CAREFUL)
docker-compose down -v
```

### **Rebuild Services**
```bash
# Rebuild all
docker-compose build

# Rebuild specific service
docker-compose build backend

# Rebuild and restart
docker-compose up -d --build
```

### **Reset Database**
```bash
# Remove and recreate database volume
docker-compose down -v postgres
docker-compose up -d postgres

# Wait for initialization
sleep 10
docker-compose logs postgres
```

### **Run Database Migrations**
```bash
# Run migrations in backend
docker-compose exec backend npm run typeorm migration:run

# Revert last migration
docker-compose exec backend npm run typeorm migration:revert
```

### **Run Tests**
```bash
# Run all tests
docker-compose exec backend npm run test

# Run with coverage
docker-compose exec backend npm run test:cov

# Run e2e tests
docker-compose exec backend npm run test:e2e
```

---

## 🐛 **TROUBLESHOOTING**

### **Services Won't Start**

**Problem:** Containers fail to start
```bash
# Check for errors
docker-compose logs

# Make sure ports are not in use
lsof -i :3000      # Backend
lsof -i :4200      # Frontend
lsof -i :5432      # PostgreSQL
lsof -i :6379      # Redis

# Kill process using port (if needed)
kill -9 <PID>
```

**Problem:** Permission denied on start.sh
```bash
# Fix permissions
chmod +x scripts/start.sh
```

### **Database Connection Issues**

**Problem:** Backend can't connect to PostgreSQL
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker-compose logs postgres

# Verify credentials in .env
cat .env | grep DB_

# Restart PostgreSQL
docker-compose restart postgres
```

### **Frontend Not Loading**

**Problem:** Blank page or 404 errors
```bash
# Check frontend logs
docker-compose logs frontend

# Check if API is accessible
curl http://localhost:3000/health

# Clear browser cache (Ctrl+Shift+Delete)
```

### **Redis Connection Issues**

**Problem:** Can't connect to Redis
```bash
# Check Redis is running
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli ping

# Restart Redis
docker-compose restart redis
```

### **Out of Disk Space**

**Problem:** Docker images/containers taking too much space
```bash
# Check space usage
docker system df

# Clean up unused images/containers
docker system prune -a --volumes

# OR remove everything (⚠️ Be careful!)
docker system prune --all --volumes
```

---

## 🔐 **SECURITY FOR LOCAL DEVELOPMENT**

### **Localhost Only Access**
By default, services only accept connections from localhost. To expose services externally (⚠️ NOT RECOMMENDED for development):

```bash
# In docker-compose.yml, change port mappings from:
ports:
  - "3000:3000"

# To:
ports:
  - "0.0.0.0:3000:3000"  # ⚠️ Only for testing!
```

### **Change Default Passwords**
```bash
# Edit .env
DB_PASSWORD=your_strong_password_here
REDIS_PASSWORD=your_redis_password_here
PGADMIN_PASSWORD=your_pgadmin_password_here
JWT_SECRET=your_jwt_secret_min_32_chars

# Rebuild containers
docker-compose down -v
docker-compose up -d
```

### **Firewall Rules (Linux)**
```bash
# Allow local connections only
sudo ufw allow from 127.0.0.1 to any port 3000
sudo ufw allow from 127.0.0.1 to any port 4200
sudo ufw allow from 127.0.0.1 to any port 5432
```

---

## 📊 **PERFORMANCE OPTIMIZATION**

### **Resource Limits**
Edit `docker-compose.yml` to limit resource usage:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 1G
```

### **Database Performance**
```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U mediscribe_user -d mediscribe

# Check index usage
SELECT schemaname, tablename, indexname FROM pg_indexes;

# Vacuum database
VACUUM ANALYZE;
```

---

## 🚢 **DEPLOYMENT CHECKLIST**

Before deploying to production:

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations run successfully
- [ ] SSL/TLS certificates configured
- [ ] Secrets properly managed (not in code)
- [ ] Logging configured
- [ ] Backups configured
- [ ] Monitoring configured
- [ ] Security audit completed
- [ ] Performance testing completed

---

## 📞 **SUPPORT & DOCUMENTATION**

### **Additional Resources**
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [NestJS Docs](https://docs.nestjs.com/)
- [Angular Docs](https://angular.io/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Redis Docs](https://redis.io/docs/)

### **Project Documentation**
- [System Overview](/SYSTEM_OVERVIEW.md)
- [Architecture](/ARCHITECTURE.md)
- [API Documentation](/API_DOCS.md)
- [Testing Guide](/TESTING_GUIDE.md)

---

## 📈 **NEXT STEPS**

Once system is running locally:

1. **Configure** your local environment
2. **Access** the application at http://localhost:4200
3. **Login** with demo credentials (see demo data)
4. **Explore** features and functionality
5. **Develop** additional features as needed
6. **Test** changes thoroughly
7. **Commit** to version control
8. **Deploy** to staging/production when ready

---

## 🎉 **SYSTEM STATUS**

| Component | Status | Port |
|-----------|--------|------|
| Backend API | ✅ Ready | 3000 |
| Frontend | ✅ Ready | 4200 |
| PostgreSQL | ✅ Ready | 5432 |
| Redis | ✅ Ready | 6379 |
| pgAdmin | ✅ Ready | 5050 |
| Redis Cmd | ✅ Ready | 8081 |

**Overall Status:** ✅ **READY FOR LOCAL DEVELOPMENT**

---

**Last Updated:** August 16, 2026  
**Next Update:** As needed  
**Maintainer:** MediScribe AI Team

