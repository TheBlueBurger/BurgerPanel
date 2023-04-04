import type { Config } from "../../../Share/Config";
import events from "./event";
export let _knownSettings = {} as { [key in keyof Config]: any };
export async function setSetting(key: keyof Config, value: any) {
    if (!key) throw new Error("Missing key");
    if (!value) throw new Error("Missing value");
    events.emit("sendPacket", {
        type: "setSetting",
        key,
        value,
    });
    let resp = await events.awaitEvent("setSetting-" + key);
    if (!resp.success) {
        throw new Error(resp.message);
    }
    _knownSettings[key] = resp.value;
    events.emit("knownSettingsUpdated", _knownSettings);
    return resp.value;
}
export async function getSetting(key: keyof Config) {
    if (_knownSettings[key] !== undefined) {
        return _knownSettings[key];
    }
    events.emit("sendPacket", {
        type: "getSetting",
        key,
    });
    let resp = await events.awaitEvent("getSetting-" + key);
    if (!resp.success) {
        throw new Error(resp.message);
    }
    _knownSettings[key] = resp.value;
    events.emit("knownSettingsUpdated", _knownSettings);
    return resp.value;
}
export async function getAllSettings() {
    events.emit("sendPacket", {
        type: "getAllSettings",
    });
    let resp = await events.awaitEvent("getAllSettings");
    if (!resp.success) {
        throw new Error(resp.message);
    }
    _knownSettings = resp.settings;
    events.emit("knownSettingsUpdated", _knownSettings);
    return resp.settings;
}