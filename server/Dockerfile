# PocketBase on Railway/Render (§8.2). Pinned to a stable v0.39.x.
FROM alpine:latest
ARG PB_VERSION=0.39.4

RUN apk add --no-cache unzip ca-certificates wget

RUN wget -q https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip \
 && unzip pocketbase_${PB_VERSION}_linux_amd64.zip && rm pocketbase_${PB_VERSION}_linux_amd64.zip \
 && mv pocketbase /usr/local/bin/pocketbase

# Committed migrations build the schema on first boot (§8.2). Mount a
# persistent volume at /pb_data so data + the SQLite file survive redeploys.
COPY pb_migrations /pb_migrations
COPY pb_hooks /pb_hooks

EXPOSE 8090
CMD ["pocketbase", "serve", "--http=0.0.0.0:8090", "--dir=/pb_data", "--migrationsDir=/pb_migrations", "--hooksDir=/pb_hooks"]
