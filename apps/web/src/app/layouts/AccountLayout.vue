<script setup>
import { RouterLink, useRoute } from 'vue-router'
import { accountLinks } from '../../shared/config/navigation.js'

const route = useRoute()
</script>

<template>
  <div class="account-frame container">
    <aside class="account-sidebar">
      <nav aria-label="Разделы кабинета" class="account-navigation">
        <RouterLink
          v-for="link in accountLinks"
          :key="link.to"
          :to="link.to"
          class="button button-secondary"
          :class="{ 'is-current': route.path === link.to }"
          :aria-current="route.path === link.to ? 'page' : undefined"
          >{{ link.label }}</RouterLink
        >
      </nav>
    </aside>
    <div class="account-content"><slot /></div>
  </div>
</template>
