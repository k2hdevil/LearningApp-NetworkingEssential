# Networking Essentials for Cloud Applications on AWS — 정리 자료

AWS 교육 과정 **Networking Essentials for Cloud Applications on AWS** (1일, Intermediate)의
수강생용 한국어 정리 노트를 담은 웹 애플리케이션입니다.

> **이 자료는 AWS T&C 공식 교육 자료가 아닙니다.** 강사가 🤖 Kiro로 빌드한 보조 자료이며,
> 원본 강사용 덱을 AWS 공식 문서로 검증·최신화한 결과입니다. 일부 오류가 있을 수 있으므로
> 시험·실무 적용 전에는 본문의 출처 링크를 확인하세요.

## 구성

| 모듈 | 주제 |
|---|---|
| M00 | 과정 소개 |
| M01 | AWS 기반 네트워킹 |
| M02 | AWS에서의 로드 밸런싱 및 크기 조정 |
| M03 | VPC 상호 연결 및 콘텐츠 전송 |
| M04 | Amazon Route 53을 통한 고가용성 |
| M05 | 과정 마무리 |

콘텐츠는 `webapp/public/content/*.md` 에 있고 런타임에 fetch 합니다.
빌드를 다시 하지 않아도 마크다운만 고쳐 배포할 수 있습니다.

## 기술 구성

- Vite + React 19
- [Cloudscape Design System](https://cloudscape.design/)
- `react-markdown` + `remark-gfm`, `react-syntax-highlighter`
- 한국어·영어 로케일과 다크 모드 지원

## 로컬 실행

```bash
cd webapp
npm install
npm run dev
```

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 디자인 토큰 검사 후 `dist/` 생성 |
| `npm run check:tokens` | Cloudscape 디자인 토큰 이름 검증 |

## 배포

AWS Amplify Hosting 을 씁니다. 빌드 스펙은 저장소 루트의 `amplify.yml` 입니다.
앱이 `webapp/` 아래에 있으므로 `npm --prefix webapp` 로 빌드하고 산출물은
`webapp/dist` 입니다.

내비게이션은 **해시 기반**(`/#M01-Networking_Summary`)이므로 경로 기반 SPA 리다이렉트
규칙은 필요하지 않습니다.

## 저장소에 포함하지 않는 것

이 저장소는 **배포에 필요한 파일만** 담습니다. `.gitignore` 가 화이트리스트 방식으로
동작합니다. 원본 강사용 덱과 그 추출물은 AWS 소유 자료이므로 포함하지 않습니다.
