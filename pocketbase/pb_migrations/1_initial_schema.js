{/* <reference path="../pb_types.d.ts" /> */}

migrate((db) => {
    // Create packages collection
    const packages = new Collection({
      name: 'packages',
      type: 'base',
      system: false,
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      schema: [
        {
          name: 'display_id',
          type: 'text',
          system: false,
          required: true,
          unique: true,
          options: {
            min: 3,
            max: 64,
            pattern: '^[A-Za-z0-9-_]+$'
          }
        },
        {
          name: 'location',
          type: 'text',
          system: false,
          required: true,
          options: {
            min: 1,
            max: 256
          }
        },
        {
          name: 'items',
          type: 'json',
          system: false,
          required: true
        },
        {
          name: 'images',
          type: 'json',
          system: false,
          required: false
        },
        {
          name: 'status',
          type: 'select',
          system: false,
          required: true,
          options: {
            values: ['active', 'archived', 'deleted']
          }
        },
        {
          name: 'created_by',
          type: 'text',
          system: false,
          required: true
        },
        {
          name: 'last_modified_by',
          type: 'text',
          system: false,
          required: true
        }
      ]
    });
  
    // Create categories collection
    const categories = new Collection({
      name: 'categories',
      type: 'base',
      system: false,
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      schema: [
        {
          name: 'name',
          type: 'text',
          system: false,
          required: true,
          unique: true,
          options: {
            min: 2,
            max: 64,
            pattern: '^[A-Za-z0-9- ]+$'
          }
        },
        {
          name: 'description',
          type: 'text',
          system: false,
          required: false
        },
        {
          name: 'parent_category',
          type: 'relation',
          system: false,
          required: false,
          options: {
            collectionId: 'categories',
            cascadeDelete: false,
            maxSelect: 1
          }
        }
      ]
    });
  
    // Create users collection with extended fields
    const users = new Collection({
      name: 'users',
      type: 'auth',
      system: false,
      listRule: '',
      viewRule: '',
      createRule: '',
      updateRule: '',
      deleteRule: '',
      schema: [
        {
          name: 'name',
          type: 'text',
          system: false,
          required: true,
          options: {
            min: 2,
            max: 128
          }
        },
        {
          name: 'role',
          type: 'select',
          system: false,
          required: true,
          options: {
            values: ['admin', 'manager', 'user']
          }
        },
        {
          name: 'active',
          type: 'bool',
          system: false,
          required: true,
          default: true
        }
      ]
    });
  
    return {
      packages,
      categories,
      users,
    };
  }, (db) => {
    // Revert migration
    const collections = ['packages', 'categories', 'users'];
    collections.forEach(collection => {
      db.deleteCollection(collection);
    });
  });