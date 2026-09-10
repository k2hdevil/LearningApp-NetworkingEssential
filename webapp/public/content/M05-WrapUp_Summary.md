# 모듈 5: 과정 마무리

## Networking Essentials for Cloud Applications on AWS (한국어)

---

## 목차

1. [과정 목표 되짚기](#1-과정-목표-되짚기)
2. [세 실습이 만든 것](#2-세-실습이-만든-것)
3. [ExampleCorp의 결말](#3-examplecorp의-결말)
4. [학습 계속하기](#4-학습-계속하기)
5. [교재 대비 변경 사항](#5-교재-대비-변경-사항)

> **표기 설명**
>
> - 🆕 원본 강사용 덱에 없는 내용입니다. AWS 공식 문서로 확인한 항목만 넣었습니다.
> - 🔄 원본 강사용 덱의 내용이 현재와 달라 교정한 항목입니다.
> - 검증일: 2026년 9월 7일.
> - 이 모듈은 교재에서도 회고와 학습 안내가 대부분입니다. AWS Certification 준비 절차 같은 안내는 원본 링크로 넘겼습니다.

---

## 1. 과정 목표 되짚기

모듈 0에서 세운 목표를 어디서 다뤘는지 대조해 보세요.

| 과정 목표 | 어디서 배웠는가 |
|---|---|
| 설계 장단점을 고려하여 네트워킹 인프라를 **설계** | VPC CIDR 계획(M1), ALB vs NLB(M2), 피어링 vs Transit Gateway(M3), 라우팅 정책 선택(M4) |
| 가용성·탄력성·확장성을 위한 네트워킹 서비스 **구성** | 다중 AZ 서브넷·NAT 게이트웨이(M1), ELB·Auto Scaling(M2), Route 53 장애 조치(M4) |
| 변화하는 요구 사항에 따라 인프라 **구현** | 보조 CIDR 추가와 듀얼 스택 전환(M1, 실습 1), CloudFront 도입(실습 2), 다중 리전 확장(실습 3) |
| **Well-Architected Framework** 모범 사례 구현 | 다중 AZ, 다중 리전, 상태 확인, 가용성 목표 설정(M4) |

### 모듈별 한 줄 요약

| 모듈 | 한 줄 |
|---|---|
| **1. AWS 기반 네트워킹** | VPC·서브넷·라우팅 테이블·게이트웨이로 네트워크의 바닥을 만든다. CIDR 계획은 되돌릴 수 없으니 처음에 잘 세운다 |
| **2. 로드 밸런싱 및 크기 조정** | ALB 는 계층 7 콘텐츠 기반 라우팅, NLB 는 계층 4 고정 IP·저지연. Auto Scaling 그룹이 용량을 맞춘다 |
| **3. VPC 상호 연결 및 콘텐츠 전송** | 피어링은 단순·소규모, Transit Gateway 는 확장. CloudFront 는 캐싱, Global Accelerator 는 경로 가속 |
| **4. Route 53 을 통한 고가용성** | 상태 확인 + 장애 조치·지연 시간 라우팅으로 리전 장애를 넘는다 |

---

## 2. 세 실습이 만든 것

### 2.1 실습 1 — 다중 AZ VPC 아키텍처 구축

**시작**: VPC `10.1.0.0/22`, 단일 AZ 퍼블릭 서브넷의 웹 서버, IPv4 전용

**재설계 8단계**

| 단계 | 작업 |
|---|---|
| 1 | 보조 IPv4 CIDR 추가 |
| 2 | 새 서브넷 추가 + 모든 퍼블릭 서브넷이 퍼블릭 IP 를 자동 할당하도록 업데이트 |
| 3 | NAT 게이트웨이 생성 + NAT 게이트웨이를 활용하도록 라우팅 테이블 업데이트 |
| 4 | IPv6 CIDR 추가 + VPC 에 IPv6 지원 통합 |
| 5 | 송신 전용 인터넷 게이트웨이 생성 + 서브넷 라우팅 테이블에서 IPv6 라우팅 사용 |
| 6 | 듀얼 스택 모드를 지원하도록 Amazon Aurora 데이터베이스 업데이트 |
| 7 | Application Load Balancer 생성 + Auto Scaling 대상 그룹과 연결 |
| 8 | Auto Scaling 그룹을 퍼블릭 서브넷에서 새 웹 서버 **프라이빗** 서브넷으로 마이그레이션한 뒤 애플리케이션이 여전히 작동하는지 확인 |

**완성**

```text
VPC  10.1.0.0/22 + 10.1.4.0/22 + IPv6
|
+-- AZ A
|    +-- Public subnet    ALB, NAT gateway, bastion host
|    +-- Private subnet   Web servers (Auto Scaling group)
|    +-- Private subnet   Aurora
|
+-- AZ B
     +-- Public subnet    ALB, NAT gateway
     +-- Private subnet   Web servers (Auto Scaling group)
     +-- Private subnet   Aurora

Internet gateway + egress-only internet gateway
```

**8단계 순서에 담긴 논리**를 짚어 두면 좋습니다. 주소를 먼저 확보하고(1\~2),
아웃바운드 경로를 만들고(3), IPv6 를 얹고(4\~6), 그 다음에 로드 밸런서를 세우고(7),
마지막에 워크로드를 옮깁니다(8). **네트워크를 먼저 완성한 뒤 워크로드를 이동**하는
순서입니다.

### 2.2 실습 2 — Amazon CloudFront를 사용하여 성능 가속화

**수행 단계**

1. CloudFront 배포를 생성합니다
2. CloudFront 캐싱 성능을 탐색합니다
3. **CloudFront 오리진을 보호합니다**

```text
[시작]
  Users  ------------------------------------>  ALB  -->  Web servers

[완성]
  Users  -->  Edge location  -->  Regional edge cache  -->  ALB
                                                             |
                                                             v
                                                        Web servers
```

3단계가 왜 필요한지 다시 확인하세요. CloudFront 를 붙여도 **오리진이 인터넷에서
직접 접근 가능하면 우회가 됩니다.**

### 2.3 실습 3 — 내결함성 및 글로벌 트래픽 최적화 달성

**수행 단계**

1. Route 53 호스팅 영역을 추가합니다 (`example.com`)
2. **단순 라우팅 정책**을 구성합니다
3. 단순 라우팅 정책에 대한 DNS 확인 테스트를 수행합니다
4. **고급 라우팅 정책**을 구성합니다 (장애 조치 및 지연 시간)
5. 고급 라우팅 정책에 대한 DNS 확인 테스트를 수행합니다

```text
Users  -->  Amazon Route 53
                |
        +-->  Region A : VPC / ALB / Auto Scaling group / Aurora
        +-->  Region B : VPC / ALB / Auto Scaling group / Aurora

각 리전에 상태 확인을 붙입니다
```

**단순 → 고급 순서**도 의도적입니다. 먼저 DNS 가 제대로 확인되는 기준선을 만들고,
그 위에 장애 조치와 지연 시간 라우팅을 얹습니다. 문제가 생기면 어디가 원인인지
가려낼 수 있습니다.

---

## 3. ExampleCorp의 결말

### 3.1 문제 목록 최종 점검

| # | 문제 | 해결한 방법 |
|---|---|---|
| 1 | 부적절한 CIDR 범위로 VPC 를 배포함 | 보조 IPv4 CIDR 추가 (실습 1) |
| 2 | 단일 가용 영역에만 VPC 서브넷을 배포함 | 다중 AZ 서브넷 배치 (실습 1) |
| 3 | IPv4 전용이며 듀얼 스택을 지원해야 함 | IPv6 CIDR + 송신 전용 인터넷 게이트웨이 + Aurora 듀얼 스택 (실습 1) |
| 4 | 애플리케이션의 확장성 및 복원력 부족 | ALB + Auto Scaling 그룹, 웹 서버를 프라이빗 서브넷으로 (실습 1) |
| 5 | 애플리케이션 지연 시간 단축 필요 | Amazon CloudFront (실습 2) |
| 6 | 확장 가능한 관리형 DNS 서비스 필요 | Amazon Route 53 호스팅 영역 (실습 3) |
| 7 | 고가용성·내결함성 장애 조치 전략 필요 | 상태 확인 + 장애 조치·지연 시간 라우팅 정책 (실습 3) |

### 3.2 결과

Terry 는 ExampleCorp 의 웹 애플리케이션 배포를 **확장 가능하고 내결함성 있는
아키텍처**로 전환했습니다.

| 성질 | 근거 |
|---|---|
| **확장 가능** | Auto Scaling 그룹이 수요에 따라 용량을 조절합니다 |
| **고가용성** | 다중 AZ 와 다중 리전, 상태 확인 기반 장애 조치 |
| **고성능** | CloudFront 엣지 캐싱과 지연 시간 기반 라우팅 |

과도한 트래픽을 처리하고, 리소스 크기를 자동으로 조절하며, 장애 발생 시 트래픽을
정상 리전으로 원활하게 리디렉션할 수 있게 되었습니다.

### 3.3 Terry 가 아직 안 쓴 것

이 과정에서 **배웠지만 ExampleCorp 가 도입하지 않은** 서비스들입니다. 첫 해 예산이
제한되어 있었기 때문입니다. 나중에 필요해질 순간을 알아 두는 것이 이 과정의 목적
중 하나입니다.

| 서비스 | 언제 필요해지는가 |
|---|---|
| **VPC 피어링** | 부서별·환경별 VPC 를 분리하고 서로 연결해야 할 때 |
| **AWS Transit Gateway** | VPC 가 많아져 풀 메시 관리가 불가능해질 때, 온프레미스를 붙일 때 |
| **VPC 엔드포인트 / AWS PrivateLink** | 프라이빗 서브넷에서 AWS 서비스에 인터넷 없이 접근해야 할 때, 내 서비스를 다른 계정에 프라이빗하게 노출할 때 |
| **AWS Global Accelerator** | TCP·UDP 애플리케이션의 경로 자체를 가속해야 할 때, 글로벌 고정 IP 가 필요할 때 |
| **Amazon VPC IPAM** | 계정과 VPC 가 늘어나 IP 주소 관리가 수작업으로 불가능해질 때 |

교재에는 없지만 각 모듈 노트에 추가한 서비스들도 같은 성격입니다. 언제 필요해지는지만
알아 두세요.

| 서비스 | 언제 필요해지는가 | 노트 위치 |
|---|---|---|
| **Amazon VPC Route Server** | EC2 로 운영하는 네트워크 어플라이언스에 BGP 동적 라우팅과 라우팅 내결함성이 필요할 때 | 모듈 1 §7.4 |
| **AWS Network Firewall** | 보안 그룹·네트워크 ACL 로 표현할 수 없는 도메인 필터링이나 심층 패킷 검사가 필요할 때 | 모듈 1 §9.5 |
| **Amazon VPC Lattice** | CIDR 이 겹치거나, VPC 연결이 아니라 서비스 대 서비스 연결과 인증이 필요할 때 | 모듈 3 §5 |
| **리전 간 인터페이스 엔드포인트** | 다른 리전의 AWS 서비스에 프라이빗하게 접근해야 할 때 | 모듈 3 §4.6 |
| **CloudFront VPC 오리진** | 오리진을 인터넷에서 완전히 닫아야 할 때 | 모듈 3 §7.12 |
| **CloudFront 애니캐스트 고정 IP** | HTTP 워크로드에 허용 목록용 고정 IP 나 정점 도메인 A 레코드가 필요할 때 | 모듈 3 §7.13 |
| **CloudFront 멀티테넌트 배포** | SaaS 처럼 도메인이 많아 배포 설정을 재사용해야 할 때 | 모듈 3 §7.14 |
| **Amazon Route 53 Profiles** | VPC 가 많아져 프라이빗 호스팅 영역·Resolver 규칙 연결을 손으로 못 할 때 | 모듈 4 §6.5 |

---

## 4. 학습 계속하기

### 4.1 다음 단계

| 리소스 | 내용 |
|---|---|
| [AWS Skill Builder](https://aws.amazon.com/training/digital) | 온디맨드 디지털 과정과 학습 플랜, 자습형 실습(SPL), 게임형 학습(AWS Cloud Quest), 연습 시험 |
| [강의실 교육](https://aws.amazon.com/training) | 공인 AWS 강사에게 배우는 과정 |
| [AWS Certification](https://aws.amazon.com/certification) | 업계에서 인정받는 자격증 |
| [AWS Workshops](https://workshops.aws) | 실습 중심 워크숍 |
| [AWS Ramp-Up Guides](https://aws.amazon.com/training/ramp-up-guides) | 역할·주제별 학습 경로 |

### 4.2 이 과정과 연결되는 자격증

| 레벨 | 성격 | 권장 경력 (교재 기준) |
|---|---|---|
| **Foundational** | 지식 기반. 이전 경력 불필요 | 기본 AWS 클라우드 경험 6개월 |
| **Associate** | 역할 기반. 지식과 기술 검증 | AWS 클라우드로 문제 해결·솔루션 구현 1년 |
| **Professional** | 역할 기반. 고급 기술과 지식 검증 | 설계·운영·문제 해결 2년 |
| **Specialty** | 특정 주제 집중 | 시험 가이드에 지정된 분야의 기술 경력 |

이 과정의 내용은 네트워킹 영역과 겹칩니다. 자격증 시험은 자주 업데이트되므로
제공 시험과 출제 범위는 [AWS Certification 페이지](https://aws.amazon.com/certification)에서
확인하세요. 자격증은 **3년마다 갱신(재인증)** 이 필요합니다.

### 4.3 이 자료를 다시 볼 때

교재를 나중에 다시 읽을 때 각 모듈 문서의 **`교재 대비 변경 사항`** 장부터 보세요.
그 장이 "교재 이후 무엇이 바뀌었나"의 목록입니다. 이번 과정에서 확인된 주요 항목입니다.

| 모듈 | 주요 교정 | 교재에 없어 추가한 것 |
|---|---|---|
| 1 | RFC 1918 `172.16.0.0/12` 범위 오기, EIP 무료 조건 폐지, "IPv6 에는 프라이빗 주소 범위가 없다" 오기 | 리전 NAT 게이트웨이, VPC Block Public Access, VPC Route Server, Network Firewall, 프라이빗 IPv6(ULA) |
| 2 | EC2-Classic 지원 종료, 시작 구성 신규 생성 차단, ALB 교차 영역은 로드 밸런서 수준에서 항상 켜짐 | 영역 이동, ALB 기능 목록 |
| 3 | VPC 피어링 MTU (리전 간 8500) | CloudFront Functions, VPC 오리진, 애니캐스트 고정 IP, 멀티테넌트 배포, VPC Lattice, 리전 간 인터페이스 엔드포인트, Global Accelerator 듀얼 스택 |
| 4 | Application Recovery Controller 서비스명 변경 (Route 53 이 이름에서 빠짐) | Route 53 Profiles, 가용성 계산 방법 |

### 4.4 교재에 없는 항목의 출시 시점

각 서비스의 문서 이력(document history)에서 확인한 날짜입니다. **교재 콘텐츠 시점은
2024년 초로 추정**됩니다(강사 노트가 언급한 가장 최신 날짜가 2024년 2월 1일).

**교재보다 뒤에 나온 것** — "교재가 낡았다"에 해당합니다.

| 출시 | 항목 | 모듈 |
|---|---|---|
| 2025-11-19 | 리전 NAT 게이트웨이 | 1 §8.3 |
| 2025-04-28 | CloudFront 멀티테넌트 배포 | 3 §7.14 |
| 2025-03-31 | Amazon VPC Route Server | 1 §7.4 |
| 2024-11-26 | PrivateLink 리전 간 액세스 | 3 §4.6 |
| 2024-11-20 | CloudFront VPC 오리진 | 3 §7.12 |
| 2024-11-20 | CloudFront 애니캐스트 고정 IP 목록 | 3 §7.13 |
| 2024-11-19 | VPC Block Public Access | 1 §9.4 |
| 2024-09-10 | NAT 게이트웨이 MTU 8500 | 1 §8.2 |
| 2024-04-22 | Amazon Route 53 Profiles | 4 §6.5 |

**교재보다 먼저 나왔는데 교재가 다루지 않은 것** — "교재가 범위를 좁게 잡았다"에
해당합니다. 시험이나 실무에서 만나면 "새 기능"이 아니라는 점을 알아 두세요.

| 출시 | 항목 | 왜 없나 | 모듈 |
|---|---|---|---|
| 2023-11-21 | CloudFront KeyValueStore | 교재가 Lambda@Edge 만 다룸 | 3 §8.2 |
| 2023-03-31 | Amazon VPC Lattice (GA) | 교재가 계층 3 연결만 다룸. 덱 작성 시기와 겹칩니다 | 3 §5 |
| 2022-07-27 | Global Accelerator 듀얼 스택 액셀러레이터 | 교재가 IPv4 구성만 소개 | 3 §9.3 |
| 2021-05-03 | CloudFront Functions | 교재가 Lambda@Edge 만 다룸 | 3 §8.2 |
| 2020-11-16 | AWS Network Firewall | **과정이 네트워크 보안을 범위 밖으로 둠** | 1 §9.5 |

두 표를 나눈 이유가 있습니다. 아래 표의 다섯 항목은 **교재를 갱신해도 들어오지 않습니다.**
과정 설계상 다루지 않기로 한 것들이기 때문입니다. 반면 위 표의 항목들은 교재가 개정되면
들어올 가능성이 있습니다.

---

## 5. 교재 대비 변경 사항

### 5.1 교재 기술이 사실과 다른 항목

이 모듈에서 사실 오류로 확인된 항목은 없습니다. 대부분이 회고와 학습 안내입니다.

### 5.2 동작·기본값이 변경된 항목

해당 없습니다. 다만 모듈 4의 강사 노트에서 언급된
**Amazon Application Recovery Controller** 의 서비스명 변경은 모듈 4 문서의
`교재 대비 변경 사항` 장에 정리되어 있습니다.

### 5.3 비권장·지원 종료된 항목

해당 없습니다.

### 5.4 교재에 없는 항목

이 모듈 자체에 새로 추가한 사실은 없습니다. 3.3 절("Terry 가 아직 안 쓴 것")과
4.4 절(출시 시점)은 다른 모듈에 흩어진 항목을 **모아 놓은 표**입니다. 각 항목의 근거는
해당 모듈 문서의 `교재 대비 변경 사항` 장에 있습니다.

4.4 절의 날짜는 각 서비스 문서 이력에서 확인했습니다. 근거 페이지는 이렇습니다.

| 서비스 | 문서 이력 |
|---|---|
| Amazon VPC | [Document history](https://docs.aws.amazon.com/vpc/latest/userguide/WhatsNew.html) |
| Amazon CloudFront | [Document history](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/WhatsNew.html) |
| AWS PrivateLink | [Document history](https://docs.aws.amazon.com/vpc/latest/privatelink/doc-history.html) |
| Amazon Route 53 | [Document history](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/History.html) |
| AWS Global Accelerator | [Document history](https://docs.aws.amazon.com/global-accelerator/latest/dg/WhatsNew.html) |
| Amazon VPC Lattice | [Document history](https://docs.aws.amazon.com/vpc-lattice/latest/ug/doc-history.html) |
| AWS Network Firewall | [Document history](https://docs.aws.amazon.com/network-firewall/latest/developerguide/document-history.html) |

### 5.5 검증하지 못한 항목

| 항목 | 상태 |
|---|---|
| 실습 3 의 리전 | 이 모듈 슬라이드 6 은 "리전 A(미국)"와 "리전 B(영국)"로 표기하는데, **모듈 4 의 다이어그램은 `us-east-1` 과 `ap-northeast-1`(도쿄)로 표기합니다.** 덱 간 불일치이므로 이 문서에서는 "리전 A / 리전 B" 로만 적었습니다 |
| 자격증 레벨별 권장 경력 | 교재 기술을 그대로 옮겼습니다. 현재 값은 AWS Certification 페이지에서 확인하세요 |
| Skill Builder 과정 수 | 교재는 "600여 개 디지털 과정"이라고 적었습니다. 계속 늘어나는 수치라 본문에 넣지 않았습니다 |

교재 슬라이드 4 의 강사 노트에 실습 1 재설계 8단계가 정리되어 있는데, **모듈 2 슬라이드
36 의 강사 노트와 내용이 동일합니다.** 같은 내용을 두 모듈에서 반복하는 구성입니다.
