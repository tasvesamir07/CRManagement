const db = require("./database");

describe("Database Query Simulation - system_settings", () => {
    beforeAll(async () => {
        await db.waitForInit();
    });

    it("should successfully insert and retrieve settings in mock JSON DB mode", async () => {
        if (db.useJsonDb()) {
            // Test Insert / Upsert
            const insertRes = await db.query(
                "INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
                ["test_key", "test_value"]
            );
            expect(insertRes.rowCount).toBe(1);

            // Test Select
            const selectRes = await db.query(
                "SELECT value FROM system_settings WHERE key = $1",
                ["test_key"]
            );
            expect(selectRes.rows).toBeDefined();
            expect(selectRes.rows.length).toBe(1);
            expect(selectRes.rows[0].value).toBe("test_value");

            // Test Upsert Update
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
        } else {
            console.log("PostgreSQL active, skipping JSON DB simulation tests.");
        }
    });
});
