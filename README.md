<img src="./img/Banner.png">

# Stashly

A modern, containerized inventory management system designed to track physical items stored in boxes or containers using QR codes.

## System Requirements

- Docker Engine 20.10.0+
- Docker Compose 2.0.0+
- Node.js 18.x (for local development)
- npm 8.x (for local development)

## Project Structure

```
stashly/
├── docker-compose.yml          # Docker Compose configuration
├── .env.example               # Example environment variables
├── .gitignore                 # Git ignore rules
├── README.md                  # This file
├── pocketbase/               # PocketBase database service
│   ├── Dockerfile
│   ├── pb_migrations/        # Database migrations
│   └── backup-config.yml
├── webapp/                   # React web application
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
└── qr-service/              # QR code generation service
    ├── Dockerfile
    ├── package.json
    ├── tsconfig.json
    └── src/
```

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url> stashly
   cd stashly
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   # Edit .env with your configurations
   ```

3. Build and start services:
   ```bash
   docker-compose up --build -d
   ```

4. Access the services:
   - Web Application: http://localhost:3000
   - PocketBase Admin: http://localhost:8090/_/
   - QR Service: http://localhost:3001/health

## Development Setup

1. Install dependencies for all services:
   ```bash
   # Install webapp dependencies
   cd webapp
   npm install

   # Install QR service dependencies
   cd ../qr-service
   npm install
   ```

2. Start services in development mode:
   ```bash
   # Start all services
   docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

   # Or start individual services
   docker-compose up -d pocketbase
   cd webapp && npm run dev
   cd qr-service && npm run dev
   ```

## Testing

```bash
# Run webapp tests
cd webapp
npm test

# Run QR service tests
cd qr-service
npm test
```

## Database Migrations

```bash
# Apply migrations
docker-compose exec pocketbase ./pocketbase migrate up

# Create new migration
docker-compose exec pocketbase ./pocketbase migrate create
```

## Backup and Restore

```bash
# Create backup
docker-compose exec pocketbase ./pocketbase backup

# Restore from backup
docker-compose exec pocketbase ./pocketbase restore ./backups/backup-file.zip
```

## Monitoring and Logs

```bash
# View logs for all services
docker-compose logs -f

# View logs for specific service
docker-compose logs -f webapp
```

## Security

- All services run with non-root users in containers
- HTTPS recommended for production
- Regular security updates via automated dependency updates
- Proper authentication and authorization implemented

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes (`git commit -am 'Add my feature'`)
4. Push to the branch (`git push origin feature/my-feature`)
5. Create a Pull Request

## Troubleshooting

See the [Troubleshooting Guide](docs/troubleshooting.md) for common issues and solutions.

## License

This project is licensed under the GNU GENERAL PUBLIC LICENSE Version 2 - see the [License](LICENCE) file for details.