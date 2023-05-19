import type { Config } from "../../../Share/Config";
import events from "./event";
import sendRequest from "./request";
export let _knownSettings = {} as { [key in keyof Config]: any };
export async function setSetting(key: keyof Config, value: any) {
    if (!key) throw new Error("Missing key");
    if (!value) throw new Error("Missing value");
    let resp = await sendRequest("setSetting", {key, value})
    _knownSettings[key] = resp.value;
    events.emit("knownSettingsUpdated", _knownSettings);
    return resp.value;
}
export async function getSetting(key: keyof Config, ignoreCache: boolean = false) {
    if (!ignoreCache && _knownSettings[key] !== undefined) {
        return _knownSettings[key];
    }
    let settingValue = await (await sendRequest("getSetting", {key})).value;
    _knownSettings[key] = settingValue;
    events.emit("knownSettingsUpdated", _knownSettings);
    return settingValue;
}
export async function getAllSettings() {
    _knownSettings = await sendRequest("getAllSettings");
    events.emit("knownSettingsUpdated", _knownSettings);
    return _knownSettings;
}