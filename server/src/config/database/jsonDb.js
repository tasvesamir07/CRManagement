const fs = require('fs');
const path = require('path');
const { acquireLock, releaseLock } = require('./lock');

const isVercel = !!process.env.VERCEL;
const jsonDbPath = isVercel ? '/tmp/db.json' : path.join(__dirname, '../../../../db.json');

const JSON_DB_SCHEMA = {
    users: [], courses: [], routines: [], platforms: [], files: [],
    announcements: [], announcement_platforms: [], course_members: [],
    otps: [], audit_logs: [], analytics_events: [], announcement_templates: [],
    folders: [], system_settings: [],
    students: [], student_courses: [], exam_routines: [], attendance: [], canva_templates: []
};

function initJsonDb() {
    if (!fs.existsSync(jsonDbPath)) {
        fs.writeFileSync(jsonDbPath, JSON.stringify({ ...JSON_DB_SCHEMA }, null, 2));
    } else {
        const data = JSON.parse(fs.readFileSync(jsonDbPath, 'utf8'));
        let needsWrite = false;
        for (const key of Object.keys(JSON_DB_SCHEMA)) {
            if (!(key in data)) {
                data[key] = [];
                needsWrite = true;
            }
        }
        if (data.course_members.length === 0 && data.courses.length > 0) {
            for (const course of data.courses) {
                if (course.created_by) {
                    data.course_members.push({
                        user_id: course.created_by, course_id: course.id,
                        role: 'lead', assigned_at: new Date().toISOString()
                    });
                }
            }
            needsWrite = true;
        }
        if (needsWrite) {
            acquireLock();
            try {
                fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2));
            } finally {
                releaseLock();
            }
        }
    }
}

function readJsonDb() {
    initJsonDb();
    acquireLock();
    try {
        const data = fs.readFileSync(jsonDbPath, 'utf8');
        return JSON.parse(data);
    } finally {
        releaseLock();
    }
}

function writeJsonDb(data) {
    acquireLock();
    try {
        fs.writeFileSync(jsonDbPath, JSON.stringify(data, null, 2));
    } finally {
        releaseLock();
    }
}

module.exports = { initJsonDb, readJsonDb, writeJsonDb, JSON_DB_SCHEMA, jsonDbPath };
