# Production
FROM amd64/httpd:2.4.69-alpine AS production
COPY webroot/ /usr/local/apache2/htdocs/

# Development (webroot is mounted by docker-compose)
FROM httpd:2.4.69-alpine AS development
