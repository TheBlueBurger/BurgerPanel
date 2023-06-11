<script setup lang="ts">
    import { ref, watch } from 'vue';
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
            default: false
        },
        password: {
            type: Boolean,
            required: false,
            default: false
        },
        forceDisabled: {
            type: Boolean,
            required: false,
            default: false
        },
        modelMode: {
            type: Boolean,
            required: false,
            default: false
        }
    });
    let disabled = ref(!props.initialEditing);
    let emits = defineEmits(["set"]);
    function set() {
        if(disabled.value || props.forceDisabled) return;
        emits("set", text.value);
        disabled.value = true;
    }
    let text = ref(props.default);
    function reset() {
        text.value = props.default;
        disabled.value = true;
    }
    watch(disabled, (newVal) => {
        if(props.modelMode && newVal) disabled.value = false;
    })
</script>
<template>
    <input @keydown.enter="set" :placeholder="props.placeholder" :disabled="disabled" v-model="text" :style="{
        width: Math.max((text || '').length * 1.05 + 1, 25) + 'ch'
    }" :type="props.password ? 'password' : 'text'" @input="e => {if(modelMode) $emit('set', text)}">
    <button v-if="disabled && !modelMode" @click="() => {if(!props.forceDisabled) disabled = false}" :style="
    {
        cursor: props.forceDisabled ? 'not-allowed' : 'pointer'
    }
    ">Edit</button>
    <button v-if="!disabled && !modelMode" @click="set">Set</button>
    <button v-if="!disabled && !modelMode" @click="reset">Cancel</button>
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