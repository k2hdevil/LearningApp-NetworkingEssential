/**
 * 사이드 내비게이션 구조와 모듈 메타데이터.
 *
 * 이 파일은 앱과 렌더 검증 스크립트(scripts/render-check.mjs)가 함께 읽습니다.
 * 스크립트는 Node 에서 직접 import 하므로 **JSX 나 외부 의존성을 넣지 마세요.**
 *
 * 규약:
 * - `id` 는 `contentFile` 에서 `.md` 를 뺀 문자열과 같아야 합니다. 주소의 해시가 이 값입니다.
 * - `contentFile` 이 없으면 사이드 내비에 "(준비 중)" 으로 표시되고 검사 대상에서 빠집니다.
 * - `title.en` 은 교재 모듈명 그대로 씁니다. 임의로 번역하거나 줄이지 않습니다.
 */

/** 렌더 검증 기본 임계값. 모듈별 `thresholds` 가 있으면 그 값이 이깁니다. */
export const DEFAULT_THRESHOLDS = {
  headings: 3, // h2 최소 개수
  tables: 5, // 본문 표 최소 개수
  sources: 5, // 출처 인용 최소 개수
  outline: 3, // 페이지 목차 항목 최소 개수
  codeBlocks: 1, // 코드 블록 최소 개수
};

export const navigationTree = [
  {
    id: "networking-essentials",
    title: {
      ko: "Networking Essentials for Cloud Applications on AWS",
      en: "Networking Essentials for Cloud Applications on AWS",
    },
    children: [
      {
        id: "M00-Introduction_Summary",
        contentFile: "M00-Introduction_Summary.md",
        title: { ko: "모듈 0: 과정 소개", en: "Course Introduction" },
        tags: [
          { label: { ko: "과정 개요", en: "Course overview" }, category: "concept" },
          { label: { ko: "유스케이스", en: "Use case" }, category: "concept" },
        ],
        // 교재에서도 소개 슬라이드뿐이어서 출처를 인용할 주장이 없습니다.
        // 억지로 채우면 "검증한 것만 쓴다" 규칙을 어기므로 임계값을 내립니다.
        // 장이 두 개(과정 개요, ExampleCorp의 여정)뿐이라 페이지 목차 기준도 내립니다.
        thresholds: { sources: 0, outline: 2 },
      },
      {
        id: "M01-Networking_Summary",
        contentFile: "M01-Networking_Summary.md",
        title: { ko: "모듈 1: AWS 기반 네트워킹", en: "Networking on AWS" },
        tags: [
          { label: { ko: "Amazon VPC", en: "Amazon VPC" }, category: "service" },
          { label: { ko: "IP 주소 지정", en: "IP addressing" }, category: "concept" },
          { label: { ko: "VPC IPAM", en: "VPC IPAM" }, category: "service" },
          { label: { ko: "라우팅", en: "Routing" }, category: "concept" },
          { label: { ko: "NAT 게이트웨이", en: "NAT gateway" }, category: "service" },
        ],
      },
      {
        id: "M02-LoadBalancing_Summary",
        contentFile: "M02-LoadBalancing_Summary.md",
        title: {
          ko: "모듈 2: AWS에서의 로드 밸런싱 및 크기 조정",
          en: "Load Balancing and Scaling on AWS",
        },
        tags: [
          {
            label: { ko: "Elastic Load Balancing", en: "Elastic Load Balancing" },
            category: "service",
          },
          { label: { ko: "EC2 Auto Scaling", en: "EC2 Auto Scaling" }, category: "service" },
          { label: { ko: "상태 검사", en: "Health checks" }, category: "concept" },
        ],
      },
      {
        id: "M03-Interconnectivity_Summary",
        contentFile: "M03-Interconnectivity_Summary.md",
        title: {
          ko: "모듈 3: VPC 상호 연결 및 콘텐츠 전송",
          en: "VPC Interconnectivity and Content Delivery",
        },
        tags: [
          { label: { ko: "VPC 피어링", en: "VPC peering" }, category: "concept" },
          { label: { ko: "Transit Gateway", en: "Transit Gateway" }, category: "service" },
          { label: { ko: "AWS PrivateLink", en: "AWS PrivateLink" }, category: "service" },
          { label: { ko: "Amazon CloudFront", en: "Amazon CloudFront" }, category: "service" },
          {
            label: { ko: "AWS Global Accelerator", en: "AWS Global Accelerator" },
            category: "service",
          },
        ],
      },
      {
        id: "M04-Route53_Summary",
        contentFile: "M04-Route53_Summary.md",
        title: {
          ko: "모듈 4: Amazon Route 53을 통한 고가용성",
          en: "High Availability with Amazon Route 53",
        },
        tags: [
          { label: { ko: "Amazon Route 53", en: "Amazon Route 53" }, category: "service" },
          { label: { ko: "라우팅 정책", en: "Routing policies" }, category: "concept" },
          { label: { ko: "DNS", en: "DNS" }, category: "concept" },
        ],
      },
      {
        id: "M05-WrapUp_Summary",
        contentFile: "M05-WrapUp_Summary.md",
        title: { ko: "모듈 5: 과정 마무리", en: "Course Wrap-Up" },
        tags: [
          { label: { ko: "과정 회고", en: "Course review" }, category: "concept" },
          { label: { ko: "유스케이스", en: "Use case" }, category: "concept" },
        ],
        thresholds: { sources: 0 },
      },
    ],
  },
];

/** 배지 색. 카테고리를 늘리면 여기에도 추가합니다. 없는 카테고리는 회색입니다. */
export const TAG_COLORS = {
  service: "green",
  sdk: "blue",
  concept: "red",
  tool: "grey",
};

/** 트리를 평평하게 펴서 모듈 목록만 돌려줍니다. */
export function flattenModules() {
  return navigationTree.flatMap((group) => group.children ?? []);
}

/** 콘텐츠가 붙어 있는 모듈만. 렌더 검사 대상이 이것입니다. */
export function availableModules() {
  return flattenModules().filter((item) => Boolean(item.contentFile));
}

/** 아직 콘텐츠가 없는 모듈. "열 수 없는 해시" 검사에 씁니다. */
export function unavailableModules() {
  return flattenModules().filter((item) => !item.contentFile);
}

export function findModule(id) {
  return flattenModules().find((item) => item.id === id);
}

/** 딥링크가 없거나 열 수 없을 때 보여줄 모듈. */
export function firstAvailableId() {
  return availableModules()[0]?.id;
}

/** 해당 모듈을 열 수 있는지. 주소 해시 정정 판단에 씁니다. */
export function isOpenable(id) {
  return Boolean(findModule(id)?.contentFile);
}

/** 모듈별 임계값에 기본값을 덮어씌워 돌려줍니다. */
export function thresholdsFor(module) {
  return { ...DEFAULT_THRESHOLDS, ...(module?.thresholds ?? {}) };
}

export default navigationTree;
