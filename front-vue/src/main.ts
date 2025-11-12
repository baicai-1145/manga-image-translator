import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { loadConfig } from './services/config';
import '@/styles/theme.css';

async function bootstrap() {
  await loadConfig();
  const app = createApp(App);
  app.use(createPinia());
  app.mount('#app');
}

bootstrap();
