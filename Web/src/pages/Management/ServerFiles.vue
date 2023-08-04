<script setup lang="ts">
    import { Ref, computed, inject, ref, watch } from 'vue';
    import { Server } from '@share/Server';
    import { useRouter } from 'vue-router';
    import sendRequest from '../../util/request';
    import titleManager from '../../util/titleManager';
    import { confirmModal, showInfoBox } from '../../util/modal';
    import { useServers } from '../../stores/servers';
import { hasServerPermission } from '@share/Permission';
import { useUser } from '../../stores/user';
import Dropdown from '@components/Dropdown.vue';
import Modal from '@components/Modal.vue';
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
    let user = useUser();
    let dropdown: any = ref();
    let dropdownFile = ref();
    let currentlyUploadingFile: File | undefined;
    let toUpload: Ref<File[]> = ref([]);
    let showUploadModal = ref(false);
    async function openUploadModal() {
        currentlyUploadingFile = undefined;
        showUploadModal.value = true;
    }
    async function onDrop(e: DragEvent) {
        slightlyWhiteDivBg.value = false;
        let droppedFiles = e.dataTransfer?.files;
        if(!droppedFiles) return;
        for(let file of Object.values(droppedFiles)) {
            toUpload.value.push(file);
        }
    }
    let slightlyWhiteDivBg = ref(false);
    let uploading = ref(false);
    function removeFromUploads(file: File) {
        if(uploading.value) return;
        toUpload.value = toUpload.value.filter(f => f != file);
    }
    let apiUrl: string = inject("API_URL") as string;
    async function uploadFile(file: File) {
        let resp = await sendRequest("serverFiles", {
            action: "upload",
            id: props.server,
            path: path.value + "/" + file.name
        });
        if(resp.type != "uploadConfirm") return;
        let arrayBuffer = await file.arrayBuffer();
        let fetchRes = await fetch(apiUrl + "/api/uploadfile/" + resp.id, {
            method: "POST",
            headers: {
                "Content-Type": "application/octet-stream"
            },
            body: arrayBuffer
        });
        if(!fetchRes.ok) throw new Error(await fetchRes.text());
    }
    let currentUploading: Ref<File | undefined> = ref()
    async function uploadFiles() {
        uploading.value = true;
        while(true) {
            let fileUploading = toUpload.value.shift();
            if(!fileUploading) break;
            currentUploading.value = fileUploading;
            await uploadFile(fileUploading);
        }
        uploading.value = false;
        showUploadModal.value = false;
        getFiles();
    }
</script>
<template>
    <Modal v-if="showUploadModal" :button-type="''" @close-btn-clicked="showUploadModal = false;toUpload=[]">
        <div v-if="!uploading">
            <div id="upload-modal-drop-div" @dragover.prevent="slightlyWhiteDivBg = true" @drop.prevent="onDrop" @dragenter.prevent="console.log('drag');slightlyWhiteDivBg = true" @dragleave.prevent="console.log('undrag');slightlyWhiteDivBg = false" :class="{
                slightlyWhite: slightlyWhiteDivBg
            }">
                <p>Drop files here</p>
            </div>
            <div v-if="toUpload.length != 0">
                <div v-for="file of toUpload">
                    {{ file.name }} <button @click="removeFromUploads(file)">Delete</button>
                </div>
                <button @click="uploadFiles">Upload {{ toUpload.length }} file{{ toUpload.length == 1 ? '' : 's' }}</button>
            </div>
        </div>
        <div v-else>
            Uploading {{ currentUploading?.name }} ({{ (currentUploading?.size ?? 0) / 1_000_000 }}MB)
        </div>
    </Modal>
    <div v-if="!finishedLoading">
        
    </div>
    <div v-else-if="!readingFile">
        <h1>Files in {{ server.name }}{{ path }} <RouterLink :to="{
        name: 'editServer',
        params: {
            server: props.server
        }
    }"><button class="back-server-page-btn">Server Page</button></RouterLink><RouterLink :to="{
        name: 'downloadPlugins',
        params: {
            server: props.server
        }
    }" v-if="path && path.toString().startsWith('/plugins') && hasServerPermission(user.user, server, 'plugins.download')">
        <button class="back-server-page-btn">Download Plugins</button>
    </RouterLink><button class="back-server-page-btn" @click="openUploadModal">Upload file</button></h1>
    <Dropdown :create-on-cursor="true" ref="dropdown">
        <div id="dropdown-inner">
            <button @click="() => {
                router.push({
                    query: {
                        path: (path + '\/' + dropdownFile.name).replaceAll('\/\/', '\/'),
                        type: 'read'
                    }
                })
            }">Open</button><br v-if="hasServerPermission(user.user, server, 'serverfiles.delete')"/>
            <button v-if="hasServerPermission(user.user, server, 'serverfiles.delete')" @click="async () => {
                dropdown.hide();
                if(await confirmModal(`Delete ${dropdownFile.name}?`, `Sure you want to delete ${dropdownFile.name}? This can't be undone.`, true, true, true)) {
                    await sendRequest('serverFiles', {
                        id: props.server,
                        action: 'delete',
                        path: path + '/' + dropdownFile.name
                    });
                    getFiles();
                    showInfoBox(`Deleted ${dropdownFile.name} successfully!`, `The file at ${dropdownFile.name} has been deleted.`);
                }
            }">Delete</button>
        </div>
    </Dropdown>
    <div class="serverfiles">

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
                }" class="link"><span class="entry file" @contextmenu.prevent="e => {dropdownFile = file;dropdown.show(e)}">{{ file.name }}</span></RouterLink>
            </div>
        </div>
    </div>
    </div>
    <div v-else>
        <RouterLink :to="{
            query: {
                path: path.toString().split('/').slice(0, -1).join('/')
            }
        }"><button>Go back</button></RouterLink> <button @click="saveFile" v-if="hasServerPermission(user.user, server, 'serverfiles.write')">Save</button> <br/>
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
.serverfiles {
    padding: 20px;
}
#dropdown-inner button {
    border-radius: 0;
    width:100%;
}

.entry {
    display:block;
    /* margin-top: 3px; */
    margin-bottom: 1px;
    border-radius: 10px;
    padding: 10px;
    display: block;
    font-size: 1.25rem;
    background-color: #3b3a3a60;
    border: 1px solid #494949;
    transition: .1s ease-in-out;
}
.entry:hover {
    background-color: #4b4a4a80;
}
.entry:hover i {
    color: white;
}
.entry i {
    margin-right: 10px;
    color: #5f5f5f;
}
.back-server-page-btn {
    margin-top: -50px;
    position: relative;
    top: -5px;
}
#upload-modal-drop-div {
    width: 500px;
    height: 200px;
    border: white 1px solid;
    margin: 10px;
    text-align: center;
    align-items: center;
    display: flex;
}
#upload-modal-drop-div > p {
    margin: 0 auto;
}
.slightlyWhite {
    background-color: #6b6b6b;
}
</style>