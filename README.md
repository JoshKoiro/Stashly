<img src="./imgs/Banner.png">

# Stashly - Modern Inventory Management System

Stashly is a modern, containerized inventory management system designed to track physical items stored in boxes or containers using QR codes. Built with Node.js, SQLite, and React, it provides an intuitive interface for managing your inventory.

## Features

- Create and manage packages/containers with unique QR codes
- Add, edit, and remove items within packages
- Upload and manage images for packages and items
- Generate and print QR code labels for packages
- Mobile-ready responsive design
- Modern and intuitive user interface

## Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/stashly.git
   cd stashly
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create required directories:
   ```bash
   mkdir -p data uploads
   ```

## Development

To start the development server:

```bash
npm run dev
```

This will start both the frontend and backend servers:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Building for Production

To build the application for production:

```bash
npm run build
```

To start the production server:

```bash
npm start
```

## Project Structure

```
stashly/
├── src/
│   ├── frontend/           # React frontend application
│   │   ├── components/     # React components
│   │   └── main.tsx       # Frontend entry point
│   └── backend/           # Node.js backend application
│       ├── db/            # Database models and configuration
│       └── server.ts      # Backend entry point
├── data/                  # SQLite database files
├── uploads/              # Uploaded images
└── design-example/       # Design reference files
```

## API Endpoints

### Packages

- `GET /api/packages` - List all packages
- `POST /api/packages` - Create a new package
- `GET /api/packages/:id` - Get package details
- `PUT /api/packages/:id` - Update a package
- `DELETE /api/packages/:id` - Delete a package
- `GET /api/packages/:id/qr` - Get package QR code

### Items

- `GET /api/packages/:packageId/items` - List items in a package
- `POST /api/packages/:packageId/items` - Add item to a package
- `GET /api/items/:id` - Get item details
- `PUT /api/items/:id` - Update an item
- `DELETE /api/items/:id` - Delete an item

### Images

- `POST /api/packages/:packageId/images` - Upload package image
- `POST /api/items/:itemId/images` - Upload item image
- `GET /api/packages/:packageId/images` - List package images
- `GET /api/items/:itemId/images` - List item images
- `DELETE /api/images/:id` - Delete an image

### QR Code Labels

- `POST /api/qr-labels` - Generate QR code labels PDF

## License

ISC 