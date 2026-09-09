/**
 * 헤딩 텍스트를 앵커 슬러그로 바꿉니다.
 *
 * 1. 소문자화
 * 2. 유니코드 문자·숫자·공백·하이픈만 남김
 * 3. 공백을 하이픈으로
 * 4. 앞뒤 하이픈 제거
 *
 * pipeline/validate.py 의 slugify() 와 동작이 일치해야 합니다.
 * 한쪽만 바꾸면 목차 링크가 조용히 깨지고 게이트와 앱의 판단이 어긋납니다.
 *
 * 앱 안에서는 이 파일이 유일한 구현입니다.
 * MarkdownRenderer.jsx(본문 헤딩)와 markdownOutline.js(페이지 목차)가 모두 여기서 가져다 씁니다.
 */
export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default slugify;
