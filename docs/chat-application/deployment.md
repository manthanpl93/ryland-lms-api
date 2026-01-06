# Deployment Guide

## Prerequisites

### System Requirements

- **Node.js**: v14.x or higher
- **MongoDB**: v4.4 or higher
- **Memory**: Minimum 512MB RAM (2GB+ recommended for production)
- **Storage**: 10GB+ for database
- **Network**: Open ports 3030 (API) and 27017 (MongoDB)

### Dependencies

All required npm packages are included in `package.json`:

```json
{
  "@feathersjs/feathers": "^4.5.x",
  "@feathersjs/socketio": "^4.5.x",
  "socket.io": "^4.x",
  "mongoose": "^6.x",
  "feathers-mongoose": "^8.x"
}
```

---

## Environment Configuration

### Environment Variables

Create a `.env` file or set environment variables:

```bash
# Node Environment
NODE_ENV=production

# Server Configuration
PORT=3030
HOST=0.0.0.0

# MongoDB Connection
MONGODB_CONNECTION_STRING=mongodb://localhost:27017
MONGODB_DB_NAME=ryland-lms

# JWT Configuration (already configured in existing app)
JWT_SECRET=your-secret-key-here

# Client URL for CORS
CLIENT_URL=https://your-frontend-domain.com

# Optional: Worker Socket Token (if using AI quiz features)
WORKER_SOCKET_TOKEN=your-worker-token
```

### Configuration Files

Update `config/production.json`:

```json
{
  "host": "0.0.0.0",
  "port": 3030,
  "public": "../public/",
  "mongodb": {
    "CONNECTION_STRING": "mongodb://localhost:27017",
    "DB_NAME": "ryland-lms"
  },
  "paginate": {
    "default": 50,
    "max": 100
  }
}
```

---

## Installation Steps

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/your-org/ryland-lms-api.git
cd ryland-lms-api

# Install dependencies
npm install

# Build TypeScript (if applicable)
npm run build
```

### 2. Database Setup

```bash
# Start MongoDB service
sudo systemctl start mongod

# Verify MongoDB is running
sudo systemctl status mongod

# Optional: Create database and user
mongo
> use ryland-lms
> db.createUser({
    user: "ryland_admin",
    pwd: "secure_password",
    roles: ["readWrite", "dbAdmin"]
  })
```

### 3. Initialize Database Indexes

Indexes are created automatically by Mongoose on first use, but you can verify:

```javascript
// Connect to MongoDB
mongo ryland-lms

// Verify conversations indexes
db.conversations.getIndexes()
// Should show:
// - { _id: 1 }
// - { participants: 1 }
// - { lastMessageAt: -1 }
// - { participants: 1 } (unique)

// Verify messages indexes
db.messages.getIndexes()
// Should show:
// - { _id: 1 }
// - { conversationId: 1, createdAt: -1 }
// - { senderId: 1, recipientId: 1, createdAt: -1 }
// - { conversationId: 1, isDeleted: 1 }
```

### 4. Start Application

```bash
# Development
npm run dev

# Production
npm start

# With PM2 (recommended)
pm2 start npm --name "ryland-lms-api" -- start
```

---

## Production Deployment

### Using PM2 (Recommended)

PM2 provides process management, monitoring, and automatic restarts.

#### Install PM2

```bash
npm install -g pm2
```

#### Create PM2 Ecosystem File

`ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'ryland-lms-api',
    script: './lib/index.js',
    instances: 2,  // Number of instances (use 'max' for all CPUs)
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3030,
      CLIENT_URL: 'https://your-frontend-domain.com'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

#### Start with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup

# Monitor
pm2 monit

# View logs
pm2 logs ryland-lms-api

# Restart
pm2 restart ryland-lms-api

# Stop
pm2 stop ryland-lms-api
```

### Using Docker

#### Dockerfile

```dockerfile
FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Build TypeScript
RUN npm run build

# Expose ports
EXPOSE 3030

# Start application
CMD ["npm", "start"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3030:3030"
    environment:
      - NODE_ENV=production
      - MONGODB_CONNECTION_STRING=mongodb://mongo:27017
      - MONGODB_DB_NAME=ryland-lms
      - CLIENT_URL=https://your-frontend-domain.com
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:4.4
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
```

#### Deploy with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop
docker-compose down
```

---

## Load Balancing

### Nginx Configuration

For multiple server instances, use Nginx as a reverse proxy and load balancer.

#### `/etc/nginx/sites-available/ryland-lms-api`

```nginx
upstream ryland_api {
    # Enable sticky sessions for Socket.IO
    ip_hash;
    
    server 127.0.0.1:3030;
    server 127.0.0.1:3031;
    server 127.0.0.1:3032;
}

server {
    listen 80;
    server_name api.your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

    # Socket.IO WebSocket support
    location /chat-socket/ {
        proxy_pass http://ryland_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # REST API
    location / {
        proxy_pass http://ryland_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ryland-lms-api /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL/TLS Configuration

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d api.your-domain.com

# Auto-renewal is configured by default
# Test renewal
sudo certbot renew --dry-run
```

---

## Monitoring

### Application Monitoring

#### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# Web dashboard
pm2 plus
```

#### Custom Health Check Endpoint

Add to your application:

```javascript
// In app.ts
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    socketConnections: app.get('chatIo')?.engine?.clientsCount || 0
  });
});
```

### Database Monitoring

#### MongoDB Monitoring

```javascript
// Connect to MongoDB
mongo ryland-lms

// Check current operations
db.currentOp()

// Server status
db.serverStatus()

// Database stats
db.stats()

// Collection stats
db.conversations.stats()
db.messages.stats()
```

#### Enable MongoDB Profiling

```javascript
// Profile slow queries (>100ms)
db.setProfilingLevel(1, { slowms: 100 })

// View slow queries
db.system.profile.find().sort({ ts: -1 }).limit(10)
```

### Log Management

#### Centralized Logging with Winston

Already configured in the application. Logs are written to:

- Console (stdout/stderr)
- File: `logs/app.log`
- Error file: `logs/error.log`

#### Log Rotation

Install `logrotate`:

```bash
# /etc/logrotate.d/ryland-lms-api
/var/www/ryland-lms-api/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## Scaling Considerations

### Vertical Scaling

**Single Server Optimization:**

1. **Increase MongoDB memory**:
   ```javascript
   // mongod.conf
   storage:
     wiredTiger:
       engineConfig:
         cacheSizeGB: 2
   ```

2. **Increase PM2 instances**:
   ```javascript
   // ecosystem.config.js
   instances: 'max'  // Use all CPU cores
   ```

3. **Enable MongoDB indexes**:
   All indexes are already configured in models.

### Horizontal Scaling

**Multiple Servers with Redis:**

When scaling to multiple servers, you need Redis for Socket.IO adapter:

#### Install Redis

```bash
sudo apt install redis-server
```

#### Update Application

```javascript
// In src/socket/chatSocket.js
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

function initializeSocketServer(app) {
  const httpServer = app.get('server');
  const io = new Server(httpServer, { /* ... */ });
  
  // Redis adapter for multi-server setup
  const pubClient = createClient({ url: 'redis://localhost:6379' });
  const subClient = pubClient.duplicate();
  
  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
  });
  
  // ... rest of initialization
}
```

#### Install Dependencies

```bash
npm install @socket.io/redis-adapter redis
```

---

## Security Checklist

### Application Security

- ✅ JWT authentication on all endpoints
- ✅ Input validation on all inputs
- ✅ SQL injection protection (Mongoose)
- ✅ XSS protection (sanitize output on frontend)
- ✅ Rate limiting (implement with express-rate-limit)
- ✅ CORS configuration (restrict to known origins)
- ✅ Helmet for HTTP headers
- ✅ HTTPS/TLS in production

### Database Security

- ✅ MongoDB authentication enabled
- ✅ MongoDB firewall rules (only allow app server)
- ✅ Regular backups
- ✅ Encrypted connections (TLS)
- ✅ Strong passwords
- ✅ Principle of least privilege (user permissions)

### Server Security

- ✅ Firewall configured (UFW or iptables)
- ✅ SSH key authentication
- ✅ Disable root login
- ✅ Regular security updates
- ✅ Fail2ban for intrusion prevention
- ✅ Regular log monitoring

---

## Backup Strategy

### Database Backups

#### Automated Backup Script

`backup-mongodb.sh`:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/var/backups/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="ryland-lms"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
mongodump --db $DB_NAME --out $BACKUP_DIR/$DATE

# Compress backup
tar -czf $BACKUP_DIR/$DATE.tar.gz -C $BACKUP_DIR $DATE
rm -rf $BACKUP_DIR/$DATE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/$DATE.tar.gz"
```

#### Setup Cron Job

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-mongodb.sh >> /var/log/mongodb-backup.log 2>&1
```

#### Restore from Backup

```bash
# Extract backup
tar -xzf /var/backups/mongodb/20251216_020000.tar.gz

# Restore database
mongorestore --db ryland-lms 20251216_020000/ryland-lms
```

---

## Troubleshooting

### Common Issues

#### 1. Socket Connection Fails

**Symptoms:**
- `connect_error` events on client
- "Authentication token required" errors

**Solutions:**
```bash
# Check JWT token is being sent
console.log(socket.handshake.query.token)

# Verify authentication service
curl -H "Authorization: Bearer TOKEN" http://localhost:3030/users

# Check CORS configuration
# Ensure CLIENT_URL matches your frontend domain
```

#### 2. Messages Not Persisting

**Symptoms:**
- Messages delivered via socket but not in database
- REST API returns empty messages

**Solutions:**
```bash
# Check MongoDB connection
mongo ryland-lms
> db.messages.find().limit(5)

# Verify services are registered
# Check src/services/index.ts includes conversations and messages

# Check for database errors in logs
pm2 logs ryland-lms-api | grep -i error
```

#### 3. High Memory Usage

**Symptoms:**
- Application restarts frequently
- "Max memory restart" in PM2 logs

**Solutions:**
```bash
# Increase memory limit in ecosystem.config.js
max_memory_restart: '2G'

# Monitor memory usage
pm2 monit

# Check for memory leaks
node --inspect lib/index.js
# Use Chrome DevTools to profile memory
```

#### 4. Slow Database Queries

**Symptoms:**
- API responses taking >1 second
- High database CPU usage

**Solutions:**
```javascript
// Enable profiling
db.setProfilingLevel(1, { slowms: 100 })

// Find slow queries
db.system.profile.find({ millis: { $gt: 100 } })

// Check index usage
db.messages.aggregate([{ $indexStats: {} }])

// Add missing indexes if needed
```

---

## Performance Tuning

### Database Optimization

```javascript
// MongoDB configuration (mongod.conf)
net:
  maxIncomingConnections: 1000

storage:
  wiredTiger:
    engineConfig:
      cacheSizeGB: 2
    collectionConfig:
      blockCompressor: snappy

operationProfiling:
  mode: slowOp
  slowOpThresholdMs: 100
```

### Application Optimization

```javascript
// Connection pooling
mongoose.connect(mongoURI, {
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
});

// Query optimization
db.messages.find({ conversationId })
  .select('content senderId createdAt')  // Only needed fields
  .limit(50)                             // Pagination
  .lean();                               // Plain objects (faster)
```

---

## Maintenance

### Regular Tasks

- **Daily**: Check application logs for errors
- **Weekly**: Review slow queries, check disk space
- **Monthly**: Security updates, dependency updates
- **Quarterly**: Performance review, capacity planning

### Update Procedure

```bash
# 1. Backup database
./backup-mongodb.sh

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm install

# 4. Run migrations (if any)
npm run migrate

# 5. Restart application
pm2 restart ryland-lms-api

# 6. Verify health
curl http://localhost:3030/health
```

---

## Support

For deployment issues:

1. Check application logs: `pm2 logs ryland-lms-api`
2. Check MongoDB logs: `sudo tail -f /var/log/mongodb/mongod.log`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Review this documentation
5. Contact development team

