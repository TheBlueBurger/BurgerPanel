<script setup lang="ts">
    import { Ref, computed, onMounted, ref, watch } from 'vue';
    import { Server } from '../../../../Share/Server';
    import getServerByID from '../../util/getServerByID';
    import event from '../../util/event';
    import { useRouter } from 'vue-router';
import sendRequest from '../../util/request';
import titleManager from '../../util/titleManager';
import { confirmModal } from '../../util/modal';
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
    let fileName = computed(() => {
        if(!path.value) return;
        return path.value.toString().split("/")[path.value.toString().split("/").length-1];
    })
    async function readFile() {
        fileData.value = "Loading...";
        titleManager.setTitle(`${fileName.value} in ${server.value?.name}`)
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
    let loadState = ref("Loading server data...");
    onMounted(async () => {
        server.value = await getServerByID(null, props.server);
        loadState.value = "Loading server files...";
        if(!isReading()) await getFiles();
        else readFile();
        finishedLoading.value = true;
    });
    async function getFiles() {
        titleManager.setTitle("Files in " + server.value?.name);
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
</script>
<template>
    <div v-if="!finishedLoading">
        {{ loadState }}
    </div>
    <div v-else-if="!readingFile">
        <h1>Files in {{ server.name }} <RouterLink :to="{
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
        }"><button>Go back</button></RouterLink> <br/>
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