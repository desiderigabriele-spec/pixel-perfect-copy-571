// i18n: italiano di default, inglese selezionabile.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import it from "../locales/it.json";
import en from "../locales/en.json";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: { it: { translation: it }, en: { translation: en } },
      fallbackLng: "it",
      supportedLngs: ["it", "en"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
        lookupLocalStorage: "htt_lang",
      },
    });
}

export default i18n;