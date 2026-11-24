<script setup>
import { RouterLink } from 'vue-router'
import ConverterCard from '../features/conversion/ConverterCard.vue'
import AppIcon from '../shared/ui/AppIcon.vue'
const facts = [
  ['file', 'Один файл за раз'],
  ['shield', 'Скачивание доступно только вам'],
  ['key', 'Те же возможности через API'],
]
const steps = ['Выберите файл', 'Запустите конвертацию', 'Скачайте результат']
</script>

<template>
  <div class="home-page">
    <section class="hero" aria-labelledby="home-title">
      <div class="hero-copy">
        <p class="hero-formats caption">JPG · PNG · DOCX → PDF</p>
        <h1 id="home-title">
          <span>Конвертируйте файлы.</span>{{ ' '
          }}<span>Продолжайте работу.</span>
        </h1>
        <p class="hero-description">
          <span class="desktop-description"
            >Изображения JPG и PNG, документы DOCX в PDF. Результат можно
            скачать или сохранить в личном кабинете.</span
          ><span class="mobile-description"
            >JPG и PNG, DOCX в PDF. Скачайте результат или сохраните в
            кабинете.</span
          >
        </p>
      </div>
      <ConverterCard />
      <div class="hero-facts">
        <p v-for="[icon, text] in facts" :key="text" class="fact">
          <AppIcon :name="icon" :size="20" /><span>{{ text }}</span>
        </p>
        <RouterLink to="/api-docs" class="api-link"
          >Как работает API <span aria-hidden="true">→</span></RouterLink
        >
      </div>
      <aside class="mobile-summary">
        <p>Просто и по делу</p>
        <p class="caption secondary">
          Один файл за раз · Приватное скачивание · Внешний API
        </p>
      </aside>
    </section>
    <section class="how-it-works container" aria-labelledby="steps-title">
      <h2 id="steps-title">Три шага до результата</h2>
      <ol class="steps">
        <li v-for="(step, index) in steps" :key="step">
          <span class="step-number">0{{ index + 1 }}</span>
          <h3>{{ step }}</h3>
        </li>
      </ol>
      <p class="storage-note caption">
        Сохраняется только результат конвертации.
        <RouterLink to="/privacy">Подробнее об обработке файлов</RouterLink>
      </p>
    </section>
  </div>
</template>
