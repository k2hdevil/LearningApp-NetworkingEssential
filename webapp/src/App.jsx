import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppLayout from "@cloudscape-design/components/app-layout";
import Alert from "@cloudscape-design/components/alert";
import Badge from "@cloudscape-design/components/badge";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import TopNavigation from "@cloudscape-design/components/top-navigation";

import BreadcrumbNav from "./components/BreadcrumbNav.jsx";
import MarkdownRenderer from "./components/MarkdownRenderer.jsx";
import OutlinePanel from "./components/OutlinePanel.jsx";
import TreeNavigation from "./components/TreeNavigation.jsx";
import { GlobeIcon, MoonIcon, SunIcon } from "./components/icons.jsx";
import { useDarkMode } from "./contexts/DarkModeContext.jsx";
import { useLocale } from "./contexts/LocaleContext.jsx";
import { buildOutline, stripTocSection } from "./lib/markdownOutline.js";
import { findModule, firstAvailableId, isOpenable, TAG_COLORS } from "./data/navigationTree.js";
import { LOCALE_NAMES } from "./i18n/strings.js";

/** 좁은 화면에서는 내비게이션을 접어 둡니다. */
const NARROW_BREAKPOINT = 768;

function getHash() {
  return decodeURIComponent(window.location.hash.replace(/^#/, ""));
}

/** 콘텐츠 경로. 한국어는 루트, 그 외 로케일은 하위 디렉터리입니다. */
function contentPath(locale, file) {
  return locale === "ko" ? `/content/${file}` : `/content/${locale}/${file}`;
}

/**
 * 마크다운을 가져옵니다. 없으면 null.
 *
 * 상태 코드만 믿으면 안 됩니다. 개발 서버와 Amplify 의 SPA 리다이렉트 규칙은 없는 경로에도
 * `index.html` 을 200 으로 돌려주기 때문에, 파일이 없는데 성공으로 보이고 HTML 이 본문으로
 * 렌더됩니다. 그래서 내용이 실제로 마크다운인지 함께 확인합니다.
 */
async function fetchMarkdown(path, signal) {
  const response = await fetch(path, { signal });
  if (!response.ok) return null;
  if ((response.headers.get("content-type") ?? "").includes("html")) return null;
  const text = await response.text();
  return text.trimStart().startsWith("<") ? null : text;
}

export default function App() {
  const { locale, otherLocale, toggleLocale, t } = useLocale();
  const { darkMode, toggleDarkMode } = useDarkMode();

  // 주소의 해시가 열 수 있는 모듈을 가리키면 그것으로 시작합니다.
  const [activeId, setActiveId] = useState(() => {
    const hash = getHash();
    return isOpenable(hash) ? hash : firstAvailableId();
  });
  const [navOpen, setNavOpen] = useState(() => window.innerWidth > NARROW_BREAKPOINT);
  const [treeCollapsed, setTreeCollapsed] = useState(false);

  const [rawContent, setRawContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usedFallbackLocale, setUsedFallbackLocale] = useState(false);

  // 해시 동기화 리스너는 한 번만 등록하므로, 최신 activeId 를 ref 로 따라갑니다.
  const activeIdRef = useRef(activeId);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  // 마운트 시 주소 정정.
  // 열 수 없는 해시로 들어온 경우 화면과 주소가 다른 모듈을 가리키면 안 됩니다.
  useEffect(() => {
    if (getHash() !== activeIdRef.current) {
      window.history.replaceState(null, "", `#${activeIdRef.current}`);
    }
  }, []);

  // 주소 변화를 따라갑니다.
  // popstate 는 뒤로 가기(pushState 로 남긴 기록)를, hashchange 는 주소창에서 해시만
  // 바꿔 들어온 경우를 잡습니다. 경로가 같고 해시만 다른 이동은 페이지를 다시 로드하지
  // 않으므로 위의 마운트 효과가 돌지 않습니다. 그래서 두 경로가 모두 필요합니다.
  useEffect(() => {
    const sync = () => {
      const hash = getHash();
      if (isOpenable(hash)) {
        setActiveId(hash);
        return;
      }
      window.history.replaceState(null, "", `#${activeIdRef.current}`);
    };
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const navigate = useCallback((id) => {
    if (!isOpenable(id)) return;
    // 뒤로 가기가 동작하도록 기록을 남깁니다. pushState 는 hashchange 를 만들지 않으므로
    // 위의 동기화 리스너와 겹쳐 돌지 않습니다.
    window.history.pushState(null, "", `#${id}`);
    setActiveId(id);
    if (window.innerWidth <= NARROW_BREAKPOINT) setNavOpen(false);
  }, []);

  const activeModule = findModule(activeId);
  const contentFile = activeModule?.contentFile;

  // 콘텐츠 로드.
  useEffect(() => {
    if (!contentFile) {
      setRawContent("");
      setError(t.contentNotReady);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setUsedFallbackLocale(false);

    const load = async () => {
      let text = await fetchMarkdown(contentPath(locale, contentFile), controller.signal);
      let fellBack = false;

      // 번역본이 아직 없으면 한국어 원본을 보여 줍니다.
      // 언어를 바꿨다고 문서가 사라지는 것보다 낫고, 안내를 함께 띄웁니다.
      if (text === null && locale !== "ko") {
        text = await fetchMarkdown(contentPath("ko", contentFile), controller.signal);
        fellBack = text !== null;
      }
      if (text === null) throw new Error(`콘텐츠를 찾지 못했습니다: ${contentFile}`);

      if (cancelled) return;
      setRawContent(text);
      setUsedFallbackLocale(fellBack);
      setLoading(false);
      window.scrollTo({ top: 0 });
    };

    load().catch((err) => {
      if (cancelled || err.name === "AbortError") return;
      setRawContent("");
      setError(t.contentLoadFailed);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [contentFile, locale, t.contentLoadFailed, t.contentNotReady]);

  // 페이지 목차는 h2 만 담습니다. h3 까지 넣으면 모듈 하나에 수십 개가 붙습니다.
  const outline = useMemo(() => buildOutline(rawContent, { maxLevel: 2 }), [rawContent]);
  // 본문의 "목차" 장은 걷어냅니다. 왼쪽 패널이 같은 역할을 합니다.
  const bodyContent = useMemo(() => stripTocSection(rawContent), [rawContent]);

  const moduleTitle = activeModule?.title?.[locale] ?? activeModule?.title?.ko;
  const tags = activeModule?.tags ?? [];

  useEffect(() => {
    document.title = moduleTitle ? `${moduleTitle} | ${t.seriesTitle}` : t.seriesTitle;
  }, [moduleTitle, t.seriesTitle]);

  return (
    <>
      <div id="top-nav">
        <TopNavigation
          identity={{
            href: "#",
            title: t.seriesTitle,
            onFollow: (event) => event.preventDefault(),
          }}
          utilities={[
            {
              type: "button",
              iconSvg: <GlobeIcon />,
              text: LOCALE_NAMES[otherLocale],
              ariaLabel: t.languageSwitch,
              onClick: toggleLocale,
            },
            {
              type: "button",
              iconSvg: darkMode ? <SunIcon /> : <MoonIcon />,
              ariaLabel: darkMode ? t.darkModeOff : t.darkModeOn,
              onClick: toggleDarkMode,
            },
          ]}
        />
      </div>

      <AppLayout
        headerSelector="#top-nav"
        toolsHide
        navigationWidth={280}
        navigationOpen={navOpen}
        onNavigationChange={({ detail }) => setNavOpen(detail.open)}
        ariaLabels={{
          navigation: t.navigationLabel,
          navigationClose: t.navigationClose,
          navigationToggle: t.navigationToggle,
        }}
        navigation={
          <div className={`nea-nav${treeCollapsed ? " nea-nav--tree-collapsed" : ""}`}>
            <TreeNavigation
              activeId={activeId}
              onNavigate={navigate}
              collapsed={treeCollapsed}
              onToggleCollapsed={() => setTreeCollapsed((prev) => !prev)}
            />
            {!loading && !error && (
              <OutlinePanel
                anchors={outline}
                heading={t.outlineHeading}
                ariaLabel={t.outlineLabel}
              />
            )}
          </div>
        }
        breadcrumbs={<BreadcrumbNav moduleTitle={moduleTitle} moduleId={activeId} />}
        content={
          <ContentLayout
            header={
              <SpaceBetween size="xs">
                <Header variant="h1" description={t.courseTitle}>
                  {moduleTitle || t.documentFallbackTitle}
                </Header>
                {tags.length > 0 && (
                  <SpaceBetween direction="horizontal" size="xs">
                    {tags.map((tag) => {
                      const label = tag.label?.[locale] ?? tag.label?.ko ?? "";
                      return (
                        <Badge key={label} color={TAG_COLORS[tag.category] ?? "grey"}>
                          {label}
                        </Badge>
                      );
                    })}
                  </SpaceBetween>
                )}
              </SpaceBetween>
            }
          >
            <SpaceBetween size="m">
              {usedFallbackLocale && !loading && !error && (
                <Alert type="info">{t.translationPending}</Alert>
              )}
              <Container>
                {loading ? (
                  <Box textAlign="center" padding="xxl">
                    <SpaceBetween size="s" alignItems="center">
                      <Spinner size="large" />
                      <Box variant="p">{t.loading}</Box>
                    </SpaceBetween>
                  </Box>
                ) : error ? (
                  <Alert type="warning" header={t.contentErrorHeader}>
                    {error}
                  </Alert>
                ) : (
                  <MarkdownRenderer content={bodyContent} />
                )}
              </Container>
            </SpaceBetween>
          </ContentLayout>
        }
      />

      <footer className="app-footer">
        <p className="app-footer-text">{t.footer}</p>
      </footer>
    </>
  );
}
