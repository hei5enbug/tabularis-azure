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
| Ubuntu·Windows·macOS Intel의 GitHub native CI | workflow 등록, 아직 실행하지 않음 |
| Linux arm64 native runtime | 실행하지 않음 |
| 실제 Azure account key·Entra 권한과 TLS | 사용자 지시에 따라 실행 보류 |
| 실제 Entra interactive·refresh | 미관찰 |
| 실제 Azure index policy | 관리자가 준비해야 하며 harness metadata에서 확인하지 못함 |
| 실제 Azure native cross-process continuation | 수동 harness 코드 준비, 실제 실행 보류 |
| 실제 전체 GUI·CLI·MCP host parity | 별도 통합 검증 필요 |
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
