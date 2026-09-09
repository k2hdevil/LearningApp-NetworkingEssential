import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugify } from "../lib/slugify.js";
import { scrollToAnchor } from "../lib/scroll.js";
import CodeBlockWrapper from "./CodeBlockWrapper.jsx";
import D2Renderer from "./D2Renderer.jsx";
import "./MarkdownRenderer.css";

/**
 * 렌더된 자식에서 텍스트만 모읍니다. 헤딩 id 를 만드는 데 씁니다.
 *
 * 목차 쪽은 markdownOutline.js 의 displayText() 가 원본 마크다운에서 표기를 걷어냅니다.
 * 두 결과가 어긋나면 목차 링크만 조용히 깨지므로, 헤딩에 새로운 인라인 표기를 쓰기
 * 시작하면 양쪽을 함께 손봐야 합니다.
 */
export function extractText(children) {
  if (children === null || children === undefined || typeof children === "boolean") return "";
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children.props?.children !== undefined) return extractText(children.props.children);
  return "";
}

function heading(level) {
  const Tag = `h${level}`;
  return function Heading({ children, ...props }) {
    // `node` 는 DOM 속성이 아니므로 걸러냅니다.
    const { node: _node, ...rest } = props;
    const id = slugify(extractText(children));
    return (
      <Tag id={id || undefined} {...rest}>
        {children}
      </Tag>
    );
  };
}

function Anchor({ href, children, ...props }) {
  const { node: _node, ...rest } = props;

  if (href?.startsWith("#")) {
    return (
      <a
        href={href}
        onClick={(event) => {
          // 대상을 찾았을 때만 기본 동작을 막습니다.
          // 못 찾으면 브라우저에 넘겨서 링크가 깨진 것이 드러나게 둡니다.
          if (scrollToAnchor(href)) event.preventDefault();
        }}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

const COMPONENTS = {
  h1: heading(1),
  h2: heading(2),
  h3: heading(3),
  h4: heading(4),
  h5: heading(5),
  h6: heading(6),
  a: Anchor,

  // 코드 블록은 `pre` 에서 통째로 갈아치웁니다.
  // 이렇게 하면 안쪽 `code` 컴포넌트는 호출되지 않으므로, 아래 `code` 는 인라인 코드만 담당합니다.
  pre({ children }) {
    const child = Array.isArray(children) ? children[0] : children;
    const className = child?.props?.className ?? "";
    const match = /language-([\w+-]+)/.exec(className);
    const language = match?.[1]?.toLowerCase();
    // 마크다운 코드 블록은 항상 줄바꿈으로 끝납니다. 그대로 두면 빈 줄이 하나 더 생깁니다.
    const code = extractText(child?.props?.children).replace(/\n$/, "");

    if (language === "d2") return <D2Renderer code={code} />;
    // 언어 태그가 없는 블록은 게이트가 막지만, 렌더가 깨지지는 않게 text 로 다룹니다.
    return <CodeBlockWrapper code={code} language={language ?? "text"} />;
  },

  code({ children, ...props }) {
    const { node: _node, ...rest } = props;
    return <code {...rest}>{children}</code>;
  },

  // 표는 좁은 화면에서 가로로 스크롤되게 감쌉니다.
  // 이 과정 문서는 비교 표가 많고 열이 넓어서 감싸지 않으면 레이아웃이 밀립니다.
  table({ children, ...props }) {
    const { node: _node, ...rest } = props;
    return (
      <div className="markdown-table-scroll">
        <table {...rest}>{children}</table>
      </div>
    );
  },

  img({ node: _node, ...props }) {
    return <img loading="lazy" {...props} />;
  },
};

const PLUGINS = [remarkGfm];

export default function MarkdownRenderer({ content }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={PLUGINS} components={COMPONENTS}>
        {content ?? ""}
      </ReactMarkdown>
    </div>
  );
}
