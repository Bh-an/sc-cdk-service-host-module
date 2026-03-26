export const DEFAULT_NGINX_CONF = [
  'user nginx;',
  'worker_processes auto;',
  'error_log /var/log/nginx/error.log warn;',
  'pid /run/nginx.pid;',
  '',
  'events {',
  '  worker_connections 1024;',
  '}',
  '',
  'http {',
  '  include /etc/nginx/mime.types;',
  '  default_type application/octet-stream;',
  '  sendfile on;',
  '  keepalive_timeout 65;',
  '  include /etc/nginx/conf.d/*.conf;',
  '}',
].join('\n');

export function buildDefaultAppRoutesConfig(
  host: string,
  port: number,
  publicPort: number,
): string {
  return [
    'server {',
    `  listen ${publicPort} default_server;`,
    '  server_name _;',
    '',
    '  location / {',
    `    proxy_pass http://${host}:${port};`,
    '    proxy_http_version 1.1;',
    '    proxy_set_header Host $host;',
    '    proxy_set_header X-Real-IP $remote_addr;',
    '    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;',
    '    proxy_set_header X-Forwarded-Proto $scheme;',
    '  }',
    '}',
  ].join('\n');
}
