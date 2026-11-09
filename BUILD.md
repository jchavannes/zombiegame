## Build
```sh
VERSION="0.3"
REGISTRY="host.docker.internal:5000"

# Build image
docker-compose --profile prod build --pull

# Tag images
NAME_HTTP="${REGISTRY}/zombiegame-http"

docker tag zombiegame-http-prod ${NAME_HTTP}:${VERSION}
docker tag ${NAME_HTTP}:${VERSION} ${NAME_HTTP}:latest

# Push image to registry
docker push ${NAME_HTTP}:${VERSION}
docker push ${NAME_HTTP}:latest
```

#### Updating Apache
```sh
# 1. Bump the FROM lines in http/Dockerfile to the latest 2.4.x patch tag
# 2. Bump VERSION above, then rebuild, tag and push as in Build
# 3. Verify the running container
docker exec zombiegame-http httpd -v
```

#### Run build
```sh
docker run -d --name zombiegame-http --restart unless-stopped -p 8243:80 host.docker.internal:5000/zombiegame-http:latest
```
