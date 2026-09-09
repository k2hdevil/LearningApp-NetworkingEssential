import { useMemo } from "react";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import Badge from "@cloudscape-design/components/badge";
import Box from "@cloudscape-design/components/box";
import Icon from "@cloudscape-design/components/icon";
import { navigationTree } from "../data/navigationTree.js";
import { useLocale } from "../contexts/LocaleContext.jsx";

/**
 * 과정 목차(모듈 트리).
 *
 * 접을 수 있게 만든 이유: 아래에 페이지 목차가 붙기 때문입니다. M01 처럼 긴 모듈을 볼 때
 * 트리를 접으면 페이지 목차가 화면을 넉넉히 쓸 수 있습니다.
 */
export default function TreeNavigation({ activeId, onNavigate, collapsed, onToggleCollapsed }) {
  const { locale, t } = useLocale();

  const items = useMemo(() => {
    // 그룹이 하나면 제목을 또 보여줄 필요가 없습니다. 헤더가 이미 "과정 목차" 입니다.
    const flat = navigationTree.length === 1;

    return navigationTree.flatMap((group, groupIndex) => {
      const links = (group.children ?? []).map((item) => {
        const title = item.title?.[locale] ?? item.title?.ko ?? item.id;

        if (!item.contentFile) {
          // 열 수 없는 항목입니다. 앱이 이 해시를 받으면 첫 모듈로 넘기고 주소를 정정합니다.
          return {
            type: "link",
            text: `${title} ${t.comingSoonSuffix}`,
            href: `#unavailable-${item.id}`,
          };
        }

        return {
          type: "link",
          text: title,
          href: `#${item.id}`,
          info: item.isNew ? <Badge color="green">{t.badgeNew}</Badge> : undefined,
        };
      });

      if (flat) return links;

      const section = {
        type: "section",
        text: group.title?.[locale] ?? group.title?.ko ?? "",
        defaultExpanded: true,
        items: links,
      };
      return groupIndex > 0 ? [{ type: "divider" }, section] : [section];
    });
  }, [locale, t.badgeNew, t.comingSoonSuffix]);

  return (
    <>
      <button
        type="button"
        className="nea-tree-toggle"
        aria-expanded={!collapsed}
        onClick={onToggleCollapsed}
      >
        <span className="nea-tree-caret">
          <Icon name={collapsed ? "caret-right-filled" : "caret-down-filled"} />
        </span>
        <Box variant="h3" padding="n" margin="n" color="text-body-secondary">
          {t.treeHeading}
        </Box>
      </button>
      <div className="nea-nav-tree">
        <SideNavigation
          activeHref={`#${activeId}`}
          items={items}
          onFollow={(event) => {
            event.preventDefault();
            const href = event.detail.href ?? "";
            if (!href.startsWith("#")) return;
            onNavigate(href.slice(1));
          }}
        />
      </div>
    </>
  );
}
