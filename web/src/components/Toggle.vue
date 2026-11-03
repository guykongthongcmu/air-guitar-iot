<script setup>
defineProps({ modelValue: Boolean });
defineEmits(['update:modelValue']);
</script>

<template>
  <button class="toggle" :class="{ on: modelValue }" role="switch" :aria-checked="modelValue" @click="$emit('update:modelValue', !modelValue)"><span></span></button>
</template>
