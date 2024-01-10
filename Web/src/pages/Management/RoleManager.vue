<script setup lang="ts">
import { Ref, computed, onMounted, ref, watch } from 'vue';
import { Server } from '../../../../Share/Server';
import getServerByID from '../../util/getServerByID';
import event from '../../util/event';
import { useRouter } from 'vue-router';

let finishedFetching = ref(false);
let server = ref() as Ref<undefined | Server>;
let props = defineProps({
    server: { required: true, type: String },
});
let router = useRouter();
let path = computed(() => {
    return router.currentRoute.value.query?.path || "/";
});

onMounted(async () => {
    server.value = await getServerByID(null, props.server);
    
    finishedFetching.value = true;
});
async function getRoles() {

}
</script>
<template>
    <div v-if="!finishedFetching">
        Fetching Roles...
    </div>
    <div v-else="finishedFetching">

    </div>
</template>

<style scoped></style>