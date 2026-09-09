import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LOCALE, LOCALES, stringsFor } from "../i18n/strings.js";

const STORAGE_KEY = "nea-locale";

const LocaleContext = createContext(null);

function initialLocale() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES.includes(saved)) return saved;
  } catch {
    // 프라이버시 모드 등에서 localStorage 접근이 막힐 수 있습니다. 브라우저 설정으로 넘깁니다.
  }
  const browser = window.navigator.language?.toLowerCase() ?? "";
  return browser.startsWith("ko") ? "ko" : "en";
}

export function LocaleProvider({ children }) {
  const [locale, setLocale] = useState(initialLocale);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // 저장하지 못해도 이번 세션 동작에는 영향이 없습니다.
    }
    // 스크린 리더가 올바른 발음 규칙을 쓰도록 문서 언어를 함께 바꿉니다.
    document.documentElement.lang = locale;
  }, [locale]);

  /** 로케일이 두 개뿐이므로 전환은 "다른 쪽"으로 가는 것입니다. */
  const otherLocale = locale === "ko" ? "en" : "ko";
  const toggleLocale = useCallback(() => setLocale((prev) => (prev === "ko" ? "en" : "ko")), []);

  const value = useMemo(
    () => ({ locale, otherLocale, setLocale, toggleLocale, t: stringsFor(locale) }),
    [locale, otherLocale, toggleLocale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // 프로바이더 밖에서 쓰면 기본 로케일로 동작시킵니다. 렌더가 죽는 것보다 낫습니다.
    return {
      locale: DEFAULT_LOCALE,
      otherLocale: "en",
      setLocale: () => {},
      toggleLocale: () => {},
      t: stringsFor(DEFAULT_LOCALE),
    };
  }
  return ctx;
}

export default LocaleContext;
