<script setup>
import { initializeTheme } from '../features/appearance/theme.js'
import { RouterView } from 'vue-router'
import AppLayout from './layouts/AppLayout.vue'
initializeTheme()
</script>

<template>
  <AppLayout><RouterView :key="$route.path" /></AppLayout>
</template>
