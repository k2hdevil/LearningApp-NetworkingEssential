#!/usr/bin/env node
/**
 * src/theme.js 가 참조하는 Cloudscape 디자인 토큰이 실제로 존재하는지 확인합니다.
 *
 * 왜 필요한가: 없는 토큰 이름을 써도 앱은 그냥 돕니다. 색만 조용히 어긋나고, 특히
 * 라이트 모드에서는 멀쩡해 보이다가 다크 모드에서 흰 배경에 흰 글자가 됩니다.
 * 실제로 `colorBackgroundTableHeader` 와 `colorBackgroundCodeEditorGutterDefault` 라는
 * 그럴듯한 이름을 쓰다가 이 문제를 겪었습니다. 패키지를 올릴 때 토큰이 사라지는 경우도
 * 같은 방식으로 조용히 깨지므로 빌드에서 막습니다.
 */

import * as tokens from "@cloudscape-design/design-tokens";
import { VARIABLES } from "../src/theme.js";

const missing = [];
for (const [variable, token] of Object.entries(VARIABLES)) {
  const value = tokens[token];
  if (typeof value !== "string" || value.length === 0) {
    missing.push({ variable, token });
  }
}

if (missing.length > 0) {
  console.error("존재하지 않는 Cloudscape 디자인 토큰을 참조하고 있습니다:\n");
  for (const { variable, token } of missing) {
    console.error(`  ${variable}  ->  ${token}`);
  }
  console.error(
    "\n@cloudscape-design/design-tokens 의 index.d.ts 에서 올바른 이름을 확인하세요."
  );
  process.exit(1);
}

console.log(`디자인 토큰 ${Object.keys(VARIABLES).length}개 확인. 이상 없습니다.`);
