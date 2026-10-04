# 관찰한 검증과 남은 범위

이 기록은 실행한 검사와 아직 실행하지 않은 검사를 구분합니다.
mock 통과는 실제 Azure 권한·TLS·Entra 동작의 증거가 아닙니다.

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
| Windows GitHub native CI 최종 실행 | 런처·core는 통과, Windows ESM preload 경로 수정 뒤 전체 job 확인 중 |
| Linux arm64 native runtime | 실행하지 않음 |
| 실제 Azure account key·Entra 권한과 TLS | 사용자 지시에 따라 실행 보류 |
| 실제 Entra interactive·refresh | 미관찰 |
| 실제 Azure index policy | 관리자가 준비해야 하며 harness metadata에서 확인하지 못함 |
| 실제 Azure native cross-process continuation | 수동 harness 코드 준비, 실제 실행 보류 |
| Cosmos 실제 Azure를 포함한 GUI·CLI·MCP parity | 공통 어댑터는 실제 PostGIS로 확인, Cosmos의 실제 Azure 실행은 보류 |
| Windows 수동 live harness owner ACL | 미구현으로 명시적 거부 |

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
| Ubuntu 24.04 x64 | ZIP·bundled launcher를 포함한 native job 통과 | [실행 37192427616](https://github.com/hei5enbug/tabularis-cosmos/actions/runs/37192427616) |
| macOS Intel | ZIP·bundled launcher를 포함한 native job 통과 | [실행 37191589019](https://github.com/hei5enbug/tabularis-cosmos/actions/runs/37191589019) |
| Windows 2022 x64 | Rust 런처·core 통과. protocol 검사에서 preload 경로 문제를 확인해 수정 | [실행 37192885995](https://github.com/hei5enbug/tabularis-cosmos/actions/runs/37192885995) |

Linux ZIP 해제는 GNU tar 대신 `bsdtar`를 사용하도록 수정했다.
Windows에서는 native 경로의 표현 차이를 canonical path로 비교하고 ESM preload에 file URL을 전달한다.
후속 Intel 실행 `37192885995`에서는 큰 JSON의 내용 검사가 fixture의 1초 제한과 충돌했다.
해당 파일은 고정된 가상 시계를 사용하도록 바꿨으며 기존 38개 검사가 통과했다.
제품의 시간 제한과 별도 deadline 검사는 변경하지 않았다.
실패한 최초 CI와 수정 후 실행을 구분하며, Linux/macOS 통과로 Windows 통과를 대신하지 않는다.

호스트의 실제 GUI·CLI·MCP 공통 연결은 Spatial의 [최종 통합 기록](https://github.com/hei5enbug/tabularis-spatial/blob/main/docs/verification.md#최종-통합-실행-기록)에 있다.
그 검사는 PostGIS를 사용하며 실제 Cosmos 서비스 결과로 표시하지 않는다.

| 계획 요구 사항 | 구현·검증 상태 |
|---|---|
| C-R01 | 5개 대상의 패키징·bundled Node 구현 완료. ARM/Rosetta/Intel macOS와 Linux x64 실행 확인, Windows 최종 CI 확인 중 |
| C-R02–C-R05 | 탐색·원본 JSON·문서 CRUD·페이지 코드와 unit/protocol/UI 검사 완료. 실제 Azure 권한 검증은 보류 |
| C-R06 | 교차 파티션 정렬·집계 구현과 synthetic 검사 완료. 실제 Azure 수용 검사는 보류 |
| C-R07–C-R09 | RU·429·ETag·취소·인증 경계 구현과 synthetic 검사 완료. 실제 Azure 인증 검증은 보류 |
| C-R10 | 단일 공통 계약·Rust 서비스·GUI/MCP/CLI 어댑터 구현 완료. 실제 Cosmos transport 비교는 Azure 검증과 함께 보류 |
