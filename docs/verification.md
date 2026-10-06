# 관찰한 검증과 남은 범위

이 기록은 실행한 검사와 아직 실행하지 않은 검사를 구분합니다.
mock 통과는 실제 Azure 권한·TLS·Entra 동작의 증거가 아닙니다.
실제 Azure 연결 확인을 우선합니다. 인증·네트워크 허용 전에는 실제 데이터 검증을 완료로 표시하지 않습니다.
GitHub Actions는 수동 실행하는 선택 사항입니다. 실제 OS에서 직접 실행한 검증도 환경과 결과를 기록합니다.

## 관찰한 검사

| 범위 | 관찰 결과 | 증거의 범위 |
| --- | --- | --- |
| Cosmos core 회귀 | unit 625개, protocol 14개 통과 | 합성 입력과 실제 SDK의 local transport 검사 |
| 기존 Cosmos UI | UI 110개 통과 | mock SDK로 화면 동작 검사 |
| 후속 CSS 연결 | 관련 62개 검사 통과 | 스타일 수명과 기존 UI 일부, 기존 110개와 합산하지 않음 |
| X1-C 독립 checkout UI | 전체 118개 통과 | 한글·공백 임시 checkout의 실제 Vitest 실행, 위 수와 합산하지 않음 |
| 수동 Azure harness | synthetic 검사 74개 통과 | 코드 경계·sequence·cleanup, 실제 Azure 실행 아님 |
| T0e native 설치 | 생산 ZIP 3개를 한 ignored fixture test에서 설치, 1개 통과 | Spatial와 Cosmos 두 arch, 새 임시 plugin root 사용 |
| bundled Cosmos runtime | macOS ARM 및 실제 Rosetta x64에서 Node 24.21.0 실행 | 빈 PATH·8개 poisoning canary·initialize·shutdown·EOF |

T0e는 production native installer를 호출해 실제 설치 파일의 크기와 SHA 원장을 검증했습니다.
Cosmos 설치 뒤 선언된 CSS asset도 host asset reader로 확인했습니다.
네트워크 없는 initialize에서 service protocol 1, documents·query page·cancel 지원과 sessions 미지원을 확인했습니다.
실제 query·문서·Azure credential은 이 smoke에서 사용하지 않았습니다.

## 고정된 생산 ZIP 근거

아래 값은 T0e에서 관찰한 이전 release 출력이며 이번 CI에서 새로 만든 ZIP의 SHA를 대신하지 않습니다.

| 대상 | ZIP 크기 | 파일 수 | SHA256 |
| --- | --- | --- | --- |
| Cosmos macOS arm64 | 50,405,344 B | 9,121 | `967b46294068ac5fe4ddb92ccfe03bf1238ddb50bd2eab5c05d8a2398d749933` |
| Cosmos macOS x64 | 51,486,652 B | 9,121 | `64b680cde94f68f7ba8253b0f721e640650c370c7bbe642a0ae17f4b629c3220` |

원본 실행 로그는 main이 수용한 `/tmp/tabularis-t0e-h-native-production-first.log`입니다.
실행에는 79.52초가 걸렸습니다.
이 경로는 당시의 로컬 증거 위치이며 checkout에 배포되는 artifact가 아닙니다.
최종 CI artifact에는 해당 실행에서 생성한 ZIP·checksum·release 원장·production 보고서를 따로 보관합니다.

## 아직 확인하지 않은 항목

| 항목 | 현재 상태 |
| --- | --- |
| Linux arm64 native runtime | Docker ARM64에서 패키지 launcher와 동봉 Node 실행 확인. Linux 데스크톱 설치 UI는 미관찰 |
| 실제 Azure account key·Entra 권한과 TLS | 인증·네트워크 허용 후 실행 필요 |
| 실제 Entra interactive·refresh | 미관찰 |
| 실제 Azure index policy | 관리자가 준비해야 하며 harness metadata에서 확인하지 못함 |
| 실제 Azure native cross-process continuation | 수동 harness 코드 준비, 인증·네트워크 허용 후 실제 실행 필요 |
| Cosmos 실제 Azure를 포함한 GUI·CLI·MCP parity | 공통 어댑터는 실제 PostGIS로 확인, Cosmos의 실제 Azure 실행은 보류 |
| Windows 수동 live harness owner ACL | 구현·합성 검사 완료, 실제 Windows PowerShell 실행은 미관찰 |

CI의 production smoke는 ZIP을 임시 fixture 경로에 extraction한 뒤 bundled launcher를 실행합니다.
이를 native host installer 실행으로 기록하지 않습니다.
T0e의 실제 installer 검사와 새 CI smoke의 범위가 다릅니다.

## 독립 checkout 검증

X1-C는 Node 24.21.0과 pnpm 10.30.3으로 한글·공백이 있는 새 임시 checkout을 검증했습니다.
기존 sibling 없이 snapshot에서 계약·SDK를 준비하고 frozen install과 계약·SDK·core·UI 빌드를 통과했습니다.
root와 UI typecheck도 통과했습니다.

bootstrap·CI 전용 검사 25개는 source SHA·lock·no-overwrite·pin·cache hash·YAML entrypoint를 확인했습니다.
최초 검사에서는 macOS realpath 별칭에 대한 test 기대값 한 건이 실패했습니다.
실제 canonical Python 경로를 기대하도록 교정한 뒤 25개가 모두 통과했으며 원본 실패 로그를 보존했습니다.

실행 로그는 `/tmp/tabularis-x1-c-bootstrap-first.log`와
`/tmp/tabularis-x1-c-isolated-*-first.log`에 있습니다.
이 위치는 로컬 실행 근거이며 저장소에 포함된 CI artifact가 아닙니다.

## 운영체제별 후속 실행

| 환경 | 관찰 결과 | GitHub Actions 실행 |
|---|---|---|
| Ubuntu 24.04 x64 | ZIP·bundled launcher를 포함한 native job 통과 | [실행 37194631990](https://github.com/hei5enbug/tabularis-azure/actions/runs/37194631990) |
| macOS Intel | ZIP·bundled launcher를 포함한 native job 통과 | [실행 37194631990](https://github.com/hei5enbug/tabularis-azure/actions/runs/37194631990) |
| Windows 2022 x64 | ZIP·bundled launcher를 포함한 native job 통과 | [실행 37194631990](https://github.com/hei5enbug/tabularis-azure/actions/runs/37194631990) |

위 세 job은 코드 commit `48308ecbda57fa5391db0e3c48f8f270d6f86aee`에서 모두 통과했다.

Linux ZIP 해제는 GNU tar 대신 `bsdtar`를 사용하도록 수정했다.
Windows에서는 native 경로의 표현 차이를 canonical path로 비교하고 ESM preload에 file URL을 전달한다.
runtime archive는 열린 파일로 tar의 표준 입력에 전달해 한글 경로를 보존하고, 목록의 CRLF도 처리한다.
보관 라이선스 원문은 `.gitattributes`로 줄바꿈 변환을 막아 고정 SHA를 유지한다.
UI metadata 검사는 필드가 실제로 표시될 때까지 기다린다.
후속 Intel 실행 `37192885995`에서는 큰 JSON의 내용 검사가 fixture의 1초 제한과 충돌했다.
해당 파일은 고정된 가상 시계를 사용하도록 바꿨으며 기존 38개 검사가 통과했다.
제품의 시간 제한과 별도 deadline 검사는 변경하지 않았다.
실패한 최초 CI와 수정 후 실행을 구분하며, Linux/macOS 통과로 Windows 통과를 대신하지 않는다.

호스트의 실제 GUI·CLI·MCP 공통 연결은 Spatial의 [최종 통합 기록](https://github.com/hei5enbug/tabularis-spatial/blob/main/docs/verification.md#최종-통합-실행-기록)에 있다.
그 검사는 PostGIS를 사용하며 실제 Cosmos 서비스 결과로 표시하지 않는다.

| 계획 요구 사항 | 구현·검증 상태 |
|---|---|
| C-R01 | 5개 대상의 패키징·bundled Node 구현 완료. ARM/Rosetta/Intel macOS·Linux x64·Windows x64와 Docker Linux arm64 launcher 실행 확인. Linux 데스크톱 설치 UI는 미관찰 |
| C-R02–C-R05 | 탐색·원본 JSON·문서 CRUD·페이지 코드와 unit/protocol/UI 검사 완료. 실제 Azure 권한 검증은 보류 |
| C-R06 | 교차 파티션 정렬·집계 구현과 synthetic 검사 완료. 실제 Azure 수용 검사는 보류 |
| C-R07–C-R09 | RU·429·ETag·취소·인증 경계 구현과 synthetic 검사 완료. 실제 Azure 인증 검증은 보류 |
| C-R10 | 단일 공통 계약·Rust 서비스·GUI/MCP/CLI 어댑터 구현 완료. 실제 Cosmos transport 비교는 Azure 검증과 함께 보류 |


## Azure CLI 소스 확인

2026-10-04에 공통 Rust 서비스의 실제 Cosmos 토큰 획득을 확인했다.
연결은 `entra_user` 모드를 유지하며 `auth_source: "azure_cli"`를 명시적으로 선택한다.
Cosmos 드라이버는 호스트의 transient Entra context를 기존 공식 SDK에 전달한다.
새 소스의 설정·토큰 전달 검사와 UI 선택 검사, TypeScript 검사, UI 빌드가 통과했다.

개발용 Azure 계정에서 읽기 전용 데이터베이스 메타데이터 조회는 HTTP 403으로 실패했다.
현재 사용자에게 직접 배정된 데이터 역할이 없었고 계정에는 IP 허용 목록이 있었다.
후속 읽기 전용 응답에서는 IP 방화벽에 따른 `network_access` 거부를 확인했다.
그룹을 통한 데이터 역할 적용 여부는 확인하지 못했으므로 읽기 권한이 없다고 단정하지 않는다.
네트워크 허용과 유효 데이터 권한 확인이 남아 있다. 역할과 방화벽은 변경하지 않았다.
계정 키는 조회하지 않았으며 실제 DB·문서의 생성·수정·삭제도 실행하지 않았다.
토큰·사용자 식별자·테넌트·구독·실제 리소스 설정은 Git 파일에 남기지 않았다.
이 확인은 교차 파티션 정렬·집계·페이지 재개·ETag·RU·429 수용 검사의 완료를 의미하지 않는다.

## 공식 0.26.0 기본 호환 경로

2026-10-06 공식 호스트용 읽기 전용 경로를 추가했다. UI 검사 123개와 build/typecheck가 통과했다.
최종 manifest·패키지·연결·호환·stdio 관련 검사 98개가 통과했다. Azure CLI 검사는 합성 토큰과 실행 어댑터를 사용했으며,
실제 로그인 캐시와 Azure 데이터 리소스는 읽거나 사용하지 않았다.

macOS ARM64의 실제 Tabularis 0.26.0에 설치했다. 첫 앱 실행에서 JSON 타입 선언에 필요한
`requires_length`가 빠진 오류를 관찰해 `requires_precision`과 `default_length`를 포함한 호스트 타입 계약을 반영했다.
metadata 응답과 패키징 검사에도 같은 필드를 적용하고 ZIP을 다시 생성했다.

최종 ZIP은 50,410,924 bytes·9,123 files이며 SHA256은
`32a0d2d7df7468d216aa278350ea6575e42fbef611f7f05b78d4d131bee7c853`다.
설치 전에 ZIP과 내부 원장의 모든 파일 해시를 확인했다. 공식 MCP 프로세스의 initialize와 tools/list도 통과했다.
이 검사는 실제 Azure DB 연결 성공을 의미하지 않는다.

[Building Plugins](https://tabularis.dev/wiki/building-plugins),
[Plugin Guide](https://github.com/TabularisDB/tabularis/blob/main/plugins/PLUGIN_GUIDE.md),
[연결 metadata](https://github.com/TabularisDB/tabularis/blob/main/plugins/CONNECTION_METADATA.md),
[SQL Server 플러그인](https://github.com/TabularisDB/tabularis-sqlserver-plugin)의 문서와 실제 0.26.0 소스를 대조했다.
기본 RPC 입력, 취소 notification, 읽기 전용 metadata, `extra`의 공개 설정과 비밀번호 저장 경로, UI 공개 API를 반영했다.
플러그인 `extra`에는 endpoint·database·container·공개 인증 선택만 저장하며 키와 토큰을 넣지 않는다.
SDK 문서 CRUD와 continuation은 공통 서비스가 있는 호스트에서만 활성화한다.

Plugin Center의 작업 슬롯은 targetPluginId로 구분하므로 해당 슬롯의 driver 필터를 제거했다. 후속 패키징 검사 59개가 통과했다.
공식 앱에서 두 플러그인 활성화를 확인했고, 실제 설치된 Cosmos 실행 파일의 initialize·읽기 전용 metadata·shutdown 응답도 확인했다.
이 metadata 검사는 합성 주소를 사용했으며 SDK 네트워크를 호출하지 않는다.

공식 앱에서 Cosmos 작업 공간 모달의 실제 표시를 확인했다. 설정에서 연 작업 공간은 열 때 활성화된 Cosmos 연결을 고정해 사용한다.
후속 UI 검사 6개와 build/typecheck가 통과했다. 유니코드 문서도 화면 샘플의 UTF-8 64 KiB 상한을 지킨다.
이전 저장소 이름 변경 CI의 설정 필드 기대값 불일치도 이번 metadata 검사에 반영했다.

## 후속 로컬 보완과 설치

공식 호스트의 Azure CLI 인증에서 Cosmos URL과 공식 Cosmos GUID audience를 모두 허용하도록 수정했다.
다른 서비스 audience와 잘못된 사용자·테넌트·만료 정보는 계속 거부한다.
core build와 해당 호환 검사 7개가 통과했다. 실제 Azure 데이터 조회를 반복하지 않았다.

Windows 수동 harness의 소유자·ACL 검사를 구현했다. 관련 합성 검사 38개가 통과했다.
설정 파일은 읽기 전후, report 임시 파일은 쓰기 전, 부모 디렉터리는 게시 전에 다시 검사한다.
현재 Mac의 합성 통과를 실제 Windows ACL 검증으로 기록하지 않는다.

후속 macOS ARM64 ZIP은 50,410,975 bytes·9,123 files이며 SHA256은
`fe6a6eb449c1ca5a4bbdc147561d29445a7ea5092b7eeb771898eb03aff8d58f`다.
내부 원장의 모든 파일 해시를 확인했다. bundled launcher의 initialize·연결 metadata·shutdown도 통과했다.
실제 공식 macOS ARM64 앱의 기존 설치를 이 ZIP으로 교체하고 활성화했다.

Linux ARM64 ZIP은 55,582,123 bytes·9,123 files이며 SHA256은
`aecd0d2e7a2dd52ef5124008fff1c7ac288a8fd61624ccbeeb609508830f4367`이다.
내부 원장의 모든 파일 해시를 확인했다. ARM64 Docker Linux에서 외부 네트워크를 끄고
PATH에 Node가 없는 상태로 initialize·합성 연결 metadata·shutdown을 실행했다.
응답 3개·exit 0·stderr 0 bytes·읽기 전용 metadata를 확인했다.
동봉 Node는 고정한 24.21.0이며 launcher는 캐시된 Rust 1.98.1로 빌드했다.
이 결과는 고정한 Rust 1.96.0의 CI 빌드나 Linux 데스크톱 UI 검사 통과를 의미하지 않는다.

[원격 실행 37370993970](https://github.com/hei5enbug/tabularis-azure/actions/runs/37370993970)의
실패 job은 계정 결제·사용 한도 때문에 시작되지 않았다. 이 실패를 코드 검사 실패로 기록하지 않는다.

커밋 대상의 추적 파일과 신규 파일을 Gitleaks 8.30.1로 검사해 탐지 0건을 확인했다.
Git 이력 검사도 탐지 0건이었다. 패키지·검사 보고서·실제 인증정보는 Git에 추가하지 않는다.

## 공개 전 보안 검사와 최신 공식 가이드 대조

2026-10-06 공개 대상 Git 파일과 전체 Git 이력을 다시 검사해 실제 비밀 값 탐지 0건을 확인했다.
원격에는 main 한 개만 있으며 태그·issue·PR·release는 없었다.
추적된 환경 파일·개인 키·자격 증명 파일도 없었다.
GitHub Actions 산출물 9개와 다운로드 가능한 실행 로그의 텍스트 및 ZIP 안의 텍스트도 검사했다.
공개 콘텐츠에서 실제 비밀 값을 발견하지 않았다. 로그가 없는 이전 실행 한 개는 job도 없었다.
원본 검사 보고서는 저장소 밖에 보관한다.

최신 공식 문서는 Tabularis main
[`c0fe758325e955d5f364bf3150ea0822c6591469`](https://github.com/TabularisDB/tabularis/tree/c0fe758325e955d5f364bf3150ea0822c6591469) 기준이다.
[Building Plugins](https://tabularis.dev/wiki/building-plugins),
[Plugin Guide](https://github.com/TabularisDB/tabularis/blob/c0fe758325e955d5f364bf3150ea0822c6591469/plugins/PLUGIN_GUIDE.md),
연결 metadata 문서·튜토리얼과 공식 SQL Server 플러그인 README를 대조했다.

| 확인 항목 | 결과 |
|---|---|
| 패키지·최소 버전 | 패키저가 `.tabularium`과 OS별 실행 파일을 생성한다. 기본 최소 버전은 0.26.0이며 실제 공식 앱 설치를 확인했다. |
| 기본 RPC | JSON-RPC 2.0을 줄 단위로 읽고 응답한다. initialize·EOF·표준 취소 알림을 처리하고 취소 알림에는 응답하지 않는다. 실행 중에도 stdin을 계속 읽는다. |
| 연결·비밀 | 공식 `params.params` 입력과 connection metadata 계약을 사용한다. `extra`의 비밀 필드는 거부한다. 기본 계정 키는 호스트 비밀번호 경로를, 전체 기능의 비밀은 transient 인증 전달을 사용한다. 원본 SDK 오류와 로그는 노출하지 않는다. |
| UI 번들·슬롯 | IIFE 전역·default export·React/JSX/plugin API 외부화를 사용한다. 선언한 다섯 슬롯은 공식 목록에 있으며 같은 module을 재사용할 수 있다. Tauri를 직접 import하거나 호출하지 않는다. |
| 기본 기능과 확장 기능 | 공식 호스트는 읽기 전용 기본 경로를 제공한다. `service_protocol`과 문서·페이지 capability는 수정 호스트 전용이며 실제 서비스 API 제공 여부로 전체 기능을 선택한다. |

로케일 파일과 `defineSlot`은 선택 사항이다. 현재의 legacy slot props 형식은 가이드에서 계속 지원한다.
live 레지스트리 스키마 조회는 HTTP 403으로 실패했으므로 확장 매니페스트 필드의 레지스트리 수용 여부는
확인하지 못했다. 공식 앱의 직접 설치 결과와 레지스트리 승인을 구분한다.

이번 수정은 README·빌드 안내·검증 기록과 Actions 실행 조건에 한정했다.
워크플로는 `workflow_dispatch`만 사용하고 `contents: read`를 유지한다.
YAML을 파싱해 수동 실행 조건을 확인했다. 제품 코드와 기존 검사 입력이 바뀌지 않아 전체 테스트는 반복하지 않았다.
