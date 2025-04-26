## Build
```sh
VERSION="0.2"
REGISTRY="host.docker.internal:5000"

# Build image
docker-compose --profile prod build

# Tag images
NAME_HTTP="${REGISTRY}/zombiegame-http"

docker tag zombiegame-http-prod ${NAME_HTTP}:${VERSION}
docker tag ${NAME_HTTP}:${VERSION} ${NAME_HTTP}:latest

# Push image to registry
docker push ${NAME_HTTP}:${VERSION}
docker push ${NAME_HTTP}:latest
```

#### Run build
```sh
docker run -d --name zombiegame-http --restart unless-stopped -p 8243:80 host.docker.internal:5000/zombiegame-http:latest
```
