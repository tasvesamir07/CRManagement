const { z } = require('zod');

const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        const messages = Object.entries(errors).map(([field, msgs]) => `${field}: ${msgs.join(', ')}`);
        return res.status(400).json({ error: 'Validation failed', details: messages });
    }
    req.body = result.data;
    next();
};

const validateQuery = (schema) => (req, res, next) => {
    const cleanedQuery = { ...req.query };
    for (const key in cleanedQuery) {
        if (cleanedQuery[key] === '') {
            delete cleanedQuery[key];
        }
    }
    const result = schema.safeParse(cleanedQuery);
    if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        const messages = Object.entries(errors).map(([field, msgs]) => `${field}: ${msgs.join(', ')}`);
        return res.status(400).json({ error: 'Invalid query parameters', details: messages });
    }
    req.query = result.data;
    next();
};

const validateParams = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        const messages = Object.entries(errors).map(([field, msgs]) => `${field}: ${msgs.join(', ')}`);
        return res.status(400).json({ error: 'Invalid route parameters', details: messages });
    }
    req.params = result.data;
    next();
};

const schemas = {
    auth: {
        register: z.object({
            username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
            email: z.string().email(),
            password: z.string().min(8).max(128),
            displayName: z.string().max(100).optional(),
            role: z.enum(['cr', 'admin']).optional()
        }),
        login: z.object({
            username: z.string().min(1),
            password: z.string().min(1)
        }),
        verify2FA: z.object({
            token: z.string().length(6).regex(/^\d{6}$/)
        }),
        changePassword: z.object({
            currentPassword: z.string().min(1),
            newPassword: z.string().min(8).max(128)
        }),
        updateProfile: z.object({
            displayName: z.string().max(100).optional()
        }),
        changeEmail: z.object({
            newEmail: z.string().email(),
            password: z.string().min(1)
        }),
        changeUsername: z.object({
            newUsername: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
            password: z.string().min(1)
        }),
        forgotPassword: z.object({
            email: z.string().email()
        }),
        verifyOtp: z.object({
            email: z.string().email(),
            otp: z.string().length(6).regex(/^\d{6}$/)
        }),
        resetPassword: z.object({
            email: z.string().email(),
            otp: z.string().length(6).regex(/^\d{6}$/),
            newPassword: z.string().min(8).max(128)
        }),
        enable2FA: z.object({
            token: z.string().length(6).regex(/^\d{6}$/)
        }),
        disable2FA: z.object({
            password: z.string().min(1)
        })
    },
    courses: {
        create: z.object({
            course_id: z.string().min(1).max(50),
            course_name: z.string().min(1).max(200),
            teacher_name: z.string().max(100).optional(),
            teacher_initials: z.string().max(10).optional(),
            default_platform_ids: z.array(z.number().int().positive()).optional(),
            is_active: z.boolean().optional()
        }),
        update: z.object({
            course_id: z.string().min(1).max(50).optional(),
            course_name: z.string().min(1).max(200).optional(),
            teacher_name: z.string().max(100).optional(),
            teacher_initials: z.string().max(10).optional(),
            default_platform_ids: z.array(z.number().int().positive()).optional(),
            is_active: z.boolean().optional()
        }).partial(),
        assignMember: z.object({
            user_id: z.number().int().positive(),
            role: z.enum(['cr', 'member']).optional()
        })
    },
    routines: {
        create: z.object({
            course_id: z.number().int().positive(),
            day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
            start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
            end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
            room_number: z.string().max(50).optional(),
            section: z.string().max(50).optional(),
            is_active: z.boolean().optional()
        }),
        update: z.object({
            course_id: z.number().int().positive().optional(),
            day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
            start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
            end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
            room_number: z.string().max(50).optional(),
            section: z.string().max(50).optional(),
            is_active: z.boolean().optional()
        }).partial()
    },
    platforms: {
        create: z.object({
            platform_name: z.string().min(1).max(100),
            platform_type: z.enum(['whatsapp', 'telegram', 'messenger']),
            chat_id: z.string().min(1),
            description: z.string().max(500).optional(),
            course_id: z.number().int().positive().optional(),
            is_active: z.boolean().optional()
        }),
        update: z.object({
            platform_name: z.string().min(1).max(100).optional(),
            platform_type: z.enum(['whatsapp', 'telegram', 'messenger']).optional(),
            chat_id: z.string().min(1).optional(),
            description: z.string().max(500).optional(),
            course_id: z.number().int().positive().nullable().optional(),
            is_active: z.boolean().optional()
        }).partial()
    },
    files: {
        createFolder: z.object({
            name: z.string().min(1).max(200),
            course_id: z.number().int().positive().nullable().optional()
        }),
        updateFolder: z.object({
            name: z.string().min(1).max(200).optional()
        }).partial(),
        upload: z.object({
            folder_id: z.number().int().positive().nullable().optional(),
            expires_at: z.string().datetime().nullable().optional()
        }).partial(),
        checkDuplicate: z.object({
            filename: z.string().min(1).max(255),
            folderId: z.number().int().positive().nullable().optional()
        }),
        listQuery: z.object({
            page: z.coerce.number().int().positive().default(1),
            limit: z.coerce.number().int().positive().max(200).default(50),
            search: z.string().max(200).optional(),
            userId: z.coerce.number().int().positive().optional(),
            folderId: z.coerce.number().int().positive().nullable().optional()
        }),
        compress: z.object({
            ids: z.array(z.number().int().positive()).min(1),
            archiveName: z.string().max(255).optional(),
            folderId: z.number().int().positive().nullable().optional()
        }),
        move: z.object({
            ids: z.array(z.number().int().positive()).min(1),
            folderId: z.number().int().positive().nullable().optional()
        }),
        updateExpiry: z.object({
            expiresAt: z.string().datetime().nullable().optional()
        })
    },
    announcements: {
        create: z.object({
            title: z.string().min(1).max(300),
            content: z.string().min(1),
            category: z.string().min(1).max(50),
            course_id: z.number().int().positive().nullable().optional(),
            custom_room: z.string().max(200).nullable().optional(),
            custom_time: z.string().max(200).nullable().optional(),
            file_id: z.number().int().positive().nullable().optional(),
            file_ids: z.array(z.number().int().positive()).optional(),
            platform_ids: z.array(z.number().int().positive()).optional(),
            metadata: z.record(z.any()).optional()
        }),
        update: z.object({
            title: z.string().min(1).max(300).optional(),
            content: z.string().min(1).optional(),
            category: z.string().min(1).max(50).optional(),
            course_id: z.number().int().positive().nullable().optional(),
            custom_room: z.string().max(200).nullable().optional(),
            custom_time: z.string().max(200).nullable().optional(),
            file_id: z.number().int().positive().nullable().optional(),
            file_ids: z.array(z.number().int().positive()).optional(),
            platform_ids: z.array(z.number().int().positive()).optional(),
            metadata: z.record(z.any()).optional()
        }).partial(),
        schedule: z.object({
            scheduled_at: z.string().datetime()
        }),
        send: z.object({
            confirmed: z.literal(true)
        }),
        draftAI: z.object({
            prompt: z.string().min(1).max(2000),
            category: z.string().max(50).optional()
        }),
        listQuery: z.object({
            page: z.coerce.number().int().positive().default(1),
            limit: z.coerce.number().int().positive().max(100).default(50),
            search: z.string().max(200).optional(),
            status: z.enum(['draft', 'scheduled', 'sending', 'sent', 'partial', 'failed']).optional(),
            course_id: z.coerce.number().int().positive().optional(),
            date_from: z.string().datetime().optional(),
            date_to: z.string().datetime().optional()
        })
    },
    admin: {
        updateUser: z.object({
            display_name: z.string().max(100).optional(),
            role: z.enum(['cr', 'admin']).optional(),
            is_active: z.boolean().optional()
        }).partial(),
        createUser: z.object({
            username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
            email: z.string().email(),
            password: z.string().min(8).max(128),
            display_name: z.string().max(100).optional(),
            role: z.enum(['cr', 'admin']).optional()
        })
    },
    templates: {
        create: z.object({
            name: z.string().min(1).max(100),
            description: z.string().max(500).optional(),
            category: z.string().max(50).optional(),
            title_template: z.string().min(1).max(300),
            content_template: z.string().min(1),
            variables: z.array(z.string()).optional(),
            is_active: z.boolean().optional()
        }),
        update: z.object({
            name: z.string().min(1).max(100).optional(),
            description: z.string().max(500).optional(),
            category: z.string().max(50).optional(),
            title_template: z.string().min(1).max(300).optional(),
            content_template: z.string().min(1).optional(),
            variables: z.array(z.string()).optional(),
            is_active: z.boolean().optional()
        }).partial()
    },
    bulk: {
        create: z.object({
            title: z.string().min(1).max(300),
            content: z.string().min(1),
            category: z.string().min(1).max(50),
            course_ids: z.array(z.number().int().positive()).min(1),
            platform_ids: z.array(z.number().int().positive()).min(1),
            file_ids: z.array(z.number().int().positive()).optional(),
            scheduled_at: z.string().datetime().optional()
        }),
        update: z.object({
            title: z.string().min(1).max(300).optional(),
            content: z.string().min(1).optional(),
            category: z.string().min(1).max(50).optional(),
            course_ids: z.array(z.number().int().positive()).optional(),
            platform_ids: z.array(z.number().int().positive()).optional(),
            file_ids: z.array(z.number().int().positive()).optional(),
            scheduled_at: z.string().datetime().nullable().optional()
        }).partial(),
        deleteIds: z.object({
            ids: z.array(z.number().int().positive()).min(1)
        }),
        createRoutines: z.object({
            course_id: z.number().int().positive(),
            days: z.array(z.object({
                day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
                start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
                end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
                room_number: z.string().max(50).optional(),
                section: z.string().max(50).optional()
            })).min(1)
        })
    },
    logs: {
        listQuery: z.object({
            page: z.coerce.number().int().positive().default(1),
            limit: z.coerce.number().int().positive().max(100).default(50),
            level: z.enum(['info', 'warn', 'error', 'debug']).optional(),
            entity_type: z.string().max(50).optional(),
            user_id: z.coerce.number().int().positive().optional(),
            date_from: z.string().datetime().optional(),
            date_to: z.string().datetime().optional()
        })
    },
    analytics: {
        listQuery: z.object({
            page: z.coerce.number().int().positive().default(1),
            limit: z.coerce.number().int().positive().max(100).default(50),
            event_type: z.string().max(50).optional(),
            user_id: z.coerce.number().int().positive().optional(),
            date_from: z.string().datetime().optional(),
            date_to: z.string().datetime().optional()
        }),
        track: z.object({
            event_type: z.string().min(1).max(100),
            metadata: z.record(z.any()).optional()
        })
    },
    students: {
        create: z.object({
            student_id: z.string().min(1).max(50),
            name: z.string().min(1).max(200),
            email: z.preprocess(val => val === '' ? null : val, z.string().email().optional().nullable()),
            phone: z.string().max(20).optional().nullable(),
            batch: z.string().max(50).optional().nullable(),
            section: z.string().max(10).optional().nullable()
        }),
        update: z.object({
            student_id: z.string().min(1).max(50).optional(),
            name: z.string().min(1).max(200).optional(),
            email: z.preprocess(val => val === '' ? null : val, z.string().email().optional().nullable()),
            phone: z.string().max(20).optional().nullable(),
            batch: z.string().max(50).optional().nullable(),
            section: z.string().max(10).optional().nullable(),
            is_active: z.boolean().optional()
        }).partial(),
        bulkImport: z.object({
            students: z.array(z.object({
                student_id: z.string().min(1).max(50),
                name: z.string().min(1).max(200),
                email: z.preprocess(val => val === '' ? null : val, z.string().email().optional().nullable()),
                phone: z.string().max(20).optional().nullable(),
                batch: z.string().max(50).optional().nullable(),
                section: z.string().max(10).optional().nullable()
            })).min(1),
            course_ids: z.array(z.number().int().positive()).optional(),
            enroll_all: z.boolean().optional()
        }),
        enroll: z.object({
            course_ids: z.array(z.number().int().positive()).min(1)
        })
    },
    examRoutines: {
        create: z.object({
            course_id: z.number().int().positive(),
            exam_type: z.enum(['mid', 'final', 'quiz', 'makeup']),
            exam_date: z.string().date(),
            start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
            end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
            room_number: z.string().max(50).optional().nullable(),
            section: z.string().max(50).optional().nullable(),
            instructions: z.string().max(1000).optional().nullable(),
            canva_template_id: z.string().optional().nullable()
        }),
        update: z.object({
            course_id: z.number().int().positive().optional(),
            exam_type: z.enum(['mid', 'final', 'quiz', 'makeup']).optional(),
            exam_date: z.string().date().optional(),
            start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
            end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
            room_number: z.string().max(50).optional().nullable(),
            section: z.string().max(50).optional().nullable(),
            instructions: z.string().max(1000).optional().nullable(),
            canva_template_id: z.string().optional().nullable(),
            is_active: z.boolean().optional()
        }).partial()
    },
    attendance: {
        bulkMark: z.object({
            course_id: z.number().int().positive(),
            date: z.string().date(),
            exam_routine_id: z.number().int().positive().optional().nullable(),
            records: z.array(z.object({
                student_id: z.number().int().positive(),
                status: z.enum(['present', 'absent']),
                notes: z.string().max(500).optional().nullable()
            })).min(1)
        }),
        update: z.object({
            status: z.enum(['present', 'absent']).optional(),
            notes: z.string().max(500).optional().nullable()
        }).partial()
    },
    canva: {
        generatePdf: z.object({
            template_id: z.number().int().positive(),
            data: z.record(z.any()),
            filename: z.string().max(200).optional()
        }),
        saveTemplate: z.object({
            name: z.string().min(1).max(100),
            template_type: z.enum(['attendance', 'exam_routine']),
            canva_template_id: z.string().min(1),
            canva_design_id: z.string().optional().nullable(),
            variables: z.array(z.string()).optional()
        })
    },
    params: {
        id: z.object({
            id: z.coerce.number().int().positive()
        }),
        courseId: z.object({
            courseId: z.coerce.number().int().positive()
        }),
        platformId: z.object({
            platformId: z.coerce.number().int().positive()
        }),
        fileId: z.object({
            fileId: z.coerce.number().int().positive()
        }),
        folderId: z.object({
            folderId: z.coerce.number().int().positive()
        }),
        templateId: z.object({
            templateId: z.coerce.number().int().positive()
        }),
        bulkId: z.object({
            bulkId: z.coerce.number().int().positive()
        }),
        userId: z.object({
            userId: z.coerce.number().int().positive()
        }),
        studentId: z.object({
            studentId: z.coerce.number().int().positive()
        }),
        date: z.object({
            date: z.string().date()
        })
    }
};

module.exports = { validate, validateQuery, validateParams, schemas };