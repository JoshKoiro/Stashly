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

# Let PocketBase fully initialize
sleep 5

# Create admin user
echo "Creating admin user..."
ADMIN_EMAIL="admin@stashly.local"
ADMIN_PASSWORD="StashlyAdmin123!"

# Try to create admin user
ADMIN_CREATE_RESPONSE=$(curl -s -X POST http://localhost:8090/api/admins -d '{
  "email": "'"$ADMIN_EMAIL"'",
  "password": "'"$ADMIN_PASSWORD"'",
  "passwordConfirm": "'"$ADMIN_PASSWORD"'"
}' -H "Content-Type: application/json")
echo "Admin create response: $ADMIN_CREATE_RESPONSE"

# Login as admin
echo "Logging in as admin..."
AUTH_RESPONSE=$(curl -s -X POST http://localhost:8090/api/admins/auth-with-password -d '{
  "email": "'"$ADMIN_EMAIL"'",
  "password": "'"$ADMIN_PASSWORD"'"
}' -H "Content-Type: application/json")

echo "Auth response: $AUTH_RESPONSE"
TOKEN=$(echo $AUTH_RESPONSE | jq -r '.token')
echo "Logged in with token: ${TOKEN:0:10}..."

# Force create collections (delete if exist)
echo "Checking collections..."
COLLECTIONS_RESPONSE=$(curl -s -X GET http://localhost:8090/api/collections -H "Authorization: Admin ${TOKEN}")
echo "Collections response: $COLLECTIONS_RESPONSE"

# Delete existing packages collection if it exists
echo "Deleting existing collections if any..."
for COLLECTION in "packages" "categories"; do
  curl -s -X DELETE http://localhost:8090/api/collections/${COLLECTION} -H "Authorization: Admin ${TOKEN}"
done

echo "Creating collections..."
# Create packages collection
echo "Creating packages collection..."
PACKAGES_CREATE_RESPONSE=$(curl -s -X POST http://localhost:8090/api/collections -d '{
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
}' -H "Content-Type: application/json" -H "Authorization: Admin ${TOKEN}")
echo "Packages collection creation response: $PACKAGES_CREATE_RESPONSE"

# Create categories collection
echo "Creating categories collection..."
CATEGORIES_CREATE_RESPONSE=$(curl -s -X POST http://localhost:8090/api/collections -d '{
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
}' -H "Content-Type: application/json" -H "Authorization: Admin ${TOKEN}")
echo "Categories collection creation response: $CATEGORIES_CREATE_RESPONSE"

# Set public read access for collections
echo "Setting up public access for collections..."
COLLECTIONS=("packages" "categories")

for COLLECTION in "${COLLECTIONS[@]}"; do
  echo "Setting public read access for $COLLECTION..."
  ACCESS_RESPONSE=$(curl -s -X PATCH http://localhost:8090/api/collections/$COLLECTION -d '{
    "listRule": "true",
    "viewRule": "true",
    "createRule": "@request.auth.id != \"\"",
    "updateRule": "@request.auth.id != \"\"",
    "deleteRule": "@request.auth.id != \"\""
  }' -H "Content-Type: application/json" -H "Authorization: Admin ${TOKEN}")
  echo "Access setting response for $COLLECTION: $ACCESS_RESPONSE"
done

# Add some sample data
echo "Adding sample data..."
# Add a few categories
CATEGORY1_RESPONSE=$(curl -s -X POST http://localhost:8090/api/collections/categories/records -d '{
  "name": "Electronics",
  "description": "Electronic devices and components"
}' -H "Content-Type: application/json" -H "Authorization: Admin ${TOKEN}")
echo "Category 1 creation response: $CATEGORY1_RESPONSE"

CATEGORY2_RESPONSE=$(curl -s -X POST http://localhost:8090/api/collections/categories/records -d '{
  "name": "Office Supplies",
  "description": "Supplies used in an office environment"
}' -H "Content-Type: application/json" -H "Authorization: Admin ${TOKEN}")
echo "Category 2 creation response: $CATEGORY2_RESPONSE"

# Add a few packages
PACKAGE1_RESPONSE=$(curl -s -X POST http://localhost:8090/api/collections/packages/records -d '{
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
}' -H "Content-Type: application/json" -H "Authorization: Admin ${TOKEN}")
echo "Package 1 creation response: $PACKAGE1_RESPONSE"

PACKAGE2_RESPONSE=$(curl -s -X POST http://localhost:8090/api/collections/packages/records -d '{
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
}' -H "Content-Type: application/json" -H "Authorization: Admin ${TOKEN}")
echo "Package 2 creation response: $PACKAGE2_RESPONSE"

echo "Checking final collection status..."
FINAL_COLLECTIONS=$(curl -s -X GET http://localhost:8090/api/collections -H "Authorization: Admin ${TOKEN}")
echo "Final collections: $FINAL_COLLECTIONS"

echo "Setup complete!"

# Wait for the PocketBase process
wait $PB_PID 