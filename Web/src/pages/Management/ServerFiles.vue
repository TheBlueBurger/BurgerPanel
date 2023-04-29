<script setup lang="ts">
    import { Ref, computed, onMounted, ref, watch } from 'vue';
    import { Server } from '../../../../Share/Server';
    import getServerByID from '../../util/getServerByID';
    import event from '../../util/event';
    import { useRouter } from 'vue-router';
    let i = ref(0);
    let finishedLoading = ref(false);
    let server = ref() as Ref<undefined | Server>;
    let props = defineProps({
        server: {required: true, type: String},
    });
    let router = useRouter();
    let path = computed(() => {
        return router.currentRoute.value.query?.path || "/";
    });
    function isReading() {
        return router.currentRoute.value.query?.type == "read";
    }
    let readingFile = computed(() => {
        return isReading();
    });
    watch(path, () => {
        if(!readingFile.value) getFiles();
    });
    watch(router.currentRoute, (r) => {
        if(r.query?.type == "read") {
            readFile();
        }
    })
    let fileData = ref("");
    async function readFile() {
        i.value++;
        fileData.value = "Loading...";
        event.emit("sendPacket", {
            type: "serverFiles",
            id: props.server,
            path: path.value,
            action: "read",
            i: i.value
        });
        let resp = await event.awaitEvent("serverFiles-file-data-" + i.value);
        if(!resp.success) event.emit("createNotification", resp.message);
        fileData.value = resp.fileData;
    }
    let files = ref() as Ref<undefined | {
        name: string;
        folder: boolean;
    }[]>;
    let loadState = ref("Loading server data...");
    onMounted(async () => {
        server.value = await getServerByID(null, props.server);
        loadState.value = "Loading server files...";
        if(!isReading()) await getFiles();
        else readFile();
        finishedLoading.value = true;
    });
    async function getFiles() {
        event.emit("sendPacket", {
            type: "serverFiles",
            id: props.server,
            path: path.value,
            action: "files"
        });
        let resp = await event.awaitEvent("serverFiles");
        if(!resp.success) return; // hmm
        files.value = resp.files;
        files.value = files.value?.sort((file, lastFile) => {
            return (lastFile.folder?1:0) - (file.folder?1:0);
        });
    }
</script>
<template>
    <div v-if="!finishedLoading">
        {{ loadState }}
    </div>
    <div v-else-if="!readingFile">
        <h1>Files in {{ server.name }}</h1>
        <div v-for="file in files">
            <div v-if="file.folder">
                <RouterLink :to="{
                    name: 'serverFiles',
                    params: {
                        server: props.server
                    },
                    query: {
                        path: (path + '\/' + file.name).replaceAll('\/\/', '\/')
                    }
                }">{{ file.name }}/</RouterLink>
            </div>
            <div v-else>
                <RouterLink :to="{
                    name: 'serverFiles',
                    params: {
                        server: props.server
                    },
                    query: {
                        path: (path + '\/' + file.name).replaceAll('\/\/', '\/'),
                        type: 'read'
                    }
                }">{{ file.name }}</RouterLink>
            </div>
        </div>
    </div>
    <div v-else>
        <textarea v-model="fileData"></textarea>
    </div>
</template>

<style scoped>
textarea {
    background-color: black;
    color: white;
    width: 90vw;
    margin-left: 5vw;
    height: calc(100vh - 100px);
    border: none;
    border-radius: 10px;
}
</style>