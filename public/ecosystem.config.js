module.exports = {
  apps: [{
    name: 'student-orientation',
    script: 'server.js',
    cwd: '/home/ukmo/htdocs/ukmo.space',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '300M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/home/ukmo/logs/node-app-error.log',
    out_file: '/home/ukmo/logs/node-app-out.log',
    log_file: '/home/ukmo/logs/node-app-combined.log',
    time: true
  }]
};
