// i18n: italiano di default, inglese selezionabile.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import it from "../locales/it.json";
import en from "../locales/en.json";

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: { it: { translation: it }, en: { translation: en } },
      lng: "it",
      fallbackLng: "it",
      supportedLngs: ["it", "en"],
      interpolation: { escapeValue: false },
    });
}

// Hard reset alla lingua di default per garantire che SSR e prima resa client coincidano.
// La lingua salvata in localStorage viene riapplicata da <LangSwitcher /> dopo l'idratazione.
if (i18n.language !== "it") {
  i18n.changeLanguage("it");
}

export default i18n;