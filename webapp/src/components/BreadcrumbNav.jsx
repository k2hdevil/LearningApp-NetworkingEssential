import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import { useLocale } from "../contexts/LocaleContext.jsx";

/**
 * 현재 위치. 과정 이름과 모듈 이름 두 단계뿐입니다.
 * 과정 단계는 갈 곳이 없으므로 클릭해도 이동하지 않습니다.
 */
export default function BreadcrumbNav({ moduleTitle, moduleId }) {
  const { t } = useLocale();

  const items = [{ text: t.courseTitle, href: "#" }];
  if (moduleTitle) {
    items.push({ text: moduleTitle, href: `#${moduleId}` });
  }

  return (
    <BreadcrumbGroup
      ariaLabel={t.breadcrumbLabel}
      items={items}
      onFollow={(event) => event.preventDefault()}
    />
  );
}
