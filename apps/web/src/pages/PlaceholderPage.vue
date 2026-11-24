<script setup>
import { useRoute, RouterLink } from 'vue-router'
const route = useRoute()
</script>

<template>
  <section
    class="placeholder-page container"
    aria-labelledby="placeholder-title"
  >
    <h1 id="placeholder-title">{{ route.meta.title }}</h1>
    <p class="secondary">
      {{
        route.meta.pending
          ? 'Этот раздел ещё не реализован. Сейчас доступны конвертер и форма входа в предварительной версии.'
          : 'Проверьте адрес или вернитесь к конвертеру.'
      }}
    </p>
    <RouterLink to="/" class="button button-primary">К конвертеру</RouterLink>
  </section>
</template>
