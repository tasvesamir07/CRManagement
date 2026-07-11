const fs = require('fs');
const path = require('path');

const isVercel = !!process.env.VERCEL;
const dbLockPath = isVercel ? '/tmp/db.lock' : path.join(__dirname, '../../../../db.lock');
let lockAcquired = false;

function acquireLock() {
    while (true) {
        try {
            const fd = fs.openSync(dbLockPath, 'wx');
            fs.closeSync(fd);
            lockAcquired = true;
            return true;
        } catch (e) {
            if (e.code === 'EEXIST') {
                for (let i = 0; i < 50; i++) {
                    let stat;
                    try {
                        stat = fs.statSync(dbLockPath);
                    } catch (_) {
                        break;
                    }
                    if (Date.now() - stat.mtimeMs > 1000) {
                        try { fs.unlinkSync(dbLockPath); } catch (_) {}
                        break;
                    }
                    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
                }
            } else {
                return false;
            }
        }
    }
}

function releaseLock() {
    if (lockAcquired) {
        try {
            fs.unlinkSync(dbLockPath);
        } catch (_) {}
        lockAcquired = false;
    }
}

module.exports = { acquireLock, releaseLock };
