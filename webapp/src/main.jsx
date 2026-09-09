import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@cloudscape-design/global-styles/index.css";
import "./global.css";
import App from "./App.jsx";
import { DarkModeProvider } from "./contexts/DarkModeContext.jsx";
import { LocaleProvider } from "./contexts/LocaleContext.jsx";
import { applyThemeVariables } from "./theme.js";

// 첫 페인트 전에 --nea-* 변수를 넣어 둡니다.
// 이걸 미루면 마크다운 본문이 한 프레임 동안 색 없이 그려집니다.
applyThemeVariables();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <LocaleProvider>
      <DarkModeProvider>
        <App />
      </DarkModeProvider>
    </LocaleProvider>
  </StrictMode>
);
