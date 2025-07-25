import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import translationEN from './locales/en/translation.json'
import translationES from './locales/es/translation.json'

const savedLanguage = localStorage.getItem('lang') || 'en'

const resources = {
  en: { translation: translationEN },
  es: { translation: translationES },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
