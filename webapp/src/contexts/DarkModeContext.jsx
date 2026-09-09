import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { applyMode, Mode } from "@cloudscape-design/global-styles";
import { applyThemeVariables } from "../theme.js";

const STORAGE_KEY = "nea-dark-mode";

const DarkModeContext = createContext(null);

function initialDarkMode() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved !== null) return saved === "true";
  } catch {
    // localStorage 를 못 읽으면 OS 설정을 따릅니다.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function DarkModeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(initialDarkMode);

  useEffect(() => {
    // Cloudscape 컴포넌트의 토큰을 먼저 바꾸고,
    applyMode(darkMode ? Mode.Dark : Mode.Light);
    // 그 다음 마크다운 본문이 쓰는 --nea-* 변수를 새 토큰 값으로 다시 주입합니다.
    // 순서가 뒤바뀌면 한 프레임 동안 이전 모드의 색이 남습니다.
    applyThemeVariables();
    try {
      window.localStorage.setItem(STORAGE_KEY, String(darkMode));
    } catch {
      // 저장 실패는 무시합니다.
    }
  }, [darkMode]);

  const toggleDarkMode = useCallback(() => setDarkMode((prev) => !prev), []);

  const value = useMemo(
    () => ({ darkMode, setDarkMode, toggleDarkMode }),
    [darkMode, toggleDarkMode]
  );

  return <DarkModeContext.Provider value={value}>{children}</DarkModeContext.Provider>;
}

export function useDarkMode() {
  const ctx = useContext(DarkModeContext);
  if (!ctx) return { darkMode: false, setDarkMode: () => {}, toggleDarkMode: () => {} };
  return ctx;
}

export default DarkModeContext;
