<script setup lang="ts">
    import { Ref, computed, inject, onMounted, onUnmounted, ref, watch } from 'vue';
    import { Server } from '@share/Server';
    import { useRouter } from 'vue-router';
    import sendRequest from '@util/request';
    import titleManager from '@util/titleManager';
    import { confirmModal, showInfoBox } from '@util/modal';
    import { useServers } from '@stores/servers';
    import { hasServerPermission } from '@share/Permission';
    import { useUser } from '@stores/user';
    import Dropdown from '@components/Dropdown.vue';
    import Modal from '@components/Modal.vue';
    import event from '@util/event';
    import axios, { AxiosProgressEvent } from "axios";
    import TextInput from '@components/TextInput.vue';
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
    let uploading = ref(false);
    function setTitle() {
        if(uploading.value) {
            titleManager.setTitle(`${totalPercentage.value.toFixed(0)}% (${Math.floor(eta.value / 60)}m ${Math.floor(eta.value % 60)}s)`);
            return;
        }
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
    let toUpload: Ref<File[]> = ref([]);
    let showUploadModal = ref(false);
    async function openUploadModal() {
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
    function removeFromUploads(file: File) {
        if(uploading.value) return;
        toUpload.value = toUpload.value.filter(f => f != file);
    }
    let apiUrl: string = inject("API_URL") as string;
    // [[file, error]]
    let failedFiles: Ref<(Error | File)[][]> = ref([]);
    let uploadProgress = ref() as Ref<undefined | AxiosProgressEvent>;
    let totalPercentage = computed(() => {
        if(typeof totalSize.value == "undefined") return 0;
        return (((uploadTotal.value??0) / (totalSize.value??0)) * 100);
    });
    let uploadTotal = computed(() => {
        return (uploadedSize.value+(NaNprevent(uploadProgress.value?.loaded)));
    })
    async function uploadFile(file: File) {
        try {
            uploadProgress.value = undefined;
            if(file.size > 100_000_000) throw new Error("Too big!");
            let resp = await sendRequest("serverFiles", {
                action: "upload",
                id: props.server,
                path: path.value + "/" + file.name
            });
            if(resp.type != "uploadConfirm") return;
            let arrayBuffer = await file.arrayBuffer();
            /*let fetchRes = await fetch(apiUrl + "/api/uploadfile/" + resp.id, {
                method: "POST",
                headers: {
                    "Content-Type": "application/octet-stream"
                },
                body: arrayBuffer
            });
            if(!fetchRes.ok) throw new Error(`Server sent: '${await fetchRes.text()}'. Upload ID: ${resp.id}`);*/
            await axios.post(apiUrl + "/api/uploadfile/" + resp.id, arrayBuffer, {
                method: "POST",
                headers: {
                    "Content-Type": "application/octet-stream",
                },
                onUploadProgress(p) {
                    if(typeof p.rate == "number") lastSafeRate.value = p.rate;
                    setTitle();
                    uploadProgress.value = p;
                }
            })
        } catch(err) {
            failedFiles.value.push([file, err as Error])
        }
    }
    let currentUploading: Ref<File | undefined> = ref();
    let totalUploadCount = ref(0);
    async function uploadFiles() {
        failedFiles.value = [];
        uploaded.value = [];
        totalSize.value = toUpload.value.map(a => a.size).reduce((a,b) => a+b);
        uploading.value = true;
        totalUploadCount.value = toUpload.value.length;
        while(true) {
            let fileUploading = toUpload.value.shift();
            if(!fileUploading) break;
            currentUploading.value = fileUploading;
            await uploadFile(fileUploading);
            uploaded.value.push(fileUploading.size)
        }
        uploading.value = false;
        currentUploading.value = undefined;
        showUploadModal.value = false;
        if(failedFiles.value.length != 0) {
            await showInfoBox(`Failed to upload ${failedFiles.value.length} file${failedFiles.value.length==1?'':'s'}`, failedFiles.value.map(failedFile => `${failedFile[0].name}: ${failedFile[1]}`).join(`\n`))
        }
        event.emit("createNotification", `${totalUploadCount.value-failedFiles.value.length}/${totalUploadCount.value} file${totalUploadCount.value == 1 ? "" : "s"} uploaded successfully!`);
        getFiles();
        setTitle();
    }
    let uploaded = ref([] as number[]);
    let uploadedSize = computed(() => {
        let totalUploadFinished = 0;
        uploaded.value.forEach(a => totalUploadFinished += a);
        return totalUploadFinished ?? 0
    })
    let modalFileChooser: Ref<HTMLInputElement | undefined> = ref();
    function addFiles(f: FileList | null | undefined) {
        if(!f) return;
        Array.from(f).forEach(f => toUpload.value.push(f))
    }
    let totalSize: Ref<number | undefined> = ref();
    function onDropAnywhere(e: DragEvent) {
        e.preventDefault();
        if(readingFile.value) return;
        if(showUploadModal.value) return;
        if(e.dataTransfer?.files?.length == 0) return;
        showUploadModal.value = true;
        addFiles(e.dataTransfer?.files);
    }
    function prevent(e: Event) {
        e.preventDefault();
    }
    onMounted(() => {
        window.addEventListener("drop", onDropAnywhere);
        window.addEventListener("dragover", prevent);
    });
    onUnmounted(() => {
        window.removeEventListener("drop", onDropAnywhere);
        window.removeEventListener("dragover", prevent);
    });
    function closeModal() {
        if(uploading.value) return;
        showUploadModal.value = false;
        toUpload.value = [];
    }
    async function downloadFile(path: string) {
        if(dropdown.value) {
            dropdown.value.hide();
        }
        let resp = await sendRequest("serverFiles", {
            path,
            id: props.server,
            action: "download"
        });
        if(resp.type != "downloadConfirm") return;
        if(!downloadAnchor.value) return;
        downloadAnchor.value.href = apiUrl + "/api/downloadfile/" + resp.id;
        downloadAnchor.value.click();
    }
    let lastSafeRate = ref(1000);
    function NaNprevent(value: number | undefined, defaultValue: number = 0, allowInfinity: boolean = false) {
        if(typeof value == "undefined") return defaultValue;
        if(Number.isNaN(value) || typeof value != "number") return defaultValue;
        return value;
    }
    let downloadAnchor: Ref<HTMLAnchorElement | undefined> = ref();
    let eta = computed(() => (((totalSize.value??0)-uploadTotal.value) / (lastSafeRate.value)));
    let newType = ref("file");
    let newName = ref("");
    let showNewDialog = ref(false);
    async function createNew() {
        await sendRequest("serverFiles", {
            action: "new",
            type: newType.value,
            path: path.value + "/" + newName.value,
            id: server.value?._id
        });
        showNewDialog.value = false;
        if(newType.value == "folder" && openWhenCreated.value) router.push({query: {path: path.value + "/" + newName.value}});
        else await getFiles();
    }
    let openWhenCreated = ref(false);
    let showMoveDialog = ref(false);
    let selectedMoveToFolder = ref(".");
    let selectedMoveToName = ref("");
    watch(showMoveDialog, () => {
        selectedMoveToFolder.value = ".";
    });
    async function moveFile() {
        showMoveDialog.value = false;
        await sendRequest("serverFiles", {
            action: "move",
            path: path.value + "/" + dropdownFile.value.name,
            to: path.value + "/" +selectedMoveToFolder.value + "/" + selectedMoveToName.value,
            id: server.value?._id
        });
        await getFiles();
    }
</script>
<template>
    <a style="position: absolute;visibility: hidden;" ref="downloadAnchor" />
    <Modal button-type="" @close-btn-clicked="showNewDialog = false" v-if="showNewDialog">
        <h1 style="margin-bottom:10px">New</h1>
        <TextInput :modal-mode="true" default="" @set="a => newName = a" :initial-editing="true" placeholder="Name" />
        <br/>
        <button :style="{
            backgroundColor: newType == 'file' ? '#e3dede' : undefined,
            color: newType == 'file' ? 'black' : 'white',
            marginBottom: '15px'
        }" @click="newType = 'file'" :disabled="newType == 'file'">File</button><button :style="{
            backgroundColor: newType == 'folder' ? '#e3dede' : undefined,
            color: newType == 'folder' ? 'black' : 'white'
        }" @click="newType = 'folder'" :disabled="newType == 'folder'">Folder</button>
        <br v-if="newType != 'folder'"/>
        <div v-if="newType == 'folder'">
            Enter folder when created <input type="checkbox" v-model="openWhenCreated">
        </div>
        <button @click="createNew">Create</button>
    </Modal>
    <Modal button-type="" @close-btn-clicked="showMoveDialog = false" v-if="showMoveDialog">
    <h1>Moving {{ dropdownFile.name }}</h1>
    Move to:
    <div v-for="folder of ['.', '..', ...files?.filter(f => f.folder).map(f => f.name) ?? []]">
        <button @click="selectedMoveToFolder = folder" :style="{
            backgroundColor: selectedMoveToFolder == folder ? '#737475' : undefined
        }" :disabled="['', '/'].includes(path.toString()) && folder == '..'">{{ folder }}</button>
    </div>
    <input type="text" placeholder="Name" v-model="selectedMoveToName"><button @click="moveFile">Move</button><br/>
    {{ (path + "/" + dropdownFile.name).replace("//", "/") }} will be moved to {{ (path + "/" +selectedMoveToFolder + "/" + selectedMoveToName).replaceAll("/./", "/").replaceAll("//", "/") }}
    </Modal>
    <Modal v-if="showUploadModal" :button-type="''" @close-btn-clicked="closeModal">
        <div v-if="!uploading">
            <div id="upload-modal-drop-div" @dragover.prevent="slightlyWhiteDivBg = true" @drop.prevent="onDrop" @dragenter.prevent="console.log('drag');slightlyWhiteDivBg = true" @dragleave.prevent="console.log('undrag');slightlyWhiteDivBg = false" :class="{
                slightlyWhite: slightlyWhiteDivBg
            }" @click="modalFileChooser?.click()">
                <p>Drop files here or click to open file chooser</p>
                <input type="file" style="visibility:hidden;position:absolute;" ref="modalFileChooser" multiple @change.prevent="e => {
                    addFiles((e.target as HTMLInputElement).files);
                }">
            </div>
            <div v-if="toUpload.length != 0">
                <div v-for="file of toUpload" class="file-item">
                    {{ file.name }} ({{ (file?.size ?? 0) / 1_000_000 }}MB) <span style="color: red;">{{ file.size > 100_000_000 ? "Too big! " : " " }}</span><button @click="removeFromUploads(file)">Delete</button>
                </div>
                <button @click="uploadFiles">Upload {{ toUpload.length }} file{{ toUpload.length == 1 ? '' : 's' }}</button>
            </div>
        </div>
        <div v-else style="width:350px">
            {{ currentUploading?.name }}
            <br/>
            <div :style="{
                width: '290px',
                height: '5px',
                borderRadius: '3px',
                margin: '0 auto',
                marginTop: '10px',
                marginBottom: '10px',
                border: 'white 1px solid'
            }">
                <div id="bar" :style="{
                    backgroundColor: 'white',
                    height: '5px',
                    width: ((parseInt(totalPercentage.toString()) * 2.9) + 'px')
                }" />
            </div>
            <div style="text-align: center;">
                {{ (uploadTotal / 1_000_000).toFixed(3) }}/{{ ((totalSize ?? 0) / 1_000_000).toFixed(3) }}MB @ {{ ((uploadProgress?.rate??0)/1000).toFixed(2) }} KB/s<br/>
                <span style="float:left">ETA: {{ Math.floor(eta / 60) }}m {{ Math.floor(eta % 60) }}s</span>
                {{ totalPercentage.toFixed(2) }}%
                <span style="float:right">{{ uploaded.length }} / {{ totalUploadCount }} completed</span>
            </div>
        </div>
    </Modal>
    <div v-if="!finishedLoading">
        
    </div>
    <div v-else-if="!readingFile">
        <h1 class="filesin">Files in {{ server.name }}{{ path }} <RouterLink :to="{
        name: 'editServer',
        params: {
            server: props.server
        }
    }"><button class="back-server-page-btn">Server Page</button></RouterLink><button class="back-server-page-btn" @click="openUploadModal">Upload files</button><RouterLink :to="{
        name: 'downloadPlugins',
        params: {
            server: props.server
        }
    }" v-if="path && path.toString().startsWith('/plugins') && hasServerPermission(user.user, server, 'plugins.download')">
        <button class="back-server-page-btn">Download Plugins</button>
    </RouterLink><button class="back-server-page-btn" @click="newName = '';showNewDialog = true">New</button></h1>
    <Dropdown :create-on-cursor="true" ref="dropdown">
        <div id="dropdown-inner">
            <button @click="() => {
                router.push({
                    query: {
                        path: (path + '\/' + dropdownFile.name).replaceAll('\/\/', '\/'),
                        type: 'read'
                    }
                })
            }">Open</button><br v-if="hasServerPermission(user.user, server, 'serverfiles.delete') && !dropdownFile.folder"/>
            <button v-if="hasServerPermission(user.user, server, 'serverfiles.delete') && !dropdownFile.folder" @click="async () => {
                dropdown.hide();
                if(await confirmModal(`Delete ${dropdownFile.name}?`, `Sure you want to delete ${dropdownFile.name}? This can't be undone.`, true, true, true)) {
                    await sendRequest('serverFiles', {
                        id: props.server,
                        action: 'delete',
                        path: path + '/' + dropdownFile.name
                    });
                    getFiles();
                    event.emit('createNotification', `${dropdownFile.name} has been removed.`)
                }
            }">Delete</button><br v-if="hasServerPermission(user.user, server, 'serverfiles.download') && !dropdownFile.folder">
            <button v-if="hasServerPermission(user.user, server, 'serverfiles.download') && !dropdownFile.folder" @click="downloadFile(path + '/' + dropdownFile.name)">Download</button>
            <br v-if="hasServerPermission(user.user, server, 'serverfiles.rename')">
            <button v-if="hasServerPermission(user.user, server, 'serverfiles.rename')" @click="dropdown.hide();selectedMoveToName = dropdownFile.name;showMoveDialog = true">Move/rename</button>
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
                }" class="link"><span class="entry folder" @contextmenu.prevent="e => {dropdownFile = file;dropdown.show(e)}">{{ file.name }}/</span></RouterLink>
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
        }"><button>Go back</button></RouterLink> <button @click="saveFile" v-if="hasServerPermission(user.user, server, 'serverfiles.write')">Save</button> <button @click="() => typeof path == 'string' ? downloadFile(path) : 0" v-if="hasServerPermission(user.user, server, 'serverfiles.download')">Download File</button> <br/>
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
.filesin {
    margin-top: 20px;
    margin-left: 20px;
}
.file-item {
    margin-left: 10px;
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
.back-server-page-btn { /* all top buttons yes ik its stupid */
    margin-top: -50px;
    position: relative;
    top: -5px;
    margin: 2px;
}
#upload-modal-drop-div {
    width: 500px;
    height: 200px;
    border: #494949 1px solid;
    background-color: #3b3a3a60;
    border-radius: 5px;
    margin: 10px;
    text-align: center;
    align-items: center;
    display: flex;
    cursor: pointer;
    transition: .1s ease-in-out;
}
#upload-modal-drop-div:hover {
    background-color: #4b4a4a70;
}
#upload-modal-drop-div > p {
    margin: 0 auto;
}
.slightlyWhite {
    background-color: #6b6b6b;
}
</style>