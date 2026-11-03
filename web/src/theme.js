import { ref, watchEffect } from 'vue';

let saved = null;
try {
  saved = localStorage.getItem('ag.theme');
} catch {}
const dark = window.matchMedia('(prefers-color-scheme: dark)');
export const theme = ref(saved || (dark.matches ? 'dark' : 'light'));

dark.addEventListener('change', e => {
  if (!saved) theme.value = e.matches ? 'dark' : 'light';
});

watchEffect(() => document.documentElement.setAttribute('data-theme', theme.value));

export function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
  saved = theme.value;
  try {
    localStorage.setItem('ag.theme', theme.value);
  } catch {}
}
