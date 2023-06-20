<script setup lang="ts">
    import { Ref, computed, ref, watch } from 'vue';
    import { Server } from '@share/Server';
    import { useRouter } from 'vue-router';
    import sendRequest from '../../util/request';
    import titleManager from '../../util/titleManager';
    import { confirmModal, showInfoBox } from '../../util/modal';
    import { useServers } from '../../stores/servers';
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
    function setTitle() {
        titleManager.setTitle(`${server.value?.name}${path.value.toString().startsWith("/") ? "" : "/"}${path.value} - File reader`);
    }
    watch(path, () => {
        if(!readingFile.value) getFiles();
        setTitle();
    });
    watch(router.currentRoute, (r) => {
        if(r.query?.type == "read") {
            readFile();
        }
    })
    let fileData = ref("");
    let fileName = computed(() => {
        if(!path.value) return;
        return path.value.toString().split("/")[path.value.toString().split("/").length-1];
    })
    async function readFile() {
        fileData.value = "Loading...";
        let resp = await sendRequest("serverFiles", {
            id: props.server,
            path: path.value,
            action: "read",
        }).catch(err => {
            router.push({
                query: {
                    path: path.value.toString().split('/').slice(0, -1).join('/')
                }
            });
            return undefined;
        });
        if(resp?.type != "data") return;
        fileData.value = resp.fileData;
    }
    let files = ref() as Ref<undefined | {
        name: string;
        folder: boolean;
    }[]>;
    let servers = useServers();
    server.value = await servers.getServerByID(props.server);
    setTitle();
    if(!isReading()) await getFiles();
    else readFile();
    finishedLoading.value = true;
    async function getFiles() {
        if(path.value.toString().startsWith("/logs")) {
            if((await confirmModal("Open logs?", `Would you like to open the logs page of '${server.value?.name}'?\nYou cannot see log files in this page.`))) {
                await router.push({
                    name: "viewLogs",
                    params: {
                        server: props.server
                    }
                })
            } else {
                await router.push({
                    query: {
                        path: "/"
                    }
                })
            }
            return;
        }
        let resp = await sendRequest("serverFiles", {
            id: props.server,
            path: path.value,
            action: "files"
        }).catch(err => {
            router.push({});
            return undefined;
        });
        if(resp?.type != "filelist") return;
        files.value = resp.files;
        files.value = files.value?.sort((file, lastFile) => {
            return (lastFile.folder?1:0) - (file.folder?1:0);
        });
    }
    async function saveFile() {
        let resp = await sendRequest("serverFiles", {
            action: "write",
            id: server.value?._id,
            data: fileData.value,
            path: path.value
        });
        if(resp.type != "edit-success") return;
        showInfoBox("Save successful", `The file at ${path.value} has been successfully updated.`);
    }
</script>
<template>
    <div v-if="!finishedLoading">
        
    </div>
    <div v-else-if="!readingFile">
        <h1>Files in {{ server.name }}{{ path }} <RouterLink :to="{
        name: 'editServer',
        params: {
            server: props.server
        }
    }"><button id="back-server-page-btn">Server Page</button></RouterLink></h1>
        <RouterLink v-if="!['','/'].includes(path.toString())" :to="{
                    query: {
                        path: path.toString().split('/').slice(0, -1).join('/')
                    }
                }" class="link"><span class="entry folder">../</span></RouterLink>
        <div v-for="file in files">
            <div v-if="file.folder">
                <RouterLink :to="{
                    query: {
                        path: (path + '\/' + file.name).replaceAll('\/\/', '\/')
                    }
                }" class="link"><span class="entry folder">{{ file.name }}/</span></RouterLink>
            </div>
            <div v-else>
                <RouterLink :to="{
                    query: {
                        path: (path + '\/' + file.name).replaceAll('\/\/', '\/'),
                        type: 'read'
                    }
                }" class="link"><span class="entry file">{{ file.name }}</span></RouterLink>
            </div>
        </div>
    </div>
    <div v-else>
        <RouterLink :to="{
            query: {
                path: path.toString().split('/').slice(0, -1).join('/')
            }
        }"><button>Go back</button></RouterLink> <button @click="saveFile">Save</button> <br/>
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
.link {
    color: white;
    text-decoration: none;
}
.entry {
    margin-top: 3px;
    border-radius: 10px;
    padding: 10px;
    display: block;
    font-size: 1.25rem;
    margin-left: 10px;
    background-color: #3b3a3a;
}
#back-server-page-btn {
    margin-top: -50px;
    position: relative;
    top: -5px;
}
</style>