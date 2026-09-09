import { useCallback, useEffect, useRef, useState } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import http from "react-syntax-highlighter/dist/esm/languages/prism/http";
import ini from "react-syntax-highlighter/dist/esm/languages/prism/ini";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import Button from "@cloudscape-design/components/button";
import { useDarkMode } from "../contexts/DarkModeContext.jsx";
import { useLocale } from "../contexts/LocaleContext.jsx";
import { CODE_BACKGROUND } from "../theme.js";

/**
 * 구문 강조를 적용할 언어.
 *
 * 콘텐츠 규칙: 코드 블록에는 반드시 언어 태그를 붙이고, **여기에 등록된 것만** 강조됩니다.
 * 새 언어를 쓰려면 위에 import 를 추가하고 이 표에 넣으세요.
 */
export const LANGUAGES = {
  bash,
  csharp,
  http,
  ini,
  java,
  javascript,
  json,
  python,
  sql,
  typescript,
  yaml,
};

/** 콘텐츠에서 흔히 쓰는 별칭을 정식 이름으로 맞춥니다. */
export const LANGUAGE_ALIASES = {
  console: "bash",
  sh: "bash",
  shell: "bash",
  cs: "csharp",
  js: "javascript",
  ts: "typescript",
  py: "python",
  yml: "yaml",
};

/**
 * 강조 대상이 아닌 언어.
 *
 * `text` 는 라우팅 테이블이나 명령 출력 예처럼 **문법이 없는 내용**에 씁니다.
 * 토큰이 생기지 않는 것이 정상이므로 렌더 검증도 이 블록에는 강조를 요구하지 않습니다.
 */
export const PLAIN_LANGUAGES = new Set(["text", "plaintext", "txt", "none"]);

for (const [name, definition] of Object.entries(LANGUAGES)) {
  SyntaxHighlighter.registerLanguage(name, definition);
}

/** 마크다운의 언어 태그를 실제 등록 이름으로 바꿉니다. 등록되지 않았으면 null. */
export function resolveLanguage(language) {
  if (!language) return null;
  const normalized = String(language).toLowerCase();
  const canonical = LANGUAGE_ALIASES[normalized] ?? normalized;
  return canonical in LANGUAGES ? canonical : null;
}

export default function CodeBlockWrapper({ code, language }) {
  const { darkMode } = useDarkMode();
  const { t } = useLocale();
  const [copyState, setCopyState] = useState("idle");
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyState("copied");
    } catch {
      // 보안 컨텍스트가 아니거나 권한이 없으면 실패합니다. 사용자에게 알리고 넘어갑니다.
      setCopyState("error");
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopyState("idle"), 2000);
  }, [code]);

  const declared = String(language ?? "").toLowerCase();
  const resolved = resolveLanguage(declared);
  const isPlain = !resolved || PLAIN_LANGUAGES.has(declared);

  const copyLabel =
    copyState === "copied" ? t.copySuccess : copyState === "error" ? t.copyError : t.copyCode;

  return (
    <div
      className="code-block"
      // 렌더 검증이 읽는 표시입니다.
      // `data-highlighted="true"` 인 블록에만 토큰이 있어야 합니다.
      data-language={declared || "none"}
      data-highlighted={String(!isPlain)}
    >
      <div className="code-block-header">
        <span className="code-block-language">{declared || t.codeSnippet}</span>
        <Button
          variant="inline-icon"
          iconName={copyState === "copied" ? "status-positive" : "copy"}
          ariaLabel={copyLabel}
          onClick={handleCopy}
        />
      </div>
      <SyntaxHighlighter
        language={resolved ?? undefined}
        style={darkMode ? oneDark : oneLight}
        // 배경은 테마 대신 고정값으로 강제합니다. 모드 전환 검증이 이 두 값을 확인합니다.
        customStyle={{
          margin: 0,
          padding: "12px 14px",
          background: darkMode ? CODE_BACKGROUND.dark : CODE_BACKGROUND.light,
          fontSize: "13px",
          lineHeight: 1.6,
          borderRadius: 0,
        }}
        codeTagProps={{ style: { fontFamily: "var(--nea-font-mono)" } }}
        wrapLongLines={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}
