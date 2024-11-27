migrate((db) => {
  // Create packages collection with enhanced schema
  const packages = new Collection({
      name: 'packages',
      type: 'base',
      system: false,
      listRule: '@request.auth.id != "" && (@request.auth.role = "admin" || @request.auth.role = "manager")',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && (@request.auth.role = "admin" || @request.auth.role = "manager")',
      updateRule: '@request.auth.id != "" && (@request.auth.role = "admin" || @request.auth.role = "manager")',
      deleteRule: '@request.auth.id != "" && @request.auth.role = "admin"',
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
              name: 'category',
              type: 'relation',
              required: true,
              options: {
                  collectionId: 'categories',
                  cascadeDelete: false,
                  maxSelect: 1,
                  minSelect: 1
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
              type: 'file',
              system: false,
              required: false,
              options: {
                  maxSelect: 5,
                  maxSize: 5242880,
                  mimeTypes: ["image/jpeg", "image/png"],
                  thumbs: ["100x100", "300x300"]
              }
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
              name: 'notes',
              type: 'text',
              system: false,
              required: false,
              options: {
                  min: 0,
                  max: 1000
              }
          },
          {
              name: 'created_by',
              type: 'relation',
              system: false,
              required: true,
              options: {
                  collectionId: 'users',
                  cascadeDelete: false,
                  maxSelect: 1,
                  minSelect: 1
              }
          },
          {
              name: 'last_modified_by',
              type: 'relation',
              system: false,
              required: true,
              options: {
                  collectionId: 'users',
                  cascadeDelete: false,
                  maxSelect: 1,
                  minSelect: 1
              }
          },
          {
              name: 'last_modified',
              type: 'date',
              system: false,
              required: true,
              options: {
                  timezone: true
              }
          }
      ],
      indexes: [
          'CREATE INDEX idx_package_status ON packages (status)',
          'CREATE INDEX idx_package_category ON packages (category)',
          'CREATE UNIQUE INDEX idx_package_display_id ON packages (display_id)'
      ]
  });

  // Create categories collection with enhanced schema
  const categories = new Collection({
      name: 'categories',
      type: 'base',
      system: false,
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.id != "" && (@request.auth.role = "admin" || @request.auth.role = "manager")',
      updateRule: '@request.auth.id != "" && (@request.auth.role = "admin" || @request.auth.role = "manager")',
      deleteRule: '@request.auth.id != "" && @request.auth.role = "admin"',
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
              required: false,
              options: {
                  min: 0,
                  max: 500
              }
          },
          {
              name: 'parent_category',
              type: 'relation',
              system: false,
              required: false,
              options: {
                  collectionId: 'categories',
                  cascadeDelete: false,
                  maxSelect: 1,
                  minSelect: 0
              }
          },
          {
              name: 'icon',
              type: 'text',
              system: false,
              required: false,
              options: {
                  min: 0,
                  max: 50
              }
          },
          {
              name: 'created_by',
              type: 'relation',
              system: false,
              required: true,
              options: {
                  collectionId: 'users',
                  cascadeDelete: false,
                  maxSelect: 1,
                  minSelect: 1
              }
          },
          {
              name: 'last_modified',
              type: 'date',
              system: false,
              required: true,
              options: {
                  timezone: true
              }
          }
      ],
      indexes: [
          'CREATE UNIQUE INDEX idx_category_name ON categories (name)',
          'CREATE INDEX idx_category_parent ON categories (parent_category)'
      ]
  });

  // Enhance users collection
  const users = new Collection({
      name: 'users',
      type: 'auth',
      system: false,
      listRule: '@request.auth.role = "admin"',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.role = "admin"',
      updateRule: '@request.auth.id = id || @request.auth.role = "admin"',
      deleteRule: '@request.auth.role = "admin"',
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
          },
          {
              name: 'last_login',
              type: 'date',
              system: false,
              required: false,
              options: {
                  timezone: true
              }
          }
      ],
      indexes: [
          'CREATE INDEX idx_user_role ON users (role)',
          'CREATE INDEX idx_user_active ON users (active)'
      ]
  });

  return {
      packages,
      categories,
      users,
  };
}, (db) => {
  const collections = ['packages', 'categories', 'users'];
  collections.forEach(collection => {
      db.deleteCollection(collection);
  });
});