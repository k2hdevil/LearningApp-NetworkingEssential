/**
 * 상단 유틸리티 버튼용 아이콘.
 * Cloudscape 기본 아이콘 세트에 지구본·해·달이 없어서 직접 그립니다.
 * `iconSvg` 로 넘기므로 크기는 부모가 정합니다.
 */

const COMMON = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  focusable: "false",
  "aria-hidden": "true",
};

export function GlobeIcon() {
  return (
    <svg {...COMMON}>
      <circle cx="8" cy="8" r="6.2" />
      <path d="M1.8 8h12.4" />
      <path d="M8 1.8c1.8 2 2.6 4 2.6 6.2S9.8 12.2 8 14.2C6.2 12.2 5.4 10.2 5.4 8S6.2 3.8 8 1.8Z" />
    </svg>
  );
}

export function MoonIcon() {
  return (
    <svg {...COMMON}>
      <path d="M13.4 10.2A5.6 5.6 0 0 1 6 2.7a6 6 0 1 0 7.4 7.5Z" />
    </svg>
  );
}

export function SunIcon() {
  return (
    <svg {...COMMON}>
      <circle cx="8" cy="8" r="3.1" />
      <path d="M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9 13 13M13 3l-1.1 1.1M4.1 11.9 3 13" />
    </svg>
  );
}
