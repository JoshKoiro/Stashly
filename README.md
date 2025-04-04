<img src="./imgs/Banner.png" alt="Stashly Banner"> <!-- Updated path assuming you moved logo to public -->

# Stashly - Inventory Management System

Stashly is a modern, containerized inventory management system designed to track physical items stored in boxes or containers using QR codes. Built with Node.js, Express, SQLite, and React, it provides an intuitive interface for managing your inventory.

## Features

-   Create and manage packages/containers with unique ID codes (e.g., `PKG-1234`)
-   Track package locations
-   Add, edit, and remove items within packages
-   Record item details like quantity, description, category, purchase price, and date
-   Upload and manage images for packages (including setting a primary image)
-   Generate and print QR code labels (Avery 5160 format) for selected package
-   Search packages by ID or item names within them
-   Filter packages by location
-   Mobile-ready responsive design with Light/Dark theme support
-   Containerized deployment option via Docker

## Prerequisites

-   Node.js (v18 or later recommended)
-   npm (v9 or later recommended)
-   Docker & Docker Compose (for containerized deployment)

## Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/JoshKoiro/Stashly.git
    ```
    ```bash
    cd stashly
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Create required directories (needed for local dev without Docker):
    ```bash
    mkdir -p data uploads
    ```

## Development

To start the development servers (frontend Vite server + backend Node server with hot-reloading):

```bash
npm run dev
```

This will make the application available at:

Frontend: http://localhost:5173 (Vite HMR)

Backend API: http://localhost:3000 (Requests from frontend are proxied)

## Building for Production
To build the optimized frontend assets and compile the backend TypeScript:
```bash
npm run build
```
This creates a dist directory containing dist/public (frontend assets) and dist/backend (compiled JS).

To start the production server without Docker:
```bash
npm start
```
The application will be served from http://localhost:3000 (or the port defined by the PORT environment variable).

## Deployment with Docker
This is the recommended way to deploy Stashly in production.

**Install Prerequisites**: Ensure you have Docker and Docker Compose installed on your deployment server.

**Clone Repository**: Clone the project repository onto your server.

**Create .env File**: Create a .env file in the project root directory (where docker-compose.yml is located). Define the host port you want to use:

```
APP_PORT=3000
```
**Build and Start**: Navigate to the project root in your terminal and run:
```bash
docker-compose up --build -d
```

**--build**: Builds the Docker image using the Dockerfile. Only needed the first time or after code changes.

**-d**: Runs the container in detached mode (in the background).

## Usage with Docker

**Access Stashly**: Open your web browser and navigate to http://<your_server_ip>:<APP_PORT> (e.g., http://localhost:3000 if running locally with APP_PORT=3000).

**View Logs**: To see the application logs, run:

```bash
docker-compose logs -f stashly-app
```

Press Ctrl+C to stop following the logs.

**Stop Stashly**: To stop the application container, run:

```bash
docker-compose down
```

**Data Persistence**: The docker-compose.yml configuration uses named Docker volumes (stashly_data, stashly_uploads). This means the SQLite database and uploaded images will persist even if you stop and restart or rebuild the container. To remove the volumes along with the container (e.g., for a clean start), use `docker-compose down -v`.

## API Endpoints

### Packages
- `GET /api/packages` - List packages (supports search, location, page, limit query params)
- `POST /api/packages` - Create a new package (Body: { location: string })
- `GET /api/packages/:id` - Get specific package details
- `PUT /api/packages/:id` - Update a package (Body: { location?: string })
- `DELETE /api/packages/:id` - Delete a package and its associated items/images
- `GET /api/packages/:id/qr` - Get package QR code data URL

### Items
- `GET /api/packages/:packageId/items` - List all items within a specific package
- `POST /api/packages/:packageId/items` - Add a new item to a package (Body: Item data)
- `GET /api/items/:id` - Get specific item details
- `PUT /api/items/:id` - Update an item (Body: Partial Item data)
- `DELETE /api/items/:id` - Delete an item

### Images
- `POST /api/images` - Upload an image (Multipart form data with image file and package_id or item_id)
- `GET /api/packages/:packageId/images` - List images associated with a package
- `GET /api/items/:itemId/images` - List images associated with an item
- `DELETE /api/images/:id` - Delete a specific image (also removes file from server)
- `PUT /api/packages/:packageId/images/:imageId/primary` - Set an image as the primary one for a package
- `DELETE /api/packages/:packageId/primary-image` - Unset the primary image for a package

### QR Code Labels
- `POST /api/qr-labels` - Generate a PDF of QR code labels for specified packages (Body: { packageIds: string[] })

### Locations
- `GET /api/locations` - Get a list of unique package locations currently in use

License
GPL-3.0 license
