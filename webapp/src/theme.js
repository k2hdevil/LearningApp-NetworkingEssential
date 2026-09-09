import * as tokens from "@cloudscape-design/design-tokens";

/**
 * Cloudscape 디자인 토큰을 마크다운 본문이 쓰는 `--nea-*` CSS 변수로 잇습니다.
 *
 * 왜 이 브리지가 필요한가:
 * 마크다운은 Cloudscape 컴포넌트가 아니라 순수 HTML(h2, table, blockquote…)로 렌더됩니다.
 * 그래서 Cloudscape 의 색을 자동으로 물려받지 못합니다. 색을 CSS 에 직접 적으면 다크 모드에서
 * 글자가 보이지 않게 되므로, 토큰을 변수로 옮겨 두고 CSS 는 변수만 참조합니다.
 *
 * 토큰 값은 대부분 `var(--color-…-해시, 기본값)` 형태의 문자열입니다. 그대로 대입해도
 * 모드가 바뀌면 브라우저가 다시 계산하지만, 평범한 색 문자열로 오는 토큰도 있어서
 * 모드 전환 때 이 함수를 다시 호출합니다.
 */

/** 코드 블록 배경. 구문 강조 테마와 짝이므로 토큰이 아니라 고정값입니다. */
export const CODE_BACKGROUND = {
  light: "#f8f8f8",
  dark: "#282c34",
};

/** 헤딩이 상단 고정 헤더에 가리지 않게 하는 여백. CSS `scroll-margin-top` 과 같아야 합니다. */
export const SCROLL_OFFSET = 80;

/**
 * 변수 이름 -> 토큰 이름.
 *
 * **여기 적은 토큰 이름은 반드시 실제로 존재해야 합니다.** 없는 이름을 쓰면 값이 `undefined`
 * 가 되어 색이 조용히 사라지거나(폴백을 두면) 라이트 모드 값이 다크 모드에 박혀서
 * 흰 배경에 흰 글자가 됩니다. 이름 오타를 사람이 알아채기 어려우므로
 * `scripts/check-tokens.mjs` 가 빌드 때 이 표를 검사합니다.
 *
 * 토큰 값은 `var(--color-…-해시, 기본값)` 문자열이라 모드가 바뀌면 브라우저가 다시 계산합니다.
 */
export const VARIABLES = {
  "--nea-text-body": "colorTextBodyDefault",
  "--nea-text-heading": "colorTextHeadingDefault",
  "--nea-text-secondary": "colorTextBodySecondary",
  "--nea-link": "colorTextLinkDefault",
  "--nea-link-hover": "colorTextLinkHover",
  "--nea-divider": "colorBorderDividerDefault",
  "--nea-surface": "colorBackgroundContainerContent",
  // 표 헤더는 컨테이너 헤더 토큰을 씁니다. `colorBackgroundTableHeader` 라는 토큰은 없습니다.
  "--nea-table-header-bg": "colorBackgroundContainerHeader",
  "--nea-row-hover-bg": "colorBackgroundDropdownItemHover",
  // 인라인 코드 배경. `colorBackgroundCodeEditorGutterDefault` 라는 토큰은 없습니다.
  "--nea-code-bg": "colorBackgroundCodeView",
  "--nea-quote-bg": "colorBackgroundStatusInfo",
  "--nea-quote-border": "colorBorderStatusInfo",
  "--nea-font-mono": "fontFamilyMonospace",
};

export function applyThemeVariables() {
  const target = document.body;
  if (!target) return;
  for (const [variable, token] of Object.entries(VARIABLES)) {
    const value = tokens[token];
    if (typeof value !== "string" || value.length === 0) {
      // 폴백을 두지 않습니다. 라이트 값을 박아 두면 다크 모드에서 대비가 무너진 채로
      // 그럴듯하게 보여서 발견이 늦습니다. 눈에 띄게 실패시키는 편이 낫습니다.
      console.error(`[theme] Cloudscape 토큰 "${token}" 이 없습니다 (${variable})`);
      continue;
    }
    target.style.setProperty(variable, value);
  }
}

export default applyThemeVariables;
