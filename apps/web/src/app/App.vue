<script setup>
import { RouterView } from 'vue-router'
import AppLayout from './layouts/AppLayout.vue'
</script>

<template>
  <AppLayout><RouterView :key="$route.path" /></AppLayout>
</template>
