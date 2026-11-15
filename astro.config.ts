import { defineConfig } from 'astro/config';
import typography from './integrations/typography.ts';
import { siteOrigin } from './src/config/company.ts';

export default defineConfig({
  site: siteOrigin,
  trailingSlash: 'always',
  compressHTML: true,
  build: {
    format: 'directory',
    // Cały CSS w dokumencie: brak żądań blokujących renderowanie.
    inlineStylesheets: 'always',
  },
  devToolbar: { enabled: false },
  integrations: [typography()],
});
