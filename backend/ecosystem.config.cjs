module.exports = {
  apps: [{
    name: 'guestroom-backend',
    script: './index.js',
    instances: 1,
    exec_mode: 'fork',
    
    // ✅ CRITICAL: Tell PM2 where to find .env
    env_file: '.env',
    
    // Alternative: Explicitly set env vars
    env: {
      NODE_ENV: 'production',
      PORT: 10000
    },
    
    // Auto-restart settings
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    
    // Logging
    error_file: '/home/ubuntu/.pm2/logs/guestroom-backend-error.log',
    out_file: '/home/ubuntu/.pm2/logs/guestroom-backend-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Node.js specific
    node_args: '--no-warnings',
    interpreter: 'node',
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    // Startup includes MongoDB connection and seed checks, so allow enough time
    // and wait for the explicit "ready" signal sent after server.listen().
    listen_timeout: 120000
  }]
};
