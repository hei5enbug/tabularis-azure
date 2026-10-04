# Tabularis Cosmos DB for NoSQL

Azure Cosmos DB for NoSQL의 연결, JSON 쿼리와 문서 편집을 Tabularis에서 제공합니다.
MongoDB API와 SQL 트랜잭션 세션은 지원하지 않습니다.
플러그인 버전은 `0.1.0`이며, 수정된 host `0.26.1-spatial.1` 이상과 service protocol `1`이 필요합니다.
공개 플러그인 SDK API 버전은 `0.2.0`입니다.

## 빌드와 설치

이 저장소만 checkout하면 됩니다. 다른 private 저장소나 PAT는 필요하지 않습니다.
공개 npm 의존성을 받으려면 네트워크 또는 채워진 패키지 cache가 필요합니다.
Node `24.21.0`, pnpm `10.30.3`, Rust `1.96.0`을 준비한 뒤 실행하세요.

```sh
pnpm bootstrap
pnpm typecheck
pnpm --dir ui typecheck
pnpm test:bootstrap
```

bootstrap은 고정된 host 빌드 입력을 sibling `tabularis-host`에 준비하고 계약, SDK, 드라이버, UI를 빌드합니다.
기존 sibling이 있으면 SDK와 계약 source의 SHA가 같을 때만 재사용하며 덮어쓰지 않습니다.
고정 source와 생산 ZIP을 만드는 방법은 [빌드 안내](docs/building.md#고정-빌드-입력)를 참고하세요.

| 패키지 대상 | 현재 실행 근거 |
| --- | --- |
| macOS arm64 | 생산 ZIP의 실제 native 설치와 bundled Node 실행 확인 |
| macOS x64 | 실제 Rosetta 실행과 Intel native CI의 ZIP/runtime 실행 확인 |
| Linux arm64 | archive 검증만 확인, native 실행 미확인 |
| Linux x64 | Ubuntu native CI의 ZIP/runtime 실행 확인 |
| Windows x64 | Windows 2022 native CI의 ZIP/runtime 실행 확인 |

## 연결과 작업 공간

연결 설정에는 공개 `https://<account>.documents.azure.com` endpoint와 데이터베이스를 입력합니다.
계정 키 또는 Entra 사용자·서비스 주체 인증을 선택할 수 있습니다.
비밀은 연결 설정 JSON에 넣지 않고 인증 화면의 보호된 전달 기능으로 등록합니다.

Cosmos 작업 공간에서 저장된 연결을 명시적으로 선택한 뒤 데이터베이스와 컨테이너를 확인하세요.
임의 쿼리 결과는 원래 JSON 값으로 표시합니다.
문서를 편집하려면 전체 파티션 키와 최신 ETag를 확인해야 합니다.
쓰기에는 연결의 쓰기 허용과 host의 명시적 승인이 필요합니다.

인증, 읽기 전용, continuation과 결과 불명 처리 방법은 [사용 안내](docs/usage.md#안전하게-문서-편집하기)에 있습니다.
현재 실제 Azure 검증은 사용자 지시에 따라 보류했습니다.
mock 검사, 실제 설치, OS별 CI를 나눈 기록은 [검증 기록](docs/verification.md#관찰한-검사)를 참고하세요.

## 라이선스

[Apache License 2.0](LICENSE)으로 배포합니다.
생산 ZIP에는 bundled Node와 의존성의 라이선스 및 출처 원장이 포함됩니다.
