import Sqlite from "better-sqlite3";
import { migrations } from "./migrations.js";
import fs from "node:fs";
import logger, { LogLevel } from "./logger.js";
import type { User } from "../../Share/User";
import { Server } from "../../Share/Server";
import { exists } from "./util/exists.js";
if(process.env.IS_DOCKER == "1" && !await exists("/db/")) {
    logger.log("/db/ isnt mounted in docker!", "error", LogLevel.ERROR);
    process.exit(1);
}
const dbPath = process.env.IS_DOCKER == "1" ? "/db/burgerpanel.sqlite3" : "burgerpanel.sqlite3";
const db = new Sqlite(dbPath, {
    verbose: (data) => {
        /*if(process.env.NODE_ENV != "production")*/ logger.log("SQL: " + data, "debug", LogLevel.DEBUG);
    },
    nativeBinding: process.env.IS_DOCKER == "1" ? "/panel/better_sqlite3.node" : undefined
});
db.pragma('journal_mode = WAL'); // speeeeed
db.exec(`CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, version TEXT UNIQUE NOT NULL, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
// Migrate!!!
const unappliedMigrations: string[] = [];
const checkAppliedMigration = db.prepare("SELECT applied_at FROM migrations WHERE version = ?");
const insertMigration = db.prepare("INSERT INTO migrations (version) VALUES (?)");
Object.keys(migrations).forEach(migration => {
    if(!checkAppliedMigration.get(migration)) unappliedMigrations.push(migration);
});
if(unappliedMigrations.length != 0) {
    logger.log(`Missing migrations: ${JSON.stringify(unappliedMigrations)}. Backing up database...`, "info");
    await db.backup(dbPath + ".bak-" + Date.now());
    logger.log("Backup complete", "info");
    unappliedMigrations.forEach(migration => {
        migrations[migration].forEach(migrationData => {
            logger.log(`Applying migration ${migration}`, "debug", LogLevel.DEBUG);
            db.exec(migrationData);
        });
        insertMigration.run(migration);
    });
}
export const getUserByToken: Sqlite.Statement<string[], User> = db.prepare(`SELECT * FROM users WHERE token=? LIMIT 1`);
export const getUserByID: Sqlite.Statement<(number | string)[], User> = db.prepare(`SELECT * FROM users WHERE id=? LIMIT 1`);
export const getServerByID: Sqlite.Statement<(number | string | bigint)[], Server> = db.prepare(`SELECT * FROM servers WHERE id=? LIMIT 1`);
export const getServerByName: Sqlite.Statement<string[], Server> = db.prepare(`SELECT * FROM servers WHERE name=? LIMIT 1`);
export const getServerPermissions_UID_SID = db.prepare<any[], {permissions:string}>("SELECT permissions FROM user_server_access WHERE user_id=? AND server_id=?");
export default db;