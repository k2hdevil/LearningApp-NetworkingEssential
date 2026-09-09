/**
 * 스크롤 동작을 한곳에서 정합니다.
 *
 * 목차·본문 상호 참조는 주소의 해시를 건드리지 않고 직접 스크롤합니다.
 * 해시는 **모듈 딥링크 전용**이라, 앵커 클릭으로 덮어쓰면 그 주소를 새로고침하거나
 * 공유했을 때 어느 모듈이었는지 알 수 없게 됩니다.
 */

/** 움직임 최소화를 켠 사용자에게는 애니메이션 없이 이동합니다. */
export function scrollBehavior() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/**
 * 앵커 대상으로 스크롤합니다.
 * @returns {boolean} 대상을 찾아 이동했는지
 */
export function scrollToAnchor(href) {
  if (!href?.startsWith("#")) return false;
  const id = decodeURIComponent(href.slice(1));
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  return true;
}
