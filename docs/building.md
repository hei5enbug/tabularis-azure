# 독립 checkout에서 빌드하기

이 안내는 Cosmos 저장소 하나에서 빌드하고 현재 OS용 생산 ZIP을 만드는 방법을 설명합니다.

## 고정 빌드 입력

| 입력 | 고정값 |
| --- | --- |
| Node | `24.21.0` |
| pnpm | `10.30.3` |
| Rust | `1.96.0` |
| 공식 Cosmos SDK | `4.10.1` |
| 최소 host runtime | 기본 조회 `0.26.0`, 전체 서비스 `0.26.1-spatial.1` |
| service protocol / 공개 SDK API | `1` / `0.2.0` |

`build-support/host`는 canonical host의 tracked 빌드 입력 128개를 그대로 보관합니다.
root의 package·workspace·lock·LICENSE와 tracked `packages/**`만 포함하며 host binary는 포함하지 않습니다.
`build-support/provenance.json`에는 각 파일의 크기와 SHA256, upstream URL과 아래 revision이 있습니다.

- upstream base: `b78a40946f072f6b8f2f1a4c80c1e04ff9b54cd4`
- host source: `a10ba47979320766f0cb706afd48e6cecd7331e8`

schema나 SDK를 이 복사본에서 수정하지 마세요.
canonical host 변경을 수용할 때 출처와 모든 파일 SHA를 함께 갱신해야 합니다.

## bootstrap 실행

고정된 Node와 pnpm이 현재 shell에서 실행되도록 준비한 뒤 Cosmos checkout에서 실행합니다.

```sh
pnpm bootstrap
pnpm typecheck
pnpm --dir ui typecheck
pnpm test:bootstrap
pnpm test:unit
pnpm test:protocol
pnpm test:ui
```

bootstrap은 먼저 sibling `../tabularis-host`를 확인합니다.
없으면 검증한 snapshot을 자신이 만든 임시 디렉터리에서 준비한 뒤 발행합니다.
있으면 tracked 계약·SDK source의 SHA를 확인하고 재사용합니다.
불일치하거나 다른 실행의 `.tabularis-host-bootstrap.lock`이 있으면 명확히 실패합니다.
lock을 자동 삭제하거나 기존 sibling을 교체하지 않습니다.

계약·SDK filtered install과 Cosmos root·UI install에는 `--frozen-lockfile --ignore-scripts`를 사용합니다.
공개 의존성 다운로드에는 private 저장소 접근이나 PAT가 필요하지 않습니다.
bootstrap은 lockfile을 바꾸지 않습니다.

## 현재 OS용 ZIP 만들기

launcher는 Rust로 빌드합니다.

```sh
cargo build --locked --release --manifest-path launcher/Cargo.toml
```

공식 `nodejs.org/dist/v24.21.0/` archive와
`scripts/package/pins.mjs`의 SHA256이 일치해야 합니다.
아래 경로는 실제 절대 경로로 바꿔주세요.
output 부모 디렉터리는 미리 만들고 기존 output 파일은 사용하지 않습니다.

```sh
node scripts/package/cli.mjs \
  --platform darwin --arch arm64 \
  --source /absolute/tabularis-azure \
  --launcher /absolute/target/release/tabularis-azure-launcher \
  --runtime-archive /absolute/node-v24.21.0-darwin-arm64.tar.gz \
  --output /absolute/output/cosmos-nosql.zip \
  --tar /usr/bin/tar
```

Linux는 `--platform linux`와 native arch를 사용합니다.
ZIP과 tar.gz를 모두 읽는 `/usr/bin/bsdtar`가 필요합니다. Ubuntu에서는 `libarchive-tools`를 설치합니다.
Windows x64는 `--platform win32 --arch x64`, launcher `.exe`, `node-v24.21.0-win-x64.zip`을 사용합니다.
Windows tar는 `%SystemRoot%\System32\tar.exe`의 절대 경로를 전달합니다.
ZIP과 `.sha256` 파일이 발행되며 ZIP 내부 `release.json`에 파일별 크기·SHA와 runtime pin이 있습니다.
앱을 종료하고 검증한 ZIP의 모든 파일을 아래 폴더에 압축 해제합니다. 이전 설치본은 별도 폴더에 백업합니다.

| OS | 설치 폴더 |
| --- | --- |
| macOS | `~/Library/Application Support/tabularis/plugins/drivers/cosmos-nosql/` |
| Linux | `~/.local/share/tabularis/plugins/drivers/cosmos-nosql/` |
| Windows | `%APPDATA%\tabularis\plugins\drivers\cosmos-nosql\` |

앱을 다시 열고 설정의 Plugins에서 `cosmos-nosql`을 활성화합니다.
동봉 launcher와 Node 실행 권한을 보존해야 합니다.
공식 host `0.26.0`부터 기본 읽기 전용 경로를 지원합니다.
공통 서비스가 필요한 기능은 실제 host API 제공 여부를 확인해 활성화합니다.

## native CI

`.github/workflows/bootstrap.yml`은 push·pull request·수동 실행에서 동작하도록 등록했습니다.
Ubuntu 24.04, Windows 2022, macOS 15 Intel에서 각 native x64를 검사합니다.
이 문서를 작성할 때 GitHub CI는 아직 실행하지 않았습니다.

CI는 공식 Node archive 다섯 개를 SHA로 검증하고 archive extraction 검사를 모두 수행합니다.
실제 bundled runtime 실행과 생산 ZIP smoke는 해당 runner의 native x64 하나만 수행합니다.
이는 다섯 OS·arch의 runtime을 모두 실행했다는 뜻이 아닙니다.

install 검사에는 다음 절대 경로를 전달합니다.

| 환경 변수 | 값 |
| --- | --- |
| `TABULARIS_C3B_TEST_LAUNCHER` | 현재 OS의 release launcher |
| `TABULARIS_C3B_TEST_NODE_ARCHIVE` | 현재 OS·arch의 공식 archive |
| `TABULARIS_C3B_TEST_PYTHON` | 실제 Python executable |
| `TABULARIS_C3B_TEST_NODE_CACHE` | 다섯 검증 archive가 있는 전용 cache |

CI는 ZIP·checksum·release 원장·production 보고서를 artifact로 업로드합니다.
설치 smoke의 임시 extraction은 native host installer 실행과 구분합니다.
