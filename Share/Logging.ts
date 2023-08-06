export let IDs = [
    "start",
    "server.start",
    "server.stop",
    "server.import",
    "server.create",
    "server.port",
    "server.software",
    "server.version",
    "server.setting.changed",
    "server.allowedUsers.changed",
    "server.change-name",
    "server.autostart",
    "server.autorestart",
    "server.autostart.change",
    "server.console.write",
    "server.mem",
    "server.kill",
    "login.success",
    "login.fail",
    "logout",
    "settings.change",
    "user.token.read",
    "user.token.reset",
    "user.create",
    "user.permission.change",
    "user.delete",
    "user.username.changed",
    "user.password.changed",
    "user.setup.finished",
    "error",
    "logs.read",
    "disconnect",
    "packet.invalid-packet",
    "logging.change",
    "info",
    "server.file.read",
    "server.delete",
    "server.file.write",
    "server.file.delete",
    "server.file.upload",
    "server.file.download",
    "api",
    "debug",
    "plugin.download"
] as const;
export type IDs = typeof IDs[number];