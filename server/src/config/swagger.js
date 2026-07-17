const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.1.0',
        info: {
            title: 'CR Announcement Dashboard API',
            version: '1.0.0',
            description: `Backend API for the Class Representative Announcement Dashboard.  
Supports multi-platform announcement broadcasting (WhatsApp, Telegram, Messenger), course management, file attachments, scheduled broadcasts, AI drafting, and audit logging.

## Authentication
All protected endpoints require a JWT token in the Authorization header:
\`\`\`
Authorization: Bearer <your_jwt_token>
\`\`\`

## Base URL
- Local: \`http://localhost:5000/api\` or \`http://localhost:5000/api/v1\`
- Production: \`https://crmanagement-backend-v7sz.onrender.com/api\` or \`https://crmanagement-backend-v7sz.onrender.com/api/v1\`

## Platform Status Codes
- \`QR_READY\` — WhatsApp QR code available for scanning
- \`CONNECTED\` — Platform is ready to send messages
- \`DISCONNECTED\` — Platform is not connected
- \`CONNECTING\` — Platform is connecting

## Announcement Status Codes
- \`draft\` — Not yet broadcast
- \`scheduled\` — Will be broadcast at scheduled time
- \`sending\` — Currently broadcasting
- \`sent\` — Successfully delivered to all platforms
- \`partial\` — Delivered to some platforms, failed on others
- \`failed\` — Failed to deliver to all platforms

## Platform Delivery Status Codes
- \`pending\` — Awaiting delivery
- \`sending\` — Currently sending
- \`sent\` — Successfully delivered
- \`failed\` — Delivery failed`,
            contact: {
                name: 'Developer',
                email: 'admin@example.com'
            },
            license: {
                name: 'ISC',
                url: 'https://opensource.org/licenses/ISC'
            }
        },
        servers: [
            { url: 'http://localhost:5000/api', description: 'Development' },
            { url: 'https://crmanagement-backend-v7sz.onrender.com/api', description: 'Production' }
        ],
            servers: [
                { url: 'http://localhost:5000/api', description: 'Local development (legacy)' },
                { url: 'http://localhost:5000/api/v1', description: 'Local development (v1)' },
                { url: 'https://crmanagement-backend-v7sz.onrender.com/api', description: 'Production (legacy)' },
                { url: 'https://crmanagement-backend-v7sz.onrender.com/api/v1', description: 'Production (v1)' },
            ],
            components: {
                securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token from login/register'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    required: ['error'],
                    properties: {
                        error: { type: 'string', description: 'Error message' },
                        details: { type: 'array', items: { type: 'string' }, description: 'Validation error details' }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', description: 'User ID' },
                        username: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        display_name: { type: 'string' },
                        role: { type: 'string', enum: ['cr', 'admin'] },
                        is_active: { type: 'boolean' },
                        two_factor_enabled: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                Course: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        course_id: { type: 'string', description: 'Course code (e.g., CSE-101)' },
                        course_name: { type: 'string' },
                        teacher_name: { type: 'string' },
                        teacher_initials: { type: 'string' },
                        created_by: { type: 'integer' },
                        default_platform_ids: { type: 'array', items: { type: 'integer' } },
                        is_active: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' }
                    }
                },
                Routine: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        course_id: { type: 'integer' },
                        day_of_week: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
                        start_time: { type: 'string', example: '09:00' },
                        end_time: { type: 'string', example: '10:30' },
                        room_number: { type: 'string' },
                        section: { type: 'string' },
                        is_active: { type: 'boolean' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                Platform: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        platform_name: { type: 'string' },
                        platform_type: { type: 'string', enum: ['whatsapp', 'telegram', 'messenger'] },
                        chat_id: { type: 'string' },
                        description: { type: 'string' },
                        created_by: { type: 'integer' },
                        course_id: { type: 'integer', nullable: true },
                        is_active: { type: 'boolean' },
                        service_available: { type: 'boolean', description: 'Whether the backend service is connected' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                Announcement: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        title: { type: 'string' },
                        content: { type: 'string' },
                        category: { type: 'string' },
                        course_id: { type: 'integer', nullable: true },
                        custom_room: { type: 'string', nullable: true },
                        custom_time: { type: 'string', nullable: true },
                        file_id: { type: 'integer', nullable: true },
                        file_ids: { type: 'array', items: { type: 'integer' } },
                        created_by: { type: 'integer' },
                        status: { type: 'string', enum: ['draft', 'scheduled', 'sending', 'sent', 'partial', 'failed'] },
                        scheduled_at: { type: 'string', format: 'date-time', nullable: true },
                        sent_at: { type: 'string', format: 'date-time', nullable: true },
                        metadata: { type: 'object' },
                        delivery: { type: 'array', items: { $ref: '#/components/schemas/DeliveryStatus' } },
                        files: { type: 'array', items: { $ref: '#/components/schemas/File' } },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                DeliveryStatus: {
                    type: 'object',
                    properties: {
                        announcement_id: { type: 'integer' },
                        platform_id: { type: 'integer' },
                        platform_name: { type: 'string' },
                        platform_type: { type: 'string', enum: ['whatsapp', 'telegram', 'messenger'] },
                        platform_status: { type: 'string', enum: ['pending', 'sending', 'sent', 'failed'] },
                        error_message: { type: 'string', nullable: true },
                        sent_at: { type: 'string', format: 'date-time', nullable: true }
                    }
                },
                File: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        original_name: { type: 'string' },
                        storage_path: { type: 'string' },
                        file_type: { type: 'string' },
                        file_size: { type: 'integer', description: 'Size in bytes' },
                        uploaded_by: { type: 'integer' },
                        expires_at: { type: 'string', format: 'date-time', nullable: true },
                        folder_id: { type: 'integer', nullable: true },
                        uploaded_at: { type: 'string', format: 'date-time' },
                        is_deleted: { type: 'boolean' }
                    }
                },
                Folder: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        course_id: { type: 'integer', nullable: true },
                        created_by: { type: 'integer' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                AuditLog: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        user_id: { type: 'integer', nullable: true },
                        action: { type: 'string' },
                        entity_type: { type: 'string' },
                        entity_id: { type: 'integer', nullable: true },
                        details: { type: 'string' },
                        ip_address: { type: 'string' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                AnnouncementTemplate: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        category: { type: 'string' },
                        title_template: { type: 'string' },
                        content_template: { type: 'string' },
                        variables: { type: 'array', items: { type: 'string' } },
                        is_active: { type: 'boolean' },
                        created_by: { type: 'integer' },
                        created_at: { type: 'string', format: 'date-time' }
                    }
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: { type: 'string', description: 'JWT token for subsequent requests' }
                    }
                },
                PaginatedResponse: {
                    type: 'object',
                    properties: {
                        totalCount: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        totalPages: { type: 'integer' }
                    }
                }
            }
        },
        tags: [
            { name: 'Auth', description: 'Authentication and user management' },
            { name: 'Courses', description: 'Course management' },
            { name: 'Routines', description: 'Class routine / schedule management' },
            { name: 'Platforms', description: 'Messaging platform configuration (WhatsApp, Telegram, Messenger)' },
            { name: 'Files', description: 'File and folder management' },
            { name: 'Announcements', description: 'Announcement creation, broadcasting, and management' },
            { name: 'Templates', description: 'Announcement templates' },
            { name: 'Admin', description: 'Admin-only endpoints for user and system management' },
            { name: 'Analytics', description: 'Analytics and dashboard statistics' },
            { name: 'Logs', description: 'Audit log access' },
            { name: 'Bulk', description: 'Bulk operations (delete, batch create)' },
            { name: 'Health', description: 'Server health check' }
        ]
    },
    apis: ['./src/routes/*.routes.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;