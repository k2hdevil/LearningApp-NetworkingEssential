import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // 청크를 기능 단위로 나눕니다. 하이라이터와 Cloudscape 가 가장 무거우므로
    // 콘텐츠(md)만 바뀌는 경우 이 청크들이 캐시에 남게 하는 것이 목적입니다.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-syntax-highlighter") || id.includes("refractor") || id.includes("prismjs")) {
            return "highlighter";
          }
          if (id.includes("react-markdown") || id.includes("remark") || id.includes("micromark") || id.includes("mdast") || id.includes("unist") || id.includes("hast")) {
            return "markdown";
          }
          if (id.includes("@cloudscape-design")) return "cloudscape";
          return "vendor";
        },
      },
    },
    chunkSizeWarningLimit: 1200,
  },
});
