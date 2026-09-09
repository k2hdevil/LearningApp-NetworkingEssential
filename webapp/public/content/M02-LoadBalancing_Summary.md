# 모듈 2: AWS에서의 로드 밸런싱 및 크기 조정

## Networking Essentials for Cloud Applications on AWS (한국어)

---

## 목차

1. [이 모듈에서 배우는 것](#1-이-모듈에서-배우는-것)
2. [Elastic Load Balancing 개요](#2-elastic-load-balancing-개요)
3. [로드 밸런서의 네 가지 구성 요소](#3-로드-밸런서의-네-가지-구성-요소)
4. [로드 밸런서 유형 고르기](#4-로드-밸런서-유형-고르기)
5. [Network Load Balancer](#5-network-load-balancer)
6. [Application Load Balancer](#6-application-load-balancer)
7. [교차 영역 로드 밸런싱](#7-교차-영역-로드-밸런싱)
8. [Amazon EC2 Auto Scaling](#8-amazon-ec2-auto-scaling)
9. [실습 1: 다중 AZ VPC 아키텍처 구축](#9-실습-1-다중-az-vpc-아키텍처-구축)
10. [한눈에 정리](#10-한눈에-정리)
11. [교재 대비 변경 사항](#11-교재-대비-변경-사항)

> **표기 설명**
>
> - 🆕 원본 강사용 덱에 없는 내용입니다. AWS 공식 문서로 확인한 항목만 넣었습니다.
> - 🔄 원본 강사용 덱의 내용이 현재와 달라 교정한 항목입니다. 교재에 어떻게 적혀 있는지도 11장에 함께 적어 두었습니다.
> - 검증일: 2026년 9월 7일. 수치와 쿼터는 바뀔 수 있으니 중요한 결정을 내릴 때는 링크된 문서를 다시 확인하세요.
> - 교재의 `지식 확인` 문제는 옮기지 않았습니다. 실습 절차도 실습 가이드가 담당하므로 이 문서에는 실습이 무엇을 만드는지만 적었습니다.

---

## 1. 이 모듈에서 배우는 것

모듈 1에서 만든 VPC 위에 **트래픽을 분산하고 용량을 자동으로 늘리는 층**을 올립니다.

| 주제 | 핵심 질문 |
|---|---|
| Elastic Load Balancing | 여러 대상에 트래픽을 어떻게 나누는가 |
| 로드 밸런서 유형 | ALB 와 NLB 는 무엇이 다르고 언제 무엇을 쓰는가 |
| 교차 영역 로드 밸런싱 | 켜면 트래픽 분배가 어떻게 달라지는가 |
| Auto Scaling 그룹 | 수요에 맞춰 인스턴스 수를 어떻게 조절하는가 |

### ExampleCorp 의 현재 상황

모듈 1에서 CIDR·다중 AZ·듀얼 스택 문제는 해결했습니다. 이 모듈이 다루는 것은
**애플리케이션 확장성과 복원력 부족**입니다.

애플리케이션이 프로덕션 등급이 되면서 고가용성이 요구되었고, 고위 경영진이 이번 달 말에
복원력 시연을 요청했습니다. Terry 는 Elastic Load Balancing 과 Auto Scaling 을 검토합니다.

---

## 2. Elastic Load Balancing 개요

### 2.1 로드 밸런서가 하는 일

로드 밸런서는 **사용자와 서버 그룹 사이에 있는 보이지 않는 조력자**입니다. 모든 리소스
서버가 균등하게 쓰이도록 트래픽을 나눕니다.

| 기능 | 내용 |
|---|---|
| 트래픽 분산 | 들어오는 애플리케이션·네트워크 트래픽을 여러 대상에 나눕니다 |
| 다중 AZ | **2개 이상의 가용 영역**에 배포합니다 |
| 자동 크기 조정 | 수신 트래픽에 따라 로드 밸런싱 용량이 자동으로 늘어납니다 |
| 상태 확인 | 비정상 대상을 감지해 트래픽을 끊고, 정상 대상으로만 보냅니다 |
| 비용 관리 | 필요한 만큼만 용량을 씁니다 |

### 2.2 서브넷 요구 사항 — 실습에서 자주 걸리는 부분

로드 밸런서를 만들 때 **가용 영역 서브넷을 최소 2개** 선택해야 하고, 각 서브넷은
**서로 다른 AZ** 에 속해야 합니다. 여기에 조건이 하나 더 붙습니다.

> 각 AZ 서브넷에 **`/27` 이상의 CIDR 블록**과 **서브넷당 최소 8개의 사용 가능한 IP
> 주소**가 있어야 합니다.

**왜 8개인가.** 문서가 이유를 밝혀 두었습니다. 순서대로 보면 이렇습니다.

```text
1. 영역을 활성화한다        →  ELB 가 그 영역마다 로드 밸런서 노드를 만든다
2. 노드가 놓인다            →  ELB 가 그 서브넷에 네트워크 인터페이스를 만든다
3. 인터페이스가 생긴다      →  서브넷의 IP 를 하나 쓴다
4. 트래픽이 늘어난다        →  로드 밸런서가 확장(scale out)한다 = IP 가 더 필요하다
5. 여유 IP 가 없다          →  확장이 막히고, 노드 교체 시도가 어려워진다
```

그래서 AWS 는 **확장 여유분으로 서브넷당 여유 IP 8개**를 요구합니다. 로드 밸런서는 이
주소로 **대상과 연결을 설정**합니다. 여유가 없으면 ALB 가 **실패 상태(failed state)** 로
들어갈 수 있습니다.

**8 이라는 숫자를 어떻게 계산했는지는 문서가 설명하지 않습니다.** "확장에 필요한 여유분"
이라고만 밝혀 두었으니, 노드 수로 나눠 추측하지 마세요.

`/27` 조건과 함께 보면 크기 감각이 잡힙니다. `/27` 은 주소 32개이고, 모듈 1 4.2 절에서 본
대로 AWS 가 서브넷마다 5개를 예약하므로 **실제로 쓸 수 있는 것은 27개**입니다. 그중 8개를
로드 밸런서 확장용으로 남겨 두어야 합니다.

**확장 중에 IP 가 소진되면** ALB 는 용량 부족 상태로 실행됩니다. 기존 노드는 계속 트래픽을
처리하지만, 멈춘 확장 시도 때문에 연결을 설정할 때 **5xx 오류나 시간 초과**가 발생할 수
있습니다.

🆕 한편 Elastic Load Balancing 은 서브넷에 만든 네트워크 인터페이스 중 일부를 **서브넷의 IP 가
부족해도 유지 관리 작업을 완료할 수 있도록 예약**해 둡니다. 콘솔에서
`ENI reserved by ELB for subnet` 이라는 설명으로 보입니다. 여유 IP 8개와는 별개 장치입니다.

> — 출처: [Application Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html)

### 2.3 공통 특징

| 특징 | 내용 |
|---|---|
| 프로토콜 | 유형에 따라 HTTP, HTTPS, TCP, UDP, TLS |
| 배치 | **내부(internal)** 또는 **외부 대면(internet-facing)** |
| DNS 이름 | 기본 이름은 `name-id.elb.region.amazonaws.com` 형식입니다. 사용자 지정 도메인 이름을 만들어 여기에 연결하는 것이 좋습니다 |
| 듀얼 스택 | ALB·NLB 를 듀얼 스택 IP 주소 유형으로 구성하면 DNS 이름이 IPv4·IPv6 주소를 모두 제공하고 **A 레코드와 AAAA 레코드**를 생성합니다 |
| 보안 그룹 | ALB 는 최소 1개가 필요하고, 없으면 **VPC 의 기본 보안 그룹**이 적용됩니다 |
| 모니터링 | Amazon CloudWatch 지표 연동, 요청 추적 |

보안 그룹을 설정할 때 흔히 놓치는 것: 로드 밸런서의 보안 그룹은 **리스너 포트와 상태
확인 포트 모두**에서 등록된 대상과 통신할 수 있어야 합니다.

### 2.4 DNS 와 TTL 🆕

로드 밸런서의 DNS 항목은 **TTL 60초**를 지정합니다. 트래픽 변화에 따라 IP 주소를 빠르게
재매핑할 수 있게 하려는 설계입니다. 클라이언트가 TTL 을 무시하고 오래된 IP 를 계속 쓰면
문제가 생길 수 있다는 점을 기억하세요.

> — 출처: [How Elastic Load Balancing works](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html)

---

## 3. 로드 밸런서의 네 가지 구성 요소

모든 유형이 공유하는 개념입니다. 순서대로 따라가면 요청의 여정이 됩니다.

```text
클라이언트 → [리스너] → [규칙] → [대상 그룹] → 대상
                                    ↑
                                [상태 확인]
```

### 3.1 리스너

구성한 **포트와 프로토콜**로 연결 요청을 확인하는 프로세스입니다.

| 리스너 유형 | 예 |
|---|---|
| TCP | `TCP:80` |
| UDP | `UDP:90` |
| HTTP | `HTTP:80` |
| HTTPS | `HTTPS:443` |
| TLS | `TLS:443` |

리스너의 기능은 **로드 밸런서 유형에 따라 다릅니다.**

### 3.2 규칙

리스너에 정의한 규칙이 요청을 어느 대상 그룹으로 보낼지 결정합니다.

- 각 규칙은 **우선순위 + 하나 이상의 작업 + 하나 이상의 조건**으로 구성됩니다
- 규칙은 **우선순위가 낮은 값부터** 평가됩니다
- **NLB 의 기본 작업**은 지정된 대상 그룹으로 보내는 **전달(forward)** 하나뿐입니다.
  NLB 에는 ALB 같은 추가 규칙이 없습니다

TLS 리스너를 쓰면 암호화·복호화를 로드 밸런서에 오프로드할 수 있습니다.
리스너 프로토콜이 TLS 면 **정확히 하나의 SSL 서버 인증서**를 배포해야 합니다.
프로토콜을 TLS 에서 TCP 나 UDP 로 바꾸면 **보안 정책과 서버 인증서가 제거됩니다.**

### 3.3 대상 그룹

대상은 반드시 대상 그룹에 **등록**되어야 합니다.

| 로드 밸런서 | 등록할 수 있는 대상 |
|---|---|
| **ALB** | EC2 인스턴스, **AWS Lambda 함수**, 컨테이너, IP 주소 |
| **NLB** | EC2 인스턴스, 컨테이너, IP 주소, **Application Load Balancer** |

NLB 가 ALB 를 대상으로 삼을 수 있다는 점이 중요합니다. ALB 로 만든 애플리케이션에
**고정 IP 주소와 AWS PrivateLink** 를 붙일 수 있게 됩니다.

### 3.4 상태 확인

유형은 **TCP 와 HTTP/S** 입니다. 로드 밸런서는 지정한 포트·프로토콜·핑 경로로 몇 초마다
요청을 보내고 응답 시간 제한 안에 응답을 기다립니다.

- **연속 실패 임계값**을 넘으면 대상을 서비스에서 제외합니다
- **연속 성공 임계값**을 넘으면 다시 서비스에 넣습니다
- 상태 확인 포트는 기본적으로 대상 그룹의 트래픽 포트와 같고, 다른 포트로 재정의할 수
  있습니다

등록된 대상의 상태 값은 여섯 가지입니다.

| 상태 | 의미 |
|---|---|
| **초기**(initial) | 대상을 등록하는 중이거나 초기 상태 확인을 수행하는 중 |
| **정상**(healthy) | 정상 |
| **비정상**(unhealthy) | 상태 확인에 응답하지 않았거나 실패 |
| **드레이닝**(draining) | 등록 취소 중이고 Connection Draining 이 진행 중 |
| **미사용**(unused) | 대상 그룹에 등록되지 않았거나, 대상 그룹이 리스너 규칙에 쓰이지 않거나, 로드 밸런서가 쓰지 않는 AZ 에 있음 |
| **사용 불가**(unavailable) | 대상 그룹의 상태 확인이 중지됨 |

**주의할 동작**: 어떤 AZ 의 대상 그룹에 정상 대상이 하나도 없으면 **그 서브넷의 IP 주소가
DNS 에서 제거됩니다.** 다른 AZ 의 노드는 계속 쓸 수 있지만, 클라이언트가 TTL 을
준수하지 않고 제거된 IP 로 요청을 보내면 그 요청은 실패합니다. 그래서 **각 대상 그룹의
각 AZ 에 최소 하나의 대상**을 두는 것이 중요합니다.

---

## 4. 로드 밸런서 유형 고르기

Elastic Load Balancing 은 네 가지 유형을 지원합니다. 이 과정은 ALB 와 NLB 를 중심으로
다룹니다.

| 유형 | 계층 | 언제 쓰는가 | 이 과정에서 |
|---|---|---|---|
| **Application Load Balancer (ALB)** | 계층 7 (애플리케이션) | HTTP·HTTPS 요청 로드 밸런싱 | 상세히 다룸 |
| **Network Load Balancer (NLB)** | 계층 4 (전송) | TCP·UDP, 최고 성능, 짧은 지연 시간 | 상세히 다룸 |
| **Gateway Load Balancer (GWLB)** | 계층 3 | 서드 파티 가상 어플라이언스 배포·확장·관리 | 범위 밖 |

### 4.1 ALB 와 NLB 한 줄 비교

| ALB | NLB |
|---|---|
| HTTP 및 HTTPS | TCP 및 UDP |
| 유연한 애플리케이션 관리 | 짧은 지연 시간 |
| 콘텐츠 기반 라우팅 | 고정 IP |
| 애플리케이션 계층(계층 7) | 전송 계층(계층 4) |

### 4.2 기능 지원 비교

| 기능 | ALB | NLB |
|---|---|---|
| 상태 확인 | 예 | 예 |
| CloudWatch 지표 | 예 | 예 |
| 로깅 | 예 | 예 |
| SSL/TLS 오프로드 | 예 | 예 |
| Connection Draining | 예 | 예 |
| 소스 IP 주소 유지 | 예 — `X-Forwarded-For` 헤더로 (아래) | 예 — 패킷 그대로 (아래) |
| 고정 IP 주소 | 아니요 | **예** |
| 대상으로서의 Lambda 함수 | **예** | 아니요 |
| 리디렉션 | **예** | 아니요 |
| 고정 응답 작업 | **예** | 아니요 |

**소스 IP 주소 유지 — 둘이 방식이 다릅니다**

표에 둘 다 "예"로 적혀 있지만 **같은 방식이 아닙니다.** 백엔드가 클라이언트 IP 를 어떻게
알게 되는지가 다릅니다.

```text
[ NLB ]  패킷의 소스 IP 를 그대로 둡니다

  클라이언트 203.0.113.9  ──→  NLB  ──→  대상
                                         소스 IP = 203.0.113.9   (그대로)

[ ALB ]  연결을 대신 맺고, 클라이언트 IP 는 헤더에 적어 보냅니다

  클라이언트 203.0.113.9  ──→  ALB  ──→  대상
                                         소스 IP = ALB 의 IP
                                         X-Forwarded-For: 203.0.113.9
```

**NLB — 패킷 수준에서 보존합니다.** 대상 그룹 속성 `preserve_client_ip.enabled` 로
켜고 끕니다. **기본값이 조건에 따라 다릅니다.**

| 대상 그룹 | 기본값 |
|---|---|
| 대상 유형이 **IP 주소**이고 프로토콜이 **TCP 또는 TLS** | **꺼짐** |
| 그 밖의 조합 (대상 유형 인스턴스 등) | **켜짐** |
| **UDP, TCP_UDP, QUIC, TCP_QUIC** 대상 그룹 | 켜짐이며 **끌 수 없습니다** |

즉 "NLB 는 소스 IP 를 보존한다"는 말은 대체로 맞지만, **IP 주소를 대상으로 하는 TCP·TLS
대상 그룹에서는 기본이 꺼짐**입니다. 이 조합을 쓸 때 백엔드 로그에 클라이언트 IP 가 안
보이면 이 속성을 확인하세요.

**ALB — 헤더로 전달합니다.** ALB 는 계층 7 에서 클라이언트와 연결을 종료하고 대상에 새
연결을 맺습니다. 그래서 **대상이 보는 소스 IP 는 ALB 의 IP** 이고, 서버 액세스 로그에도
ALB 의 IP 만 남습니다. 클라이언트 IP 는 **`X-Forwarded-For` 요청 헤더**로 옵니다.

동작은 `routing.http.xff_header_processing.mode` 속성으로 정합니다.

**세 모드가 다루는 대상은 "들어온 요청에 이미 붙어 있는 `X-Forwarded-For` 헤더"** 입니다.
클라이언트가 직접 넣었거나, 앞단의 CDN·프록시가 넣어 보낸 헤더입니다. ALB 는 그 헤더를
**덧붙이거나 · 그대로 두거나 · 지우고** 대상에 넘깁니다.

| 값 | 들어온 헤더를 어떻게 하는가 |
|---|---|
| `append` (**기본값**) | 헤더가 없으면 만들고, 있으면 **클라이언트 IP 를 뒤에 덧붙입니다** |
| `preserve` | **손대지 않습니다.** 받은 그대로 대상에 넘깁니다 |
| `remove` | 대상에 보내기 전에 **헤더를 지웁니다** |

AWS 문서의 예시입니다. 마지막 홉(ALB 가 보는 클라이언트)의 IP 가 `127.0.0.1` 인 경우
대상이 실제로 받는 헤더입니다.

| 들어온 요청 | `append` | `preserve` | `remove` |
|---|---|---|---|
| XFF 헤더 없음 | `127.0.0.1` | **없음** | 없음 |
| `XFF: 127.0.0.4` | `127.0.0.4, 127.0.0.1` | `127.0.0.4` | 없음 |
| `XFF: 127.0.0.4, 127.0.0.8` | `127.0.0.4, 127.0.0.8, 127.0.0.1` | `127.0.0.4, 127.0.0.8` | 없음 |

**첫 행을 눈여겨보세요.** `preserve` 는 "클라이언트 IP 를 보존한다"는 뜻이 아닙니다.
**들어온 헤더를 보존**한다는 뜻이고, 들어온 헤더가 없으면 대상은 **클라이언트 IP 를 아예
받지 못합니다.** ALB 가 자기가 본 IP 를 넣어 주는 것은 `append` 뿐입니다.

그래서 앞단에 CDN 이나 프록시가 있고 그쪽이 이미 정확한 XFF 를 채워 준다면 `preserve` 가
맞고, ALB 가 직접 클라이언트를 마주하는 구성이라면 기본값 `append` 를 그대로 두어야 합니다.

🆕 클라이언트 **포트**까지 필요하면 `routing.http.xff_client_port.enabled` 를 켭니다.
XFF 값이 `클라이언트IP:포트` 형태가 되고, IPv6 는 주소를 대괄호로 감쌉니다
(`[2001:db8::1]:8080`). 다만 `preserve` 나 `remove` 를 함께 고르면 **ALB 가 포트 보존
설정을 무시**하고 모드에 따라 헤더를 그대로 두거나 지웁니다.

> **주의**: AWS 문서는 `X-Forwarded-For` 를 **신중하게 쓰라**고 경고합니다. 이 헤더의 항목은
> 네트워크 안에서 적절히 보호된 시스템이 추가한 경우에만 신뢰할 수 있습니다. 클라이언트가
> 임의로 채워 보낼 수 있는 값이기 때문입니다.

**고르는 기준.** 백엔드 애플리케이션이 **소스 IP 를 그대로 봐야 하거나** HTTP 가 아닌
프로토콜을 쓰면 NLB 입니다. HTTP·HTTPS 라면 ALB 를 쓰고 애플리케이션이
`X-Forwarded-For` 를 읽도록 만드는 것이 일반적입니다.

> — 출처: [Target groups for your Network Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html)
>
> — 출처: [X-Forwarded headers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/x-forwarded-headers.html)

### 4.3 과금 단위

| 유형 | 과금 방식 |
|---|---|
| ALB | 실행 시간 + 시간당 **LCU**(Load Balancer Capacity Unit) 수 |
| NLB | 실행 시간 + 시간당 **NLCU**(Network Load Balancer Capacity Unit) 수 |

단가는 바뀌므로 [Elastic Load Balancing 요금 페이지](https://aws.amazon.com/elasticloadbalancing/pricing/)에서
확인하세요.

---

## 5. Network Load Balancer

계층 4 에서 **프로토콜과 포트**만 보고 대상을 고릅니다.

```text
클라이언트 ──→ NLB
              ├─ TCP:80   → 대상 그룹 (ALB)
              ├─ UDP:90   → 대상 그룹 (컨테이너)
              └─ TCP:443  → 대상 그룹 (EC2 / 컨테이너 / IP / ALB)
```

### 5.1 여섯 가지 특징 🔄

| 특징 | 내용 |
|---|---|
| **짧은 지연 시간** | 지연 시간에 민감한 애플리케이션을 위해 설계되었습니다 |
| **영역별 격리** | AZ 마다 노드와 **별도의 IP·DNS 레코드**를 두어 한 AZ 의 문제가 다른 AZ 로 번지지 않습니다. 영역 격리가 필요하다면 **단일 AZ 구성도 가능**합니다. 고가용성은 **여러 AZ 에 로드 밸런서와 대상을 모두 구성**해야 얻습니다 (아래 참조) |
| **소스 IP 주소 유지** | 백엔드가 클라이언트 IP 를 그대로 봅니다 |
| **고정 IP 지원** | AZ(서브넷)별로 고정 IP 를 자동 제공합니다 |
| **탄력적 IP 지원** | AZ(서브넷)별로 EIP 를 할당해 자체 고정 IP 를 쓸 수 있습니다 |
| **PrivateLink 지원** | 프라이빗 연결용 엔드포인트를 통해 요청을 받을 수 있습니다 (모듈 3) |

🆕 Elastic Load Balancing 은 활성화한 **AZ 마다 네트워크 인터페이스를 만들어 고정 IP
주소를 확보**합니다. **NLB 를 만들 때** 각 네트워크 인터페이스에 EIP 하나를 선택적으로
연결할 수 있습니다.

#### 교재의 `영역별 격리` 서술을 고친 이유 🔄

교재는 이 항목을 "**단일 가용 영역의 아키텍처를 위해 설계**되었고, AZ 에 장애가 발생하면
AWS 가 **자동으로 다른 정상 AZ 로 장애 조치**한다"고 서술합니다. 두 문장이 서로 맞지
않습니다. 활성화한 AZ 가 하나뿐이면 넘길 AZ 가 없습니다.

실제 동작은 AZ 를 옮기는 것이 아니라 **비정상 AZ 를 DNS 응답에서 빼는 것**이고, 이 동작은
**NLB 전용이 아니라 ALB 에도 똑같이 적용됩니다.** 그래서 7.4 절에 두 유형을 함께 놓고
정리했습니다. [7.4 한 AZ 에 장애가 나면 무엇이 일어나는가](#74-한-az-에-장애가-나면-무엇이-일어나는가)
를 보세요.

### 5.2 대상 선택 방식 🆕

NLB 는 **흐름 해시(flow hash) 알고리즘**으로 대상을 고릅니다. 해시의 입력은 네 가지입니다.

- 프로토콜
- 소스 IP 주소와 소스 포트
- 대상 IP 주소와 대상 포트
- TCP 시퀀스 번호

그리고 **각 TCP 연결을 연결이 유지되는 동안 단일 대상으로** 라우팅합니다. 같은
클라이언트의 여러 TCP 연결은 소스 포트와 시퀀스 번호가 달라 서로 다른 대상으로 갈 수
있습니다.

**스티키 세션**(소스 IP 선호도)은 대상 그룹 수준에서 정의합니다.

> — 출처: [How Elastic Load Balancing works](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html)

### 5.3 대표 사용 사례

| 사용 사례 | NLB 를 쓰는 이유 |
|---|---|
| 데이터 수집 | 초당 수백만 요청, 갑작스러운 변동성 트래픽, 매우 짧은 지연 시간, 장기 TCP 연결(WebSocket) |
| IoT | 고정 IP 주소와 많은 수의 연결, 종료되지 않는 장기 TCP 연결 |
| RDS 가 아닌 데이터베이스 앞단 | 고정 IP 하나로 수평 확장 가능. 방화벽 규칙 작성이 쉬워집니다 |
| 광고·A/B 테스트 | 연결 풀링 성능 개선 |

내부 로드 밸런서에는 **IPv4 사용이 권장**됩니다.

---

## 6. Application Load Balancer

계층 7 에서 **요청의 내용**을 보고 라우팅합니다. ExampleCorp 가 선택한 유형입니다.

### 6.1 계층 7 라우팅

| 방식 | 기준 | 예 |
|---|---|---|
| **호스트 기반 라우팅** | HTTP 호스트 헤더의 도메인 이름 | `mobile.example.com` → 대상 그룹 A, `www.example.com` → 대상 그룹 B, 나머지 → 대상 그룹 C |
| **경로 기반 라우팅** | URL 경로 | `/api/*` → API 대상 그룹, `/static/*` → 정적 대상 그룹 |

호스트 기반 라우팅을 쓰면 **여러 프록시 서버를 따로 운영할 필요가 없습니다.**

### 6.2 규칙 작업 세 가지

각 규칙은 **전달·리디렉션·고정 응답 중 정확히 하나**를 포함해야 하고, 그것이 마지막
작업이어야 합니다. 순서 값이 가장 낮은 작업이 먼저 수행됩니다.

| 작업 | 설명 |
|---|---|
| **전달**(forward) | 지정된 대상 그룹으로 요청을 전달합니다 |
| **리디렉션**(redirect) | 한 URL 에서 다른 URL 로 보냅니다. 임시(**HTTP 302**) 또는 영구(**HTTP 301**). URI 구성 요소는 `protocol://hostname:port/path?query` |
| **고정 응답**(fixed-response) | 요청을 삭제하고 사용자 지정 HTTP 응답을 반환합니다. **2XX, 4XX, 5XX** 응답 코드와 선택적 메시지 |

### 6.3 그 밖의 ALB 기능

| 기능 | 내용 |
|---|---|
| **네이티브 IPv6 지원** | 듀얼 스택 IP 주소 유형으로 구성 가능 |
| **스티키 세션** | 기간 기반 쿠키와 애플리케이션 기반 쿠키를 **모두** 지원합니다. 대상 그룹 수준에서 켜고, 대상 그룹별로 조합해 쓸 수 있습니다 |
| **TLS 오프로드** | HTTPS 리스너로 TLS 세션을 종료합니다. 리스너 프로토콜이 HTTPS 면 **하나 이상**의 TLS 서버 인증서를 배포해야 합니다 |
| **인증** | Amazon Cognito 통합으로 소셜 IdP(Google, Facebook, Amazon), SAML 을 통한 Microsoft Active Directory, OpenID Connect 준수 IdP 로 인증할 수 있습니다 |
| **Lambda 대상** | Lambda 함수만으로 웹 사이트를 만들거나, EC2·컨테이너·온프레미스 서버·Lambda 를 섞어 쓸 수 있습니다 |

### 6.4 대상 선택 방식 🆕

ALB 는 다음 순서로 동작합니다.

1. **리스너 규칙을 우선순위 순으로 평가**해 적용할 규칙을 정합니다
2. 규칙의 작업에 해당하는 대상 그룹에서 **그 대상 그룹에 구성된 라우팅 알고리즘**으로
   대상을 고릅니다. **기본 알고리즘은 라운드 로빈**입니다

라우팅은 대상 그룹별로 독립적으로 수행됩니다. 같은 대상이 여러 대상 그룹에 등록되어
있어도 마찬가지입니다.

> — 출처: [How Elastic Load Balancing works](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html)

### 6.5 ExampleCorp 가 ALB 를 고른 이유

| 이유 | 대응하는 ALB 기능 |
|---|---|
| 호스트 기반 라우팅 필요 | 계층 7 호스트 기반 라우팅 |
| 향후 성장을 위한 A/B 배포 테스트 | 규칙 기반 트래픽 분배 |
| 사용자 인증과의 향후 통합 | Cognito·OIDC·SAML 인증 오프로드 |

### 6.6 교재에 없는 ALB 기능 🆕

Application Load Balancer 문서에 **현재 존재하는 기능으로 나열되어 있으나 교재에는 없는**
항목들입니다. 각 기능이 언제 추가되었는지는 확인하지 않았으니, 이름만 알아 두고 필요할 때
해당 기능 문서를 찾아보세요.

| 기능 | 한 줄 설명 |
|---|---|
| 상호 TLS 인증 (mutual TLS) | 클라이언트 인증서로 클라이언트를 검증합니다 |
| JWT 검증 | JSON Web Token 을 로드 밸런서에서 검증합니다 |
| 자동 대상 가중치 (automated target weights) | 대상의 상태 신호를 보고 가중치를 자동 조정합니다 |
| 대상 최적화 도구 (target optimizer) | 대상 처리 특성에 맞춰 라우팅을 최적화합니다 |
| 용량 단위 예약 (capacity unit reservation) | 급증이 예상될 때 용량을 미리 확보합니다 |
| 연결 로그 / 상태 확인 로그 | 액세스 로그 외에 연결 단위·상태 확인 단위 로그를 남깁니다 |
| FIPS 보안 정책 | FIPS 준수 암호 스위트를 씁니다 |
| Local Zone·Outpost 서브넷 | 가용 영역 외의 위치에도 배포할 수 있습니다 |

> — 출처: [Application Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html)

---

## 7. 교차 영역 로드 밸런싱

### 7.1 켜고 끌 때 무엇이 달라지는가

로드 밸런서 **노드**가 트래픽을 분산하는 범위를 결정하는 설정입니다.

전제: AZ 1 에 대상 2개, AZ 2 에 대상 8개. Route 53 이 로드 밸런서 노드의 IP 로 응답하므로
**각 노드가 클라이언트 트래픽의 50%** 를 받습니다.

| 설정 | AZ 1 대상 (2개) 각각 | AZ 2 대상 (8개) 각각 | 왜 |
|---|---|---|---|
| **켜짐** | 10% | 10% | 각 노드가 자기 50% 를 **10개 대상 전부**에 나눕니다 |
| **꺼짐** | 25% | 6.25% | 각 노드가 자기 50% 를 **자기 AZ 대상에만** 나눕니다 |

```text
[켜짐]  노드A(50%) ──┬──→ AZ1 대상 2개
                     └──→ AZ2 대상 8개      각 대상 10%
        노드B(50%) ──┬──→ AZ1 대상 2개
                     └──→ AZ2 대상 8개

[꺼짐]  노드A(50%) ─────→ AZ1 대상 2개      각 대상 25%
        노드B(50%) ─────→ AZ2 대상 8개      각 대상 6.25%
```

### 7.2 유형별 기본값 🔄

| 유형 | 기본값 | 조정 |
|---|---|---|
| **ALB** | 로드 밸런서 수준에서 **항상 켜져 있습니다** | **대상 그룹 수준에서만** 끌 수 있습니다 |
| **NLB** | **꺼져 있습니다** | 로드 밸런서를 만든 뒤 **언제든지** 켜고 끌 수 있고, **대상 그룹 수준에서도** 켤 수 있습니다 |
| **GWLB** | 꺼져 있습니다 | 생성 후 언제든지 |

교재는 ALB 를 "기본적으로 켜져 있으며 끌 수 있다"고 설명했는데, 현행 문서는 더
정확합니다. **로드 밸런서 수준에서는 항상 켜져 있고, 끌 수 있는 곳은 대상 그룹
수준뿐입니다.** 또 교재는 대상 그룹 수준 설정을 ALB 전용으로 서술했지만
**NLB 도 대상 그룹 수준에서 켤 수 있습니다**(`load_balancing.cross_zone.enabled` 속성).

> — 출처: [How Elastic Load Balancing works](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html)

### 7.3 켜는 것이 항상 좋은가

교재 강사 노트는 흥미로운 모범 사례를 제시합니다. **"교차 영역 로드 밸런싱을 켜지 않고
AZ 간에 실제로 용량을 밸런싱하는 것"** 입니다.

이유를 생각해 보면 이렇습니다. 교차 영역을 켜면 대상 수가 불균형해도 트래픽이 고르게
나뉘지만, **AZ 경계를 넘는 트래픽**이 생기고 한 AZ 의 문제가 다른 AZ 대상까지 영향을 줄
여지가 커집니다. 각 AZ 에 용량을 고르게 두는 편이 격리 관점에서 낫습니다.

### 7.4 한 AZ 에 장애가 나면 무엇이 일어나는가 🆕

교재가 NLB 의 `영역별 격리` 항목에서 "AZ 장애 시 자동 장애 조치"라고만 적고 넘어간 부분입니다.
**ALB 와 NLB 에 공통으로 적용됩니다.**

#### 장애가 번지는 순서

AZ-A, AZ-B, AZ-C 세 AZ 를 활성화한 로드 밸런서에서 **AZ-A 의 대상이 전부 비정상**이 됐다고
하겠습니다.

```text
1  로드 밸런서는 활성화한 AZ 마다 노드를 두고, 노드마다 IP 가 하나씩 있습니다.
   이름을 조회하면 IP 3개가 돌아옵니다.

     example.elb.ap-northeast-2.amazonaws.com  →  10.0.1.10  (AZ-A 노드)
                                                  10.0.2.10  (AZ-B 노드)
                                                  10.0.3.10  (AZ-C 노드)

2  AZ-A 의 정상 대상 수가 임계값 아래로 떨어집니다.

3  AWS 가 AZ-A 노드의 IP 를 DNS 에서 비정상으로 표시합니다.
   로드 밸런서를 다른 AZ 로 옮기는 것이 아닙니다.

4  이후 이름을 조회하는 클라이언트는 IP 2개만 받습니다.

     example.elb.ap-northeast-2.amazonaws.com  →  10.0.2.10  (AZ-B 노드)
                                                  10.0.3.10  (AZ-C 노드)

5  새 연결은 AZ-B, AZ-C 로만 갑니다.
   AZ-A 로 이미 열려 있던 연결은 자연히 닫힐 때까지 유지됩니다.
```

3단계가 교재가 "자동 장애 조치"라고 부른 것입니다. 수단이 **DNS 응답에서 빼기**이므로 몇 가지
성질이 따라옵니다.

| 성질 | 내용 |
|---|---|
| 여러 AZ 가 전제 | 활성화한 AZ 가 하나면 내려줄 다른 IP 가 없습니다. 교재의 "단일 AZ 를 위해 설계" 와 "다른 AZ 로 자동 장애 조치" 가 함께 성립하지 않는 이유입니다 |
| 새 연결부터 적용 | 이미 열려 있는 연결은 옮겨지지 않습니다. 또 클라이언트가 캐시한 이전 DNS 응답의 TTL(60초)이 만료되어야 반영됩니다 (2.4 절) |
| 끌 수 있음 | 자동으로 항상 일어나는 일이 아닙니다. 아래 임계값 속성으로 정하고 `off` 로 둘 수 있습니다 |

#### 임계값 두 개가 서로 다른 일을 합니다

이름이 비슷해 헷갈리는 지점입니다. 둘 다 대상 그룹 속성이고 **ALB·NLB 공통**입니다.

| 속성 | 임계값 미달일 때 하는 일 | 기본값 |
|---|---|---|
| `target_group_health.dns_failover.minimum_healthy_targets.count` | 그 영역 노드의 IP 를 **DNS 에서 비정상으로 표시**합니다. 클라이언트가 정상 영역으로만 갑니다 | **1** |
| `target_group_health.dns_failover.minimum_healthy_targets.percentage` | 위와 같으나 백분율 기준입니다 | **`off`** |
| `target_group_health.unhealthy_state_routing.minimum_healthy_targets.count` | DNS 는 그대로 두고, 노드가 **비정상 대상까지 포함해 모든 대상으로** 보냅니다 | **1** |
| `target_group_health.unhealthy_state_routing.minimum_healthy_targets.percentage` | 위와 같으나 백분율 기준입니다 | **`off`** |

앞의 둘은 **DNS 장애 조치**, 뒤의 둘은 **라우팅 장애 조치**입니다. `off` 로 두면 대상이 전부
비정상이어도 그 영역을 DNS 에서 빼지 않습니다.

#### 모든 AZ 가 비정상이면 반대로 동작합니다

여기서 직관이 어긋납니다. 활성화한 **모든** AZ 에 정상 대상이 없으면 IP 를 전부 빼는 것이
아니라 **전부 돌려줍니다.** NLB 문서는 이를 **fail-open** 이라고 부릅니다. 뺄 IP 가 전부라면
서비스가 완전히 끊기므로, 비정상 대상에라도 보내는 편을 택하는 설계입니다.

```text
AZ-A 정상, AZ-B 정상, AZ-C 정상   → DNS 응답: IP 3개 (A, B, C)
AZ-A 대상 전부 비정상             → DNS 응답: IP 2개 (B, C)        ← A 제거
AZ-A, AZ-B 대상 전부 비정상       → DNS 응답: IP 1개 (C)           ← A, B 제거
세 AZ 대상 전부 비정상            → DNS 응답: IP 3개 (A, B, C)     ← fail-open
```

> — 출처: [Target groups for your Application Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html)

> — 출처: [Troubleshoot your Network Load Balancer](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-troubleshooting.html)

#### ALB 와 NLB 의 차이 🆕

메커니즘은 같지만 문서화 수준과 실제 효과가 갈리는 지점이 있습니다.

| 항목 | ALB | NLB |
|---|---|---|
| 영역별 DNS 레코드 | 있습니다. `az.name-id.elb.region.amazonaws.com` | 있습니다. 같은 형식 |
| DNS 장애 조치 / 라우팅 장애 조치 속성 | 있습니다. 기본값도 같습니다 | 있습니다 |
| AWS 의 선제적 제거 | 여러 인프라 문제가 서비스에 영향을 줄 때 AWS 가 영역 IP 를 DNS 에서 **선제적으로 제거**한다고 문서화되어 있습니다 | 같은 문장이 문서화되어 있습니다 |
| 전용 `영역 상태` 절 | **없습니다** | **있습니다.** `Load balancer zonal health` 절에서 실패 원인 네 가지를 열거합니다 |
| `ZonalHealthStatus` CloudWatch 지표 | **없습니다** (ALB 지표 목록에 없음) | **있습니다** |
| 교차 영역 기본값이 만드는 차이 | 로드 밸런서 수준에서 **항상 켜짐**이라 AZ-A 노드가 AZ-B·AZ-C 대상까지 씁니다. 대상 그룹 수준에서 끄지 않는 한 한 AZ 의 대상 손실이 곧 그 노드의 무용화로 이어지지 않습니다 (7.2 절) | **기본 꺼짐**이라 AZ-A 노드는 AZ-A 대상만 씁니다. AZ-A 대상이 전부 비정상이면 그 노드는 보낼 곳이 없어집니다 |

마지막 행이 실무에서 체감되는 차이입니다. 교차 영역이 꺼진 NLB 는 **영역 격리가 강한 대신
한 AZ 의 대상 손실이 그대로 드러나고**, 교차 영역이 켜진 ALB 는 그 손실을 다른 AZ 의 대상으로
흡수합니다. 교재가 `영역별 격리` 를 NLB 의 특징으로 든 것은 이 성질을 가리킨 것으로 보이며,
그 자체는 타당합니다. 부정확한 것은 "단일 AZ 를 위해 설계" 라는 표현입니다.

NLB 문서만 영역 상태 확인 실패 원인을 명시합니다. 네 가지입니다.

- 로드 밸런서에 정상 대상이 없음
- 정상 대상 수가 설정한 최소값 미달
- 영역 이동 또는 자동 영역 이동이 진행 중 (7.5 절)
- **감지된 문제로 트래픽이 정상 영역으로 자동 이동 중**

마지막 항목이 교재가 말하려던 자동 장애 조치에 가장 가깝습니다. AWS 가 영역 문제를 감지해
트래픽을 정상 영역으로 자동으로 옮기는 동작은 실제로 존재합니다.

> — 출처: [Network Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html)

> — 출처: [Zonal shift for Application Load Balancers](https://docs.aws.amazon.com/r53recovery/latest/dg/arc-zonal-shift.resource-types.app-load-balancers.html)

### 7.5 영역 이동 🆕

AZ 하나가 손상됐을 때 쓰는 별도 장치가 있습니다. **영역 이동(zonal shift)** 은
**Amazon Application Recovery Controller(ARC)** 의 기능으로, 로드 밸런서 리소스를
손상된 가용 영역에서 **한 번의 작업으로** 빼냅니다.

7.4 절의 DNS 제거가 **AWS 가 알아서 하는 것**이라면, 영역 이동은 **운영자가 직접 시작하는
것**입니다. 아직 상태 확인에 걸리지 않았지만 그 AZ 가 의심스러울 때 씁니다.

- 교차 영역 로드 밸런싱을 **켠 것과 끈 것 모두** 지원합니다
- 한 번에 **단일 AZ** 에 대해서만 시작할 수 있습니다
- 교차 영역을 끈 상태에서 영역 이동을 하면 그 AZ 의 **대상 용량도 함께 빠집니다.**
  시작 전에 남은 AZ 의 용량을 확인해야 합니다

🆕 두 유형 모두 **기본적으로 꺼져 있고 로드 밸런서마다 켜야 합니다.** ALB 는 로드 밸런서
속성에서 ARC 영역 이동 통합을 활성화합니다.

| 짚을 점 | 내용 |
|---|---|
| ALB 가 NLB 의 대상일 때 | 영역 이동을 **NLB 에서 시작해야** 합니다. ALB 에서 시작하면 NLB 가 그 이동을 인식하지 못하고 계속 ALB 로 트래픽을 보냅니다 |
| 단일 AZ 대상 그룹 | 영역 이동이 **동작하지 않습니다** |
| 손상된 AZ 의 대상 | 트래픽 수신을 멈추지만 **상태 확인은 계속 받습니다.** 이동이 만료되거나 취소되고 대상이 정상이면 라우팅이 재개됩니다 |

> — 출처: [Zonal shift for Application Load Balancers](https://docs.aws.amazon.com/r53recovery/latest/dg/arc-zonal-shift.resource-types.app-load-balancers.html)

> — 출처: [Zonal shift for Network Load Balancers](https://docs.aws.amazon.com/r53recovery/latest/dg/arc-zonal-shift.resource-types.network-load-balancers.html)

> — 출처: [How Elastic Load Balancing works](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html)

---

## 8. Amazon EC2 Auto Scaling

### 8.1 구성 요소

| 요소 | 역할 |
|---|---|
| **시작 템플릿** | 인스턴스를 어떻게 띄울지 정의합니다 (AMI, 인스턴스 유형, EBS 볼륨, ENI, 사용자 데이터, 키 페어, 보안 그룹, 블록 디바이스 매핑) |
| **Auto Scaling 그룹(ASG)** | 인스턴스의 논리적 모음. 용량을 유지하고 상태 확인 대체를 수행합니다 |
| **용량 설정** | 최소 / 원하는 용량 / 최대 |
| **크기 조정 정책** | 언제 늘리고 줄일지 결정합니다 |

```text
      최대 4  ─────────────────────────
                    ╱‾‾‾╲
원하는 용량 2  ──────╱     ╲──────────
      최소 1  ─────────────────────────
```

예를 들어 최소 1, 원하는 용량 2, 최대 4 라면 인스턴스 수는 정책에 따라 1\~4 사이에서
움직이고, Auto Scaling 이 원하는 용량을 맞추려 인스턴스를 시작·종료합니다.

### 8.2 시작 템플릿을 쓰세요 🔄

교재 슬라이드 25 는 "인스턴스 프로비저닝을 위한 **시작 템플릿 또는 구성** 사용"이라고
두 방식을 나란히 제시합니다. **지금은 사실상 시작 템플릿 하나만 선택지입니다.**

시작 구성(launch configuration)에는 이런 제한이 걸려 있습니다.

| 시점 | 제한 |
|---|---|
| **2023년 1월 1일**부터 | 신규 EC2 인스턴스 유형이 시작 구성에서 지원되지 않습니다. 리전 출시 이후 추가된 인스턴스 유형도 포함됩니다 |
| **2023년 6월 1일** 이후 생성된 계정 | 콘솔로 새 시작 구성을 만들 수 없습니다 |
| **2024년 10월 1일** 이후 생성된 계정 | 콘솔·API·CLI·CloudFormation **어떤 방법으로도** 새 시작 구성을 만들 수 없습니다 |

AWS 는 시작 템플릿으로 마이그레이션할 것을 권장합니다. 교재의 강사 노트도
"최신 기능을 사용할 수 있도록 시작 템플릿에서 ASG 를 생성하는 것이 좋다"고 하지만,
현재는 권장이 아니라 **사실상 유일한 경로**입니다.

> — 출처: [Auto Scaling launch configurations](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html)

### 8.3 크기 조정을 일으키는 방법

| 방법 | 언제 쓰는가 |
|---|---|
| **상태 확인** | 비정상 인스턴스를 종료하고 대체 인스턴스를 시작합니다. **ELB 상태 확인을 쓰도록 구성**하면 EC2 상태 확인이나 ELB 상태 확인 중 하나라도 실패하면 비정상으로 봅니다 |
| **CloudWatch 경보** | 지정한 지표를 추적하고 경보가 `ALARM` 상태일 때 작업을 수행합니다 |
| **일정** | 시간·날짜 함수로 자동 조정합니다. 언제 늘려야 할지 정확히 알 때 유용합니다 |
| **수동 크기 조정** | 최대·최소·원하는 용량을 직접 바꿉니다. 가장 기본적인 방법 |
| **예측 크기 조정** | 기계 학습으로 과거 워크로드를 분석해 향후 로드를 예측하고, 용량이 필요해지기 **전에** 일정 작업을 만듭니다 |
| **동적 크기 조정** | 트래픽 변화에 따라 조정합니다. **대상 추적 / 단계 / 단순** 세 가지 유형이 있습니다 |

**꼭 기억할 동작**: 대상 그룹을 여러 개 ASG 에 연결했다면
**모두가 정상이라고 보고해야** 인스턴스가 정상으로 간주됩니다. 하나라도 비정상이라고
보고하면 ASG 가 그 인스턴스를 교체합니다.

### 8.4 ELB 와 함께 쓰기

```text
          로드 밸런서
               │
      ┌────────┴────────┐
   [AZ 1 서브넷]     [AZ 2 서브넷]
   인스턴스 인스턴스   인스턴스 인스턴스
      └──── Auto Scaling 그룹 ────┘
```

- **Auto Scaling 그룹이 로드 밸런서의 대상 그룹이 될 수 있습니다**
- 로드 밸런서를 연결하면 그룹의 인스턴스가 **자동으로 등록**되고 수신 트래픽이 분산됩니다
- 크기 조정 정책을 지정하면 수요 변화에 따라 인스턴스를 시작·종료합니다

가용성과 비용 중 무엇을 최적화할지, 아니면 둘의 균형을 잡을지는 크기 조정 계획으로
정합니다.

---

## 9. 실습 1: 다중 AZ VPC 아키텍처 구축

소요 시간 75분. 상세 절차는 실습 가이드를 따르세요. 여기서는 **무엇을 만드는지와
왜 그렇게 하는지**만 정리합니다.

### 9.1 실습 태스크

1. 탄력적 IP 주소를 확인하고 인식
2. 기존 VPC 에 **보조 IPv4 CIDR 블록** 추가
3. **다중 AZ 서브넷** 배포 체계 생성·인식
4. **NAT 게이트웨이** 구현
5. 기존 VPC 에서 **듀얼 스택 라우팅** 구현
6. **2티어 애플리케이션을 3티어 애플리케이션으로** 마이그레이션

### 9.2 시작 상태

```text
VPC 10.1.0.0/22
├─ 퍼블릭 서브넷 10.1.0.0/24 ── Auto Scaling 그룹(웹 서버), 배스천 호스트
├─ 프라이빗 서브넷 10.1.1.0/24 ── Aurora
└─ 프라이빗 서브넷 10.1.2.0/24 ── Aurora
인터넷 게이트웨이
```

문제는 모듈 1에서 본 그대로입니다. `/22` 는 너무 작고, 웹 서버가 퍼블릭 서브넷에 직접
노출되어 있고, 로드 밸런서가 없고, IPv6 가 없습니다.

### 9.3 재설계 8단계

| 단계 | 작업 | 해결하는 문제 |
|---|---|---|
| 1 | 보조 IPv4 CIDR 추가 | `/22` 로는 IP 가 부족 |
| 2 | 새 서브넷 추가 + 모든 퍼블릭 서브넷이 퍼블릭 IP 를 자동 할당하도록 업데이트 | 다중 AZ 구성 |
| 3 | NAT 게이트웨이 생성 + 라우팅 테이블 업데이트 | 프라이빗 서브넷의 아웃바운드 |
| 4 | IPv6 CIDR 추가 + VPC 에 IPv6 지원 통합 | IPv6 의무 준수 |
| 5 | 송신 전용 인터넷 게이트웨이 생성 + 서브넷 라우팅 테이블에 IPv6 라우팅 | IPv6 아웃바운드만 허용 |
| 6 | Aurora 를 듀얼 스택 모드로 업데이트 | 데이터 티어도 듀얼 스택 |
| 7 | **Application Load Balancer 생성 + Auto Scaling 대상 그룹과 연결** | 확장성·복원력 |
| 8 | Auto Scaling 그룹을 퍼블릭 → 새 웹 서버 **프라이빗** 서브넷으로 마이그레이션 후 동작 확인 | 웹 서버를 인터넷에서 격리 |

### 9.4 완성된 아키텍처

```text
VPC 10.1.0.0/22 + 10.1.4.0/22 + IPv6
├─ AZ A
│   ├─ 퍼블릭 서브넷   ── ALB, NAT 게이트웨이, 배스천 호스트
│   ├─ 프라이빗 서브넷 ── 웹 서버 (Auto Scaling 그룹)
│   └─ 프라이빗 서브넷 ── Aurora
└─ AZ B
    ├─ 퍼블릭 서브넷   ── ALB, NAT 게이트웨이
    ├─ 프라이빗 서브넷 ── 웹 서버 (Auto Scaling 그룹)
    └─ 프라이빗 서브넷 ── Aurora
인터넷 게이트웨이 + 송신 전용 인터넷 게이트웨이
```

서브넷 CIDR 은 `10.1.0.0/24` \~ `10.1.5.0/24` 범위에서 각각 IPv6 접두사와 함께
배정됩니다. 어느 CIDR 이 어느 서브넷에 가는지는 실습 가이드의 다이어그램을 따르세요.

**이 아키텍처가 왜 좋아졌는지** 한 줄로 정리하면 이렇습니다. 웹 서버가 인터넷에서
직접 보이지 않게 되었고(프라이빗 서브넷 + ALB), 한 AZ 가 죽어도 서비스가 유지되며
(다중 AZ + ALB + ASG), IPv4 와 IPv6 클라이언트를 모두 받을 수 있습니다(듀얼 스택).

---

## 10. 한눈에 정리

### 무엇을 고를지 3초 판단

| 조건 | 선택 |
|---|---|
| HTTP/HTTPS 이고 경로·호스트로 나눠야 한다 | **ALB** |
| Lambda 를 대상으로 써야 한다 | **ALB** |
| 리디렉션이나 고정 응답이 필요하다 | **ALB** |
| 사용자 인증을 로드 밸런서에서 처리하고 싶다 | **ALB** |
| TCP/UDP 이고 지연 시간이 극도로 중요하다 | **NLB** |
| 방화벽에 등록할 **고정 IP** 가 필요하다 | **NLB** |
| 백엔드가 클라이언트 IP 를 그대로 봐야 한다 | **NLB** |
| PrivateLink 로 서비스를 노출해야 한다 | **NLB** |
| 서드 파티 보안 어플라이언스를 끼워야 한다 | **GWLB** |

### 자주 틀리는 것

| 오해 | 사실 |
|---|---|
| 로드 밸런서는 서브넷 하나만 있어도 된다 | 서로 다른 AZ 의 서브넷 2개 이상이 필요합니다 |
| 서브넷 크기는 아무래도 된다 | `/27` 이상 + 사용 가능한 IP 8개 이상이 필요합니다 |
| ALB 도 고정 IP 를 준다 | 주지 않습니다. 고정 IP 가 필요하면 NLB, 또는 NLB→ALB 조합 |
| ALB 가 클라이언트 IP 를 그대로 전달한다 | `X-Forwarded-For` 헤더로 전달합니다 |
| ALB 의 교차 영역을 로드 밸런서 수준에서 끌 수 있다 | 로드 밸런서 수준에서는 항상 켜져 있고, 대상 그룹 수준에서만 끕니다 |
| 시작 구성도 여전히 쓸 수 있다 | 신규 생성이 사실상 막혔습니다. 시작 템플릿을 쓰세요 |

---

## 11. 교재 대비 변경 사항

### 11.1 교재 기술이 사실과 다른 항목

교재 안에서 **서로 어긋나는 서술**이 세 군데 있습니다.

| 교재 위치 | 교재 기재 | 확인된 내용 |
|---|---|---|
| 슬라이드 19 표와 강사 노트 | 표는 ALB 의 "소스 IP 주소 유지"를 **"예"** 로 표시하고 각주를 달았는데, 같은 슬라이드 강사 노트는 **"ALB 는 소스 IP 주소를 보존하지 않는다"** 고 서술합니다 | ALB 는 소스 IP 를 그대로 전달하지 않고 `X-Forwarded-For` 헤더로 전달합니다 (4.2 절) |
| NLB `영역별 격리` 강사 노트 | "**단일 가용 영역의 아키텍처를 위해 설계**되었다"고 하면서, 같은 문단에서 "AZ 에 장애가 발생하면 AWS 가 **자동으로 다른 정상 AZ 로 장애 조치**한다"고 서술합니다 | 두 문장이 함께 성립하지 않습니다. 활성화한 AZ 가 하나면 넘길 AZ 가 없습니다. 실제 동작은 AZ 를 옮기는 것이 아니라 **비정상 AZ 노드의 IP 를 DNS 응답에서 빼는** 것이고, **여러 AZ 를 활성화한 경우에만** 의미가 있습니다. 또 이 동작은 **NLB 전용이 아니라 ALB 에도 적용**됩니다 (7.4 절) |
| 슬라이드 18 강사 노트 | `TLD 종료` | `TLS 종료` 의 오기로 보입니다 |

`영역별 격리` 는 교재 같은 문단의 **마지막 문장이 정확합니다.** "단일 가용 영역에서 NLB 를
사용하여 영역 격리가 필요한 아키텍처를 지원할 수 있습니다"는 맞는 서술입니다. 문제는
이것을 "단일 AZ 를 위해 설계되었다"로 앞세운 첫 문장입니다. **할 수 있다**와 **그것을 위해
설계되었다**는 다릅니다.

교재가 말하려던 자동 장애 조치 자체는 존재합니다. AWS 는 영역 상태 확인 실패 원인 중 하나로
"감지된 문제로 트래픽이 정상 영역으로 자동 이동 중"을 문서화합니다. 다만 그 수단이 DNS
응답에서 빼기이므로 **클라이언트 DNS 캐시가 만료된 뒤 반영**되고, **모든 AZ 가 비정상이면
fail-open 으로 오히려 전체 IP 를 돌려줍니다.**

교재가 `영역별 격리` 를 NLB 의 특징으로 든 것 자체는 타당합니다. NLB 는 교차 영역이 **기본
꺼짐**이라 한 AZ 의 노드가 그 AZ 의 대상만 쓰고, 그래서 영역 사이 격리가 강합니다. 부정확한
것은 이 성질을 "단일 AZ 를 위해 설계되었다"로 표현한 부분입니다. 자세한 내용은 7.4 절에
ALB 와 나란히 놓고 정리했습니다.

> — 출처: [Network Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html)

### 11.2 동작·기본값이 변경된 항목

| 항목 | 교재 | 현재 | 근거 |
|---|---|---|---|
| ALB 교차 영역 로드 밸런싱 | "기본적으로 켜져 있으며 이는 끌 수 있다" | 로드 밸런서 수준에서는 **항상 켜져 있고**, **대상 그룹 수준에서만** 끌 수 있습니다 | [How Elastic Load Balancing works](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html) |
| NLB 교차 영역 대상 그룹 설정 | 대상 그룹 수준 조정을 ALB 전용으로 서술 | **NLB 도** 대상 그룹 수준에서 켤 수 있습니다 (`load_balancing.cross_zone.enabled`) | [Network Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html) |
| 서비스 이름 | (교재에 없음) | 영역 이동은 **Amazon Application Recovery Controller(ARC)** 의 기능입니다. 이전 이름은 Route 53 Application Recovery Controller 였습니다 | [How Elastic Load Balancing works](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html) |

교차 영역을 켜고 끌 때의 **10% / 25% / 6.25% 수치는 현행 문서와 정확히 일치**합니다.
교재 값을 그대로 쓸 수 있습니다.

### 11.3 비권장·지원 종료된 항목

| 항목 | 상태 | 대체 | 근거 |
|---|---|---|---|
| **EC2-Classic** | **지원 종료** (2022년 8월 15일) | VPC | [Moving a DB instance not in a VPC into a VPC](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_VPC.Non-VPC2VPC.html) |
| **시작 구성(launch configuration)** | **신규 생성 차단** — 2024년 10월 1일 이후 생성된 계정은 어떤 방법으로도 만들 수 없고, 2023년 1월 1일부터 신규 인스턴스 유형이 지원되지 않습니다 | **시작 템플릿(launch template)** | [Auto Scaling launch configurations](https://docs.aws.amazon.com/autoscaling/ec2/userguide/launch-configurations.html) |

### 11.4 교재에 없는 항목

이 모듈의 항목들은 **출시 시점을 확인하지 않았습니다.** 문서에 현재 존재하고 교재에는
없다는 것만 확인했습니다. 다른 모듈(M01·M03·M04)에서는 문서 이력으로 날짜를 확인했지만,
아래 항목들은 개별 기능이 흩어져 있어 이번에 날짜를 추적하지 않았습니다.

| 항목 | 무엇인가 | 근거 |
|---|---|---|
| **영역 이동 (zonal shift)** | 손상된 AZ 에서 로드 밸런서 리소스를 한 번의 작업으로 빼냅니다. ARC 의 기능 | [How Elastic Load Balancing works](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html) |
| **교재에 없는 ALB 기능** | 상호 TLS 인증, JWT 검증, 자동 대상 가중치, 대상 최적화 도구, 용량 단위 예약, 연결 로그, 상태 확인 로그, FIPS 보안 정책. **현재 존재하는 기능임은 확인했지만 추가 시점은 확인하지 않았습니다** | [Application Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html) |
| **Local Zone·Outpost 서브넷** | ALB 를 가용 영역 외 위치에도 배포할 수 있습니다. 여러 영역을 활성화할 때는 영역 유형이 같아야 합니다 | [Application Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html) |
| **NLB 흐름 해시 입력** | 프로토콜, 소스 IP·포트, 대상 IP·포트, TCP 시퀀스 번호. 각 TCP 연결은 연결 수명 동안 단일 대상으로 | [How Elastic Load Balancing works](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html) |
| **DNS TTL 60초** | 로드 밸런서 DNS 항목의 TTL 이 60초로 지정됩니다 | [How Elastic Load Balancing works](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html) |
| **예약 ENI** | ELB 가 서브넷에 `ENI reserved by ELB for subnet` 인터페이스를 만들어 IP 부족 시에도 유지 관리를 완료합니다 | [Application Load Balancers](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html) |
| **GWLB 동작 방식** | 5튜플 흐름 해시로 어플라이언스를 고르고 GENEVE 프로토콜 포트 6081 로 트래픽을 교환합니다 | [How Elastic Load Balancing works](https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html) |

### 11.5 검증하지 못한 항목

| 항목 | 교재 기술 | 상태 |
|---|---|---|
| NLB 보안 그룹 제약 | "NLB 의 보안 그룹 지원은 생성 시 보안 그룹을 하나 이상 포함해야만 사용할 수 있고, 생성 후에는 변경할 수 있다" | NLB 보안 그룹 문서를 직접 확인하지 못했습니다. 교재 기술을 그대로 옮겼습니다 |
| 과금 단위 상세 | ALB 는 LCU, NLB 는 NLCU | 요금 페이지를 직접 확인하지 않았습니다. 단가는 적지 않고 단위 이름만 소개했습니다 |
| Auto Scaling 정책 상세 | 동적 크기 조정의 세 유형(대상 추적·단계·단순), 예측 크기 조정의 기계 학습 동작 | Auto Scaling 정책 문서를 직접 확인하지 못했습니다. 교재 기술 범위로만 적었습니다 |
| ELB 유형 개수 | 슬라이드 10 본문은 3개(ALB·NLB·GWLB)를 표시하는데 강사 노트는 "4가지 유형"이라고 합니다 | 4장에는 슬라이드 본문과 같은 **세 유형만** 넣었습니다. 강사 노트가 네 번째로 세는 이전 세대 유형은 이 자료의 범위에서 제외했습니다 |
