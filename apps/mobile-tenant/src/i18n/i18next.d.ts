import type { TranslationSchema } from './locales/fr';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: TranslationSchema;
    };
    returnNull: false;
  }
}
