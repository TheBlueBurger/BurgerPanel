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
    "server.autostart.change",
    "server.console.write",
    "server.mem",
    "server.kill",
    "login.success",
    "login.fail",
    "logout",
    "settings.change",
    "user.token.read",
    "user.create",
    "user.permission.change",
    "user.delete",
    "error",
    "logs.read",
    "disconnect",
    "packet.invalid-packet"
] as const;
export type IDs = typeof IDs[number];