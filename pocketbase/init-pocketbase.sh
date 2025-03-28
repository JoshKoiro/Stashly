#!/bin/bash
set -e

# Start PocketBase in the background
/pb/pocketbase serve --http=0.0.0.0:8090 &
PB_PID=$!

# Wait for PocketBase to start
echo "Waiting for PocketBase to start..."
until curl -s http://localhost:8090/api/health > /dev/null; do
  sleep 1
done
echo "PocketBase is running!"

# Check if initial setup is needed (look for admin collection)
ADMIN_RESPONSE=$(curl -s http://localhost:8090/api/collections/users/records || echo "")
if [[ $ADMIN_RESPONSE == *'"404"'* ]] || [[ $ADMIN_RESPONSE == "" ]]; then
  echo "First time setup: Creating admin user and collections..."
  
  # Create admin user
  echo "Creating admin user..."
  ADMIN_EMAIL="admin@stashly.local"
  ADMIN_PASSWORD="StashlyAdmin123!"
  
  # Wait for first boot setup to be available
  sleep 3
  
  # Use the first boot setup API to create the admin
  curl -s -X POST http://localhost:8090/api/admins -d '{
    "email": "'"$ADMIN_EMAIL"'",
    "password": "'"$ADMIN_PASSWORD"'",
    "passwordConfirm": "'"$ADMIN_PASSWORD"'"
  }' -H "Content-Type: application/json"
  
  echo "Admin user created!"
  
  # Login as admin
  echo "Logging in as admin..."
  AUTH_RESPONSE=$(curl -s -X POST http://localhost:8090/api/admins/auth-with-password -d '{
    "email": "'"$ADMIN_EMAIL"'",
    "password": "'"$ADMIN_PASSWORD"'"
  }' -H "Content-Type: application/json")
  
  TOKEN=$(echo $AUTH_RESPONSE | jq -r '.token')
  echo "Logged in successfully, got token: ${TOKEN:0:10}..."
  
  # Create packages collection
  echo "Creating packages collection..."
  curl -s -X POST http://localhost:8090/api/collections -d '{
    "name": "packages",
    "type": "base",
    "schema": [
      {
        "name": "display_id",
        "type": "text",
        "required": true
      },
      {
        "name": "location",
        "type": "text",
        "required": true
      },
      {
        "name": "items",
        "type": "json",
        "required": true
      },
      {
        "name": "images",
        "type": "json"
      },
      {
        "name": "status",
        "type": "select",
        "options": {
          "values": ["active", "archived", "deleted"]
        },
        "required": true,
        "default": "active"
      },
      {
        "name": "created_by",
        "type": "text"
      },
      {
        "name": "last_modified_by",
        "type": "text"
      }
    ]
  }' -H "Content-Type: application/json" -H "Authorization: Admin ${TOKEN}"
  
  # Create categories collection
  echo "Creating categories collection..."
  curl -s -X POST http://localhost:8090/api/collections -d '{
    "name": "categories",
    "type": "base",
    "schema": [
      {
        "name": "name",
        "type": "text",
        "required": true
      },
      {
        "name": "description",
        "type": "text"
      },
      {
        "name": "parent_category",
        "type": "relation",
        "required": false,
        "options": {
          "collectionId": "categories",
          "cascadeDelete": false
        }
      }
    ]
  }' -H "Content-Type: application/json" -H "Authorization: Admin ${TOKEN}"
  
  # Set public read access for collections
  echo "Setting up public access for collections..."
  COLLECTIONS=("packages" "categories")
  
  for COLLECTION in "${COLLECTIONS[@]}"; do
    echo "Setting public read access for $COLLECTION..."
    curl -s -X PATCH http://localhost:8090/api/collections/$COLLECTION -d '{
      "listRule": "@request.auth.id != \"\" || true",
      "viewRule": "@request.auth.id != \"\" || true",
      "createRule": "@request.auth.id != \"\"",
      "updateRule": "@request.auth.id != \"\"",
      "deleteRule": "@request.auth.id != \"\""
    }' -H "Content-Type: application/json" -H "Authorization: Admin ${TOKEN}"
  done
  
  # Add some sample data
  echo "Adding sample data..."
  # Add a few categories
  curl -s -X POST http://localhost:8090/api/collections/categories/records -d '{
    "name": "Electronics",
    "description": "Electronic devices and components"
  }' -H "Content-Type: application/json" -H "Authorization: Admin ${TOKEN}"
  
  curl -s -X POST http://localhost:8090/api/collections/categories/records -d '{
    "name": "Office Supplies",
    "description": "Supplies used in an office environment"
  }' -H "Content-Type: application/json" -H "Authorization: Admin ${TOKEN}"
  
  # Add a few packages
  curl -s -X POST http://localhost:8090/api/collections/packages/records -d '{
    "display_id": "PKG-001",
    "location": "A1",
    "items": [
      {
        "name": "Laptop",
        "quantity": 1,
        "description": "MacBook Pro 15-inch",
        "category": "Electronics"
      }
    ],
    "images": [],
    "status": "active",
    "created_by": "system",
    "last_modified_by": "system"
  }' -H "Content-Type: application/json" -H "Authorization: Admin ${TOKEN}"
  
  curl -s -X POST http://localhost:8090/api/collections/packages/records -d '{
    "display_id": "PKG-002",
    "location": "B2",
    "items": [
      {
        "name": "Pens",
        "quantity": 20,
        "description": "Blue ballpoint pens",
        "category": "Office Supplies"
      },
      {
        "name": "Notebooks",
        "quantity": 5,
        "description": "Lined spiral notebooks",
        "category": "Office Supplies"
      }
    ],
    "images": [],
    "status": "active",
    "created_by": "system",
    "last_modified_by": "system"
  }' -H "Content-Type: application/json" -H "Authorization: Admin ${TOKEN}"
  
  echo "Sample data added!"
  echo "Initial setup complete!"
else
  echo "Admin user already exists, skipping initial setup."
fi

# Wait for the PocketBase process
wait $PB_PID 