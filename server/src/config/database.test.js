const db = require('./database');

describe('Database Configuration & Query Tests', () => {
    beforeAll(async () => {
        await db.waitForInit();
    });

    it('should correctly report whether JSON DB mode is active', () => {
        const isJson = db.useJsonDb();
        expect(typeof isJson).toBe('boolean');
    });

    it('should successfully insert, select, and update records in JSON DB mode', async () => {
        if (db.useJsonDb()) {
            const insertRes = await db.query(
                "INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                ["test_key", "test_value"]
            );
            expect(insertRes.rowCount).toBe(1);

            const selectRes = await db.query(
                "SELECT value FROM system_settings WHERE key = $1",
                ["test_key"]
            );
            expect(selectRes.rows).toBeDefined();
            expect(selectRes.rows.length).toBe(1);
            expect(selectRes.rows[0].value).toBe("test_value");

            const updateRes = await db.query(
                "INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                ["test_key", "new_test_value"]
            );
            expect(updateRes.rowCount).toBe(1);

            const selectUpdatedRes = await db.query(
                "SELECT value FROM system_settings WHERE key = $1",
                ["test_key"]
            );
            expect(selectUpdatedRes.rows[0].value).toBe("new_test_value");
        }
    });

    it('should handle getClient call properly based on active mode', async () => {
        const client = await db.getClient();
        if (db.useJsonDb()) {
            expect(client).toBeNull();
        } else {
            expect(client).toBeDefined();
            client.release();
        }
    });
});
