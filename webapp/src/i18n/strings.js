/**
 * UI 문자열. 콘텐츠(마크다운)에 들어가는 문장은 여기에 두지 않습니다.
 * 모듈 제목은 navigationTree.js 의 `title: { ko, en }` 에 있습니다.
 */

export const LOCALES = ["ko", "en"];

export const DEFAULT_LOCALE = "ko";

/** 언어 전환 버튼에 보일 "다른 쪽" 언어 이름. */
export const LOCALE_NAMES = {
  ko: "한국어",
  en: "English",
};

const FOOTER_KO =
  "이 자료는 AWS T&C 공식 교육 자료가 아닙니다. 강사가 🤖 Kiro로 빌드한 보조 자료이며, " +
  "원본 강사용 덱을 AWS 공식 문서로 검증·최신화한 결과입니다. " +
  "일부 오류가 있을 수 있으므로 시험·실무 적용 전에는 본문의 출처 링크를 확인하세요.";

const FOOTER_EN =
  "This is not official AWS T&C courseware. It is a companion summary built by the instructor " +
  "with 🤖 Kiro, based on the original instructor deck and verified against current AWS " +
  "documentation. It may contain errors, so check the source links in each page before relying " +
  "on it for exams or production work.";

export const strings = {
  ko: {
    // 상단 헤더에는 과정 이름을 그대로 씁니다. 과정명은 원문이 영어라 로케일에 따라 바뀌지 않습니다.
    seriesTitle: "Networking Essentials for Cloud Applications on AWS",
    courseTitle: "Networking Essentials for Cloud Applications on AWS",

    navigationLabel: "모듈 내비게이션",
    navigationClose: "내비게이션 닫기",
    navigationToggle: "내비게이션 열기",
    breadcrumbLabel: "현재 위치",

    treeHeading: "과정 목차",
    outlineHeading: "모듈 목차",
    outlineLabel: "이 문서의 목차",

    languageSwitch: "언어 전환",
    darkModeOn: "다크 모드 켜기",
    darkModeOff: "다크 모드 끄기",

    loading: "문서를 불러오는 중입니다",
    comingSoonSuffix: "(준비 중)",
    badgeNew: "신규",

    contentErrorHeader: "문서를 표시할 수 없습니다",
    contentNotReady: "이 모듈은 아직 준비 중입니다.",
    contentLoadFailed: "문서를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
    documentFallbackTitle: "정리 자료",
    translationPending: "이 문서의 번역본이 아직 없어 한국어 원본을 보여 줍니다.",

    codeSnippet: "코드",
    copyCode: "코드 복사",
    copySuccess: "복사했습니다",
    copyError: "복사하지 못했습니다",

    diagramLoading: "다이어그램을 그리는 중입니다",
    diagramErrorPrefix: "다이어그램을 그리지 못했습니다",
    diagramZoom: "다이어그램 확대",
    diagramZoomClose: "확대 닫기",

    footer: FOOTER_KO,
  },
  en: {
    seriesTitle: "Networking Essentials for Cloud Applications on AWS",
    courseTitle: "Networking Essentials for Cloud Applications on AWS",

    navigationLabel: "Module navigation",
    navigationClose: "Close navigation",
    navigationToggle: "Open navigation",
    breadcrumbLabel: "Breadcrumbs",

    treeHeading: "Course contents",
    outlineHeading: "Module contents",
    outlineLabel: "On this page",

    languageSwitch: "Switch language",
    darkModeOn: "Turn on dark mode",
    darkModeOff: "Turn off dark mode",

    loading: "Loading the document",
    comingSoonSuffix: "(coming soon)",
    badgeNew: "New",

    contentErrorHeader: "Cannot display this document",
    contentNotReady: "This module is not ready yet.",
    contentLoadFailed: "Could not load the document. Please try again in a moment.",
    documentFallbackTitle: "Summary",
    translationPending:
      "The translation of this page is not ready yet, so the Korean original is shown.",

    codeSnippet: "Code",
    copyCode: "Copy code",
    copySuccess: "Copied",
    copyError: "Could not copy",

    diagramLoading: "Rendering the diagram",
    diagramErrorPrefix: "Could not render the diagram",
    diagramZoom: "Zoom diagram",
    diagramZoomClose: "Close zoom",

    footer: FOOTER_EN,
  },
};

export function stringsFor(locale) {
  return strings[locale] ?? strings[DEFAULT_LOCALE];
}

export default strings;
