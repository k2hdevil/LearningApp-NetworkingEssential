import { slugify } from "./slugify.js";

/**
 * 문서 안에 있는 "목차" 헤딩. 페이지 목차(Anchor navigation)에서 제외하고,
 * 본문에서도 걷어냅니다. 왼쪽 패널의 목차와 중복되기 때문입니다.
 */
export const TOC_HEADINGS = new Set(["목차", "contents", "table of contents"]);

// 코드 펜스. ``` 또는 ~~~ 세 개 이상.
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
// 수평선. --- 또는 *** 또는 ___
const HR_RE = /^ {0,3}(-{3,}|\*{3,}|_{3,})\s*$/;
// ATX 헤딩
const HEADING_RE = /^(#{1,6})\s+(.*\S)\s*$/;
// 번호 목록 항목 (목차 본문)
const ORDERED_ITEM_RE = /^\s*\d+\.\s/;

/**
 * 헤딩 원문에서 인라인 표기를 걷어내 화면에 보일 텍스트를 만듭니다.
 *
 * 본문 헤딩 쪽은 MarkdownRenderer.jsx 의 extractText() 가 파싱된 결과에서 텍스트를 모으고,
 * 이 함수는 원본 마크다운에서 표기를 걷어냅니다. 두 결과가 달라지면 목차 링크만 조용히
 * 깨지므로, 헤딩에 새로운 인라인 표기를 쓰기 시작하면 이 함수도 함께 손봐야 합니다.
 */
export function displayText(text) {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // 링크는 표시 텍스트만
    .replace(/`([^`]+)`/g, "$1") // 인라인 코드
    .replace(/\*\*([^*]+)\*\*/g, "$1") // 굵게
    .replace(/\*([^*]+)\*/g, "$1") // 기울임
    .replace(/\s+/g, " ")
    .trim();
}

function isTocHeading(text) {
  return TOC_HEADINGS.has(text.toLowerCase());
}

/**
 * 마크다운에서 페이지 목차 항목을 뽑습니다.
 *
 * 규칙:
 * - 코드 펜스 안의 `#` 은 헤딩이 아닙니다.
 * - **첫 수평선을 만나기 전의 모든 줄은 건너뜁니다.** 문서 골격이
 *   `# 제목` / `## 과정명` / `---` / `## 목차` 순서이므로, 이렇게 하면 제목과 부제가
 *   목차에 섞이지 않습니다. 골격의 `---` 은 장식이 아니라 동작에 필요한 요소입니다.
 * - 문서 안의 "목차" 헤딩 자체는 담지 않습니다.
 * - 같은 앵커가 두 번 나오면 처음 것만 남깁니다. (중복 id 는 스크롤 대상이 어긋납니다)
 *
 * @param {string} content 마크다운 원문
 * @param {{minLevel?: number, maxLevel?: number}} options 담을 헤딩 수준
 * @returns {{id: string, text: string, href: string, level: number}[]}
 */
export function buildOutline(content, options = {}) {
  const { minLevel = 2, maxLevel = 3 } = options;

  // Cloudscape Anchor navigation 은 3단계까지만 들여쓰기를 표현합니다.
  if (maxLevel - minLevel + 1 > 3) {
    throw new Error("Anchor navigation 의 중첩은 최대 3단계입니다");
  }
  if (!content) return [];

  const anchors = [];
  const seen = new Set();
  let inFence = false;
  let fenceMarker = null;
  let pastFirstRule = false;

  for (const line of content.split("\n")) {
    const fence = line.match(FENCE_RE);
    if (fence) {
      const marker = fence[1][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (marker === fenceMarker) {
        inFence = false;
        fenceMarker = null;
      }
      continue;
    }
    if (inFence) continue;

    if (!pastFirstRule) {
      // 첫 수평선까지는 제목·부제 영역이므로 목차에 담지 않습니다.
      if (HR_RE.test(line)) pastFirstRule = true;
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (!heading) continue;

    const level = heading[1].length;
    if (level < minLevel || level > maxLevel) continue;

    // 닫는 `#` 표기를 제거합니다. (`## 제목 ##`)
    const raw = heading[2].replace(/\s+#+$/, "");
    const text = displayText(raw);
    if (!text || isTocHeading(text)) continue;

    const id = slugify(text);
    if (!id || seen.has(id)) continue;
    seen.add(id);

    anchors.push({
      id,
      text,
      href: `#${id}`,
      level: level - minLevel + 1,
    });
  }

  return anchors;
}

/**
 * 문서 안의 "목차" 장을 본문에서 걷어냅니다.
 *
 * 왼쪽 패널이 이미 페이지 목차를 보여주므로 본문에 또 두면 화면 위쪽이 링크 목록으로만
 * 채워집니다. 헤딩 한 줄과 그 뒤에 붙은 번호 목록까지만 지우고, 다음 내용은 남깁니다.
 */
export function stripTocSection(content) {
  if (!content) return content;

  const lines = content.split("\n");
  let inFence = false;
  let fenceMarker = null;

  for (let i = 0; i < lines.length; i += 1) {
    const fence = lines[i].match(FENCE_RE);
    if (fence) {
      const marker = fence[1][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (marker === fenceMarker) {
        inFence = false;
        fenceMarker = null;
      }
      continue;
    }
    if (inFence) continue;

    const heading = lines[i].match(HEADING_RE);
    if (!heading) continue;
    // 목차는 H2 또는 H3 로 옵니다.
    if (heading[1].length < 2 || heading[1].length > 3) continue;
    if (!isTocHeading(displayText(heading[2].replace(/\s+#+$/, "")))) continue;

    // 헤딩 다음의 빈 줄과 번호 목록 줄까지가 목차 본문입니다.
    let end = i + 1;
    while (end < lines.length) {
      const line = lines[end];
      if (line.trim() === "" || ORDERED_ITEM_RE.test(line)) {
        end += 1;
        continue;
      }
      break;
    }

    return [...lines.slice(0, i), ...lines.slice(end)].join("\n");
  }

  return content;
}

export default buildOutline;
