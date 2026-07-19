const ANNOUNCEMENT_STATUS = Object.freeze({
    DRAFT: 'draft',
    SCHEDULED: 'scheduled',
    SENDING: 'sending',
    SENT: 'sent',
    PARTIAL: 'partial',
    FAILED: 'failed'
});

const PLATFORM_STATUS = Object.freeze({
    PENDING: 'pending',
    SENDING: 'sending',
    SENT: 'sent',
    FAILED: 'failed'
});

const PLATFORM_TYPE = Object.freeze({
    WHATSAPP: 'whatsapp',
    TELEGRAM: 'telegram',
    MESSENGER: 'messenger'
});

const USER_ROLE = Object.freeze({
    CR: 'cr',
    ADMIN: 'admin'
});

const ATTENDANCE_STATUS = Object.freeze({
    PRESENT: 'present',
    ABSENT: 'absent'
});

const EXAM_TYPE = Object.freeze({
    MID: 'mid',
    FINAL: 'final',
    QUIZ: 'quiz',
    MAKEUP: 'makeup'
});

const OTP_TYPE = Object.freeze({
    PASSWORD_RESET: 'password_reset'
});

const DAY_OF_WEEK = Object.freeze({
    MONDAY: 'Monday',
    TUESDAY: 'Tuesday',
    WEDNESDAY: 'Wednesday',
    THURSDAY: 'Thursday',
    FRIDAY: 'Friday',
    SATURDAY: 'Saturday',
    SUNDAY: 'Sunday'
});

module.exports = {
    ANNOUNCEMENT_STATUS,
    PLATFORM_STATUS,
    PLATFORM_TYPE,
    USER_ROLE,
    ATTENDANCE_STATUS,
    EXAM_TYPE,
    OTP_TYPE,
    DAY_OF_WEEK
};
