# Stashly: Inventory Management System - Technical Specification

Stashly is a modern, containerized inventory management system designed to track physical items stored in boxes or containers using QR codes. The system allows users to document container contents through images and itemized lists, assign storage locations, and easily locate items through a searchable web interface. Built with scalability in mind, Stashly combines the simplicity of QR code scanning with the power of a full-featured web application to create an efficient, user-friendly inventory management solution.

## 0. Application Name and Branding

### 0.1 Name
1. **Stashly**
   - Combines "stash" (to store) with "-ly" suffix
   - Modern, friendly, and memorable
   - Available as a domain name
   - Easier to trademark than alternatives

### 0.2 Logo and Mascot Specifications
The logo features a chipmunk mascot named ... with the following characteristics:

Mascot Elements:
- Round glasses representing intelligence and attention to detail
- Tiny laptop or tablet suggesting technical proficiency
- Organized acorns in background implying storage expertise
- Smart but approachable expression
- Earth-tone color palette (browns, tans, with accent colors)

Logo Variations:
[TO BE DETERMINED]

Color Palette:
[TO BE DETERMINED]

### 0.3 Brand Voice
- Professional but friendly
- Efficient and organized
- Helper/assistant tone
- Technical but accessible
- Focus on organization and efficiency

## 1. System Overview

### 1.1 Purpose
A containerized web application for managing physical inventory through QR code-labeled packages, allowing users to track contents, locations, and associated images.

### 1.2 Architecture Overview
The system consists of three main containerized services:
1. PocketBase Database Service
2. Express.js Web Application
3. QR Code Generation Service

### 1.3 Technical Stack
- Database: PocketBase (embedded SQLite)
- Backend: Express.js
- Frontend: React.js
- Containerization: Docker & Docker Compose
- Image Storage: PocketBase built-in storage
- QR Code Generation: qrcode.js library

## 2. Data Models

### 2.1 Package Schema
```javascript
// PocketBase Collection: packages
{
    id: "string (auto-generated)", // Used in QR code URL
    created: "datetime",
    updated: "datetime",
    display_id: "string", // Format: YYYY-MM-DD-POCKETBASE_ID
    location: "string",
    items: [{
        name: "string",
        quantity: "number",
        description: "string?",
        category: "string?",
        purchase_price: "number?",
        purchase_date: "date?",
    }],
    images: [{
        file: "file",
        caption: "string?",
        is_primary: "boolean",
        order: "number"
    }]
}
```

### 2.2 Categories Schema
```javascript
// PocketBase Collection: categories
{
    id: "string",
    name: "string",
    created: "datetime",
    updated: "datetime"
}
```

## 3. API Endpoints

### 3.1 Package Management
```
GET    /api/packages           // List all packages
GET    /api/packages/:id      // Get single package
POST   /api/packages          // Create new package
PATCH  /api/packages/:id      // Update package
DELETE /api/packages/:id      // Delete package
GET    /api/packages/search   // Search packages by items or location
```

### 3.2 QR Code Generation
```
GET    /api/qr/single/:id          // Generate single QR code
POST   /api/qr/bulk                // Generate bulk QR codes PDF
    Request Body: {
        package_ids: string[]  // Array of package IDs to generate QR codes for
    }
    Response: application/pdf
GET    /api/qr/preview/:id         // Preview QR code label
```

### 3.3 Categories
```
GET    /api/categories             // List all categories
POST   /api/categories            // Create new category
DELETE /api/categories/:id        // Delete category
```

## 4. Frontend Specifications

### 4.1 Pages
1. Package List/Search Page
   - Search bar for items and location
   - Sortable table view with columns:
     - Display ID
     - Location
     - Created Date
     - Last Updated
     - Actions (Edit/Delete/Generate QR)
   - Bulk QR code generation functionality

2. Package Detail Page
   - Display/Edit package information
   - Image gallery with caption management
   - Item list management
   - Location management
   - QR code preview

### 4.2 Search Implementation
- Real-time search results as user types
- Filterable by:
  - Item contents
  - Location
  - Created date range
  - Last edited date range
- Sortable by:
  - Created date
  - Last edited date
  - Location

## 5. QR Code Generation

### 5.1 Label Specifications
- Size: 2.625" x 1"
- Layout:
  - Left side: QR code
  - Right side: Display ID and Location
  - Font: Arial or similar sans-serif
  - QR code content: URL to package detail page

### 5.2 Bulk Generation
- Fixed layout for 8.5x11" sticker paper
- PDF output
- Skip empty positions if fewer labels than page capacity
- URL encoded in QR: `http://<server-address>/packages/<id>`

## 6. Backup System

### 6.1 Configuration
```yaml
# backup-config.yml
backup:
  frequency: 24  # hours
  path: "/backup"
  retain_count: 7  # number of backups to keep
```

### 6.2 Implementation
- Automated daily backups of PocketBase database
- Backup files named with timestamp
- Rotation of old backups based on retain_count
- Backup directory mounted from host system

## 7. Docker Configuration

### 7.1 Container Structure
```yaml
services:
  pocketbase:
    build: ./pocketbase
    volumes:
      - pb_data:/pb/pb_data
      - pb_backups:/pb/backups
    ports:
      - "8090:8090"

  webapp:
    build: ./webapp
    depends_on:
      - pocketbase
    ports:
      - "3000:3000"

  qr-service:
    build: ./qr-service
    depends_on:
      - webapp
    ports:
      - "3001:3001"

volumes:
  pb_data:
  pb_backups:
```

### 7.2 Network Configuration
- Internal Docker network for inter-container communication
- Host network exposure only for webapp
- Local network access only

## 8. Security Considerations

### 8.1 Current Implementation
- Local network access only
- No authentication required
- Basic input validation and sanitization

### 8.2 Future Authentication Support
- Prepared for future authentication implementation
- Database schema supports user roles
- API endpoints structured for auth middleware

## 9. Development Guidelines

### 9.1 Code Structure
```
project/
├── docker-compose.yml
├── pocketbase/
│   ├── Dockerfile
│   └── pb_migrations/
├── webapp/
│   ├── Dockerfile
│   ├── src/
│   ├── public/
│   └── package.json
└── qr-service/
    ├── Dockerfile
    └── src/
```

### 9.2 Development Setup
1. Clone repository
2. Copy example.env to .env and configure
3. Run `docker-compose up --build`
4. Access webapp at http://localhost:3000

### 9.3 Deployment
1. Configure backup path in backup-config.yml
2. Ensure Docker and Docker Compose are installed
3. Run `docker-compose up -d`
4. Monitor logs with `docker-compose logs -f`

## 10. Future Considerations

### 10.1 Authentication
- User management system
- Role-based access control
- API authentication

### 10.2 Potential Features
- Box relationship tracking
- Advanced search capabilities
- Export/Import functionality
- Inventory reports
- Mobile app support