import { useId, useState } from "react";
import AnchorNavigation from "@cloudscape-design/components/anchor-navigation";
import Box from "@cloudscape-design/components/box";
import Icon from "@cloudscape-design/components/icon";
import { scrollToAnchor } from "../lib/scroll.js";
import { SCROLL_OFFSET } from "../theme.js";

/**
 * 페이지 목차. 지금 보고 있는 모듈의 h2 목록입니다.
 *
 * 본문 옆 컬럼이 아니라 **내비게이션 패널의 모듈 트리 아래**에 둡니다.
 * 옆 컬럼으로 두면 사이드 내비가 차지한 280px 때문에 특정 창 너비에서 목차가 본문 아래로
 * 밀립니다(컨테이너 너비 기준 브레이크포인트와 창 너비 기준 판단이 어긋납니다).
 *
 * 스크롤 스파이는 Cloudscape 가 처리합니다. `scrollSpyOffset` 은 CSS 의
 * `scroll-margin-top` 과 같은 값이어야 활성 항목이 헤딩과 맞습니다.
 */
export default function OutlinePanel({ anchors, heading, ariaLabel }) {
  const [collapsed, setCollapsed] = useState(false);
  const headingId = useId();

  if (!anchors?.length) return null;

  return (
    <div className={`nea-outline${collapsed ? " nea-outline--collapsed" : ""}`}>
      <button
        type="button"
        className="nea-outline-toggle"
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <span className="nea-outline-caret">
          <Icon name={collapsed ? "caret-right-filled" : "caret-down-filled"} />
        </span>
        <Box variant="h3" padding="n" margin="n" color="text-body-secondary" id={headingId}>
          {heading}
        </Box>
      </button>
      {!collapsed && (
        <nav aria-label={ariaLabel} className="nea-outline-list">
          <AnchorNavigation
            anchors={anchors}
            ariaLabelledby={headingId}
            scrollSpyOffset={SCROLL_OFFSET}
            onFollow={(event) => {
              // 주소의 해시는 모듈 딥링크 전용입니다. 목차 클릭으로 덮어쓰지 않습니다.
              event.preventDefault();
              scrollToAnchor(event.detail.href);
            }}
          />
        </nav>
      )}
    </div>
  );
}
