FROM alpine:latest

ARG PB_VERSION=0.16.7

RUN apk add --no-cache \
    unzip \
    ca-certificates \
    tzdata \
    curl \
    jq \
    bash

# Download and unzip PocketBase
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pb.zip
RUN unzip /tmp/pb.zip -d /pb/ && \
    rm /tmp/pb.zip

WORKDIR /pb

# Create directories for data and backups
RUN mkdir -p /pb/pb_data /pb/backups

# Copy initialization script
COPY init-pocketbase.sh /pb/init-pocketbase.sh
RUN chmod +x /pb/init-pocketbase.sh

EXPOSE 8090

VOLUME ["/pb/pb_data", "/pb/backups"]

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8090/api/health || exit 1

# Start PocketBase with initialization
CMD ["/pb/init-pocketbase.sh"]