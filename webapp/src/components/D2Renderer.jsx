import { useCallback, useEffect, useState } from "react";
import { useLocale } from "../contexts/LocaleContext.jsx";
import "./D2Renderer.css";

const KROKI_ENDPOINT = "https://kroki.io/d2/svg";

/**
 * 응답 SVG 가 고정 크기로 오므로 컨테이너를 채우도록 바꿉니다.
 * 이걸 안 하면 넓은 다이어그램이 잘리고 좁은 다이어그램은 작게 남습니다.
 */
function fitSvg(svg) {
  return svg.replace(/width="[^"]*"/, 'width="100%"').replace(/height="[^"]*"/, 'height="auto"');
}

/**
 * ```d2 코드 펜스를 Kroki 로 렌더합니다.
 *
 * 클릭하면 확대 오버레이가 열립니다. 네트워킹 다이어그램은 노드가 많아서
 * 본문 너비로는 글자가 작아지기 때문입니다.
 */
export default function D2Renderer({ code }) {
  const { t } = useLocale();
  const [svg, setSvg] = useState(null);
  const [error, setError] = useState(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    setSvg(null);
    setError(null);

    fetch(KROKI_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: code,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Kroki ${response.status} ${response.statusText}`);
        }
        return response.text();
      })
      .then((text) => {
        if (!cancelled) setSvg(fitSvg(text));
      })
      .catch((err) => {
        if (cancelled || err.name === "AbortError") return;
        setError(err.message);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [code]);

  const openZoom = useCallback(() => setZoomed(true), []);
  const closeZoom = useCallback(() => setZoomed(false), []);

  useEffect(() => {
    if (!zoomed) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") closeZoom();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomed, closeZoom]);

  if (error) {
    return (
      <div className="d2-diagram-error">
        <strong>
          {t.diagramErrorPrefix}: {error}
        </strong>
        <pre>{code}</pre>
      </div>
    );
  }

  if (!svg) {
    return <div className="d2-diagram-loading">{t.diagramLoading}…</div>;
  }

  return (
    <>
      <div
        className="d2-diagram-container"
        role="button"
        tabIndex={0}
        aria-label={t.diagramZoom}
        onClick={openZoom}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openZoom();
          }
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {zoomed && (
        <div
          className="d2-diagram-overlay"
          role="button"
          tabIndex={0}
          aria-label={t.diagramZoomClose}
          onClick={closeZoom}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              closeZoom();
            }
          }}
        >
          <div className="d2-diagram-modal" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      )}
    </>
  );
}
