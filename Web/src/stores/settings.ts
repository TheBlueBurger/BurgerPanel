import { defineStore } from "pinia";
import { Ref, ref } from "vue";
import sendRequest from "@util/request";
import { Config, ConfigValue, defaultConfig } from "@share/Config";

export const useSettings = defineStore("settings", () => {
    const settings: Ref<{
        [key in keyof Config]?: ConfigValue
    }> = ref({});
    let allSettingsCached = false;
    async function getSetting<T extends keyof Config>(key: T, bypassCache?: boolean): Promise<Config[T] extends number ? number : string> {
        let cachedValue = settings.value[key];
        if(typeof cachedValue != "undefined" && !bypassCache) return cachedValue as Config[T] extends number ? number : string;
        let request = await sendRequest("getSetting", {key});
        settings.value[key] = request.value;
        return request.value as Config[T] extends number ? number : string;
    }
    async function setSetting(key: keyof Config, value: ConfigValue) {
        let resp = await sendRequest("setSetting", {key, value}, false)
        updateCachedValue(key, value);
        return resp.value;
    }
    function updateCachedValue(key: keyof Config, value: ConfigValue) {
        settings.value[key] = value;
    }
    async function getAllSettings(ignoreCache?: boolean) {
        if(allSettingsCached && !ignoreCache) return settings.value;
        let allSettings = await sendRequest("getAllSettings");
        settings.value = allSettings;
        allSettingsCached = true;
        return allSettings;
    }
    return { settings, getSetting, setSetting, updateCachedValue, getAllSettings }
});