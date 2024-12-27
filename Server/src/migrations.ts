export const migrations: {[version: string]: string[]} = {
    "2.0.0": [
        `CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    token TEXT NOT NULL,
    permissions TEXT DEFAULT '[]',
    password TEXT,
    setupPending BOOLEAN DEFAULT 1,
    devMode BOOLEAN DEFAULT 0
)`,
        `CREATE TABLE servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    path TEXT UNIQUE NOT NULL,
    memory INTEGER NOT NULL,
    version TEXT NOT NULL,
    port INTEGER UNIQUE NOT NULL,
    autostart BOOLEAN DEFAULT 0,
    autorestart BOOLEAN DEFAULT 0,
    jvmArgs TEXT DEFAULT '',
    software TEXT NOT NULL
)`,
        `CREATE TABLE settings (
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL
)`,
        `CREATE TABLE user_server_access (
    user_id INTEGER NOT NULL,
    server_id INTEGER NOT NULL,
    permissions TEXT DEFAULT '[]',
    PRIMARY KEY (user_id, server_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);`,
        `CREATE TABLE user_pins (
    user_id INTEGER NOT NULL,
    server_id INTEGER NOT NULL,
    PRIMARY KEY (user_id, server_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
);`,
        `CREATE INDEX idx_user_server_access_user_id ON user_server_access (user_id);`,
        `CREATE INDEX idx_user_server_access_server_id ON user_server_access (server_id);`,
        `CREATE INDEX idx_users_username ON users (username);`,
        `CREATE INDEX idx_users_token ON users (token);`,
        `CREATE INDEX idx_user_pins_user ON user_pins (user_id);`
    ]
};