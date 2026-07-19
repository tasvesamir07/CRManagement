const REQUIRED = ['JWT_SECRET'];
const OPTIONAL_WARN = ['DATABASE_URL', 'TELEGRAM_BOT_TOKEN', 'SMTP_HOST', 'SUPABASE_URL'];

function validate() {
    let hasError = false;

    for (const key of REQUIRED) {
        if (!process.env[key]) {
            console.error(`FATAL: Required environment variable ${key} is not set.`);
            hasError = true;
        }
    }

    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        console.error('FATAL: JWT_SECRET is too weak. Generate a 64-char hex string with:');
        console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        hasError = true;
    }

    for (const key of OPTIONAL_WARN) {
        if (!process.env[key]) {
            console.warn(`WARN: ${key} is not set. Related features will be disabled.`);
        }
    }

    return !hasError;
}

module.exports = { validate, REQUIRED, OPTIONAL_WARN };
