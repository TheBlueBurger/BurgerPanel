<script setup lang="ts">
    import { ref } from 'vue';
    let props = defineProps({
        default: {
            type: String,
            required: true
        },
        placeholder: {
            type: String
        },
        initialEditing: {
            type: Boolean,
            required: false,
            default: true
        },
        password: {
            type: Boolean,
            required: false,
            default: false
        }
    });
    let disabled = ref(props.initialEditing);
    let emits = defineEmits(["set"]);
    function set() {
        if(disabled.value) return;
        emits("set", text.value);
        disabled.value = true;
    }
    let text = ref(props.default);
    function reset() {
        text.value = props.default;
        disabled.value = true;
    }
</script>
<template>
    <input @keydown.enter="set" :placeholder="props.placeholder" :disabled="disabled" v-model="text" :style="{
        width: Math.max((text || '').length * 1.05 + 1, 10) + 'ch'
    }" :type="props.password ? 'password' : 'text'">
    <button v-if="disabled" @click="disabled = false">Edit</button>
    <button v-if="!disabled" @click="set">Set</button>
    <button v-if="!disabled" @click="reset">Cancel</button>
</template>
<style scoped>
input {
    border-radius: 7px;
    border: 0px;
    padding: 3.5px;
    margin-right: 2px;
    color: black;
}
input[disabled] {
    background-color: rgb(197, 197, 197);
}
</style>