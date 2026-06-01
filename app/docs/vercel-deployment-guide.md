# Vercel Deployment Guide

## 링크 운영 정책 참조

정산앱과 코칭센터의 양방향 링크 운영 절차는 `app/docs/settlement-coaching-link-policy.md`를 기준으로 확인한다.

- Vercel 배포 URL이 변경되면 정산앱 관리자 모드의 코칭센터 URL 설정을 갱신한다.
- 정산앱 URL이 변경되면 코칭센터 `SETTLEMENT_WEB_URL` 상수 수정 후 Vercel에 다시 배포한다.
- 양방향 링크는 데이터 연동이 아니라 새 탭 또는 새 창으로 이동하는 외부 링크다.

## 목적

라이더 코칭센터 Ver.2를 Manus 임시 배포뿐 아니라 Vercel Preview/Production 배포 후보로도 검토할 수 있도록 현재 준비 상태와 배포 전 확인 절차를 정리한다.

이번 문서는 배포 준비 점검용이다. 기능 로직, DB 연결, Supabase 연결, 외부 API 연결은 추가하지 않는다.

## 현재 앱 구조

현재 repository의 실제 Next.js 앱 루트는 `app` 폴더이다.

Vercel에서 프로젝트를 만들 때는 Project Settings의 Root Directory를 아래처럼 설정한다.

```text
app
```

Root Directory를 `app`으로 설정해야 Vercel이 `app/package.json`, `app/next.config.ts`, `app/src/`를 기준으로 Next.js 앱을 감지한다. Vercel의 Root Directory 설정은 앱이 그 디렉터리 밖 파일에 접근하지 않는 구조이므로, 상위 폴더의 `_sample_excel/`, `_ver1_reference/`, `_docs/`, `_prototype/`는 배포 대상에 포함하지 않는다.

## Vercel 프로젝트 설정 권장값

| 항목 | 권장값 | 메모 |
| --- | --- | --- |
| Framework Preset | `Next.js` | Vercel 자동 감지를 사용한다. |
| Root Directory | `app` | 이 repo에서는 필수 설정이다. |
| Install Command | 기본값 | `package-lock.json` 기준 npm 설치를 사용한다. |
| Build Command | `npm run build` | `package.json`의 `build` script가 `next build`를 실행한다. |
| Output Directory | 기본값 | Next.js 감지 시 Vercel이 자동 설정하므로 override하지 않는다. |
| Development Command | 기본값 | 로컬 확인은 `npm run dev`를 사용한다. |

정적 export 전용 배포가 아니므로 Output Directory를 `out`으로 지정하지 않는다.

## package.json scripts 확인

현재 `app/package.json`의 주요 script는 아래와 같다.

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "vitest run"
}
```

Vercel은 Next.js 프로젝트에서 `build` script가 있으면 이를 사용해 빌드할 수 있다. 로컬에서도 Vercel 배포 전 아래 명령이 통과해야 한다.

```bash
npm test
npm run lint
npm run build
```

## 배포 제외 확인

아래 파일과 폴더는 커밋 또는 Vercel 배포 소스에 포함하지 않는다.

- `.env`, `.env.local`, `.env.*`
- `node_modules/`
- `.next/`
- `out/`
- `build/`
- `coverage/`
- `.vercel/`
- `dev-server*.log`
- `.verification/`
- 원천 엑셀 파일: `*.xlsx`, `*.xls`
- CSV 파일: `*.csv`
- DB 파일: `*.db`, `*.sqlite`
- `uploads/`
- 상위 폴더의 `_sample_excel/`
- 상위 폴더의 `_ver1_reference/`

현재 `app/.gitignore`는 앱 내부에서 발생 가능한 위 개발 산출물과 원천 데이터 확장자를 제외하도록 설정되어 있다.

## 환경 변수와 테스트 계정

현재 앱은 Vercel 환경 변수가 필요하지 않다.

베타 테스트 계정 안내는 `src/lib/beta.ts`의 `betaMode`와 `showTestAccounts` 기준으로 표시된다.

현재 기본값:

```ts
export const betaMode = true;
export const showTestAccounts = betaMode;
```

이 값은 한 파일에서만 관리한다. 베타 공개 중에는 테스트 계정 안내를 표시할 수 있고, 운영 공개 전에는 `showTestAccounts`를 `false`로 바꾸면 로그인 화면의 테스트 계정 카드를 숨길 수 있다.

운영 배포 전 숨김 절차:

1. `src/lib/beta.ts`에서 `betaMode` 또는 `showTestAccounts`를 `false`로 변경한다.
2. 로그인 화면에서 테스트 계정 카드가 사라졌는지 확인한다.
3. `npm test`, `npm run lint`, `npm run build`를 다시 실행한다.

현재 로그인은 실제 인증 시스템이 아니라 베타 흐름 확인용 mock 로그인이다. 외부 URL을 공유하는 경우 접근 대상과 테스트 기간을 제한해야 한다.

## 정산앱 링크 설정

정산앱 URL은 `src/lib/settlement-link.ts`의 `SETTLEMENT_WEB_URL` 한 곳에서만 관리한다.

현재 설정값:

```ts
export const SETTLEMENT_WEB_URL = "https://ridersettle-fmyozrbw.manus.space/";
```

확인 기준:

- 라이더 MY 화면의 `정산앱 열기` 버튼이 새 탭 또는 새 창으로 열린다.
- 관리자 더보기 화면의 `정산 관리 앱 열기` 버튼이 새 탭 또는 새 창으로 열린다.
- 링크는 `target="_blank"`와 `rel="noopener noreferrer"`를 유지한다.
- 코칭센터는 정산앱으로 이동하는 링크만 제공한다.
- 정산 계산, 지급, 확정, 상세 원장, 인증과 권한은 기존 정산앱에서 처리한다.

## 데이터 유지 방식

현재 업로드 데이터는 DB나 서버 저장소에 저장하지 않는다.

- 브라우저에서 선택한 원천 엑셀 파일을 파싱한다.
- 원천 엑셀 파일 바이너리와 브라우저 `File` 객체는 저장하지 않는다.
- 최신 업로드 주차 데이터는 앱 내부 상태 기준으로 반영된다.
- 새로고침, 재배포, 브라우저 세션 변경 후에는 다시 업로드가 필요할 수 있다.
- 화면에는 새로고침 후 재업로드가 필요할 수 있다는 안내를 유지한다.

Vercel 배포는 앱을 외부 URL에서 실행하게 해줄 뿐, 현재 단계에서 데이터 영속성을 제공하지 않는다. 지속 저장이 필요해지면 별도 DB/Supabase/서버 저장 설계를 승인 후 진행한다.

## 현재 의도적으로 제외한 기능

- DB 저장
- Supabase 연결
- 외부 API 연결
- 서버 저장
- 실제 인증 시스템
- 원천 엑셀 파일 저장
- 정산 계산
- 정산 엑셀 파싱
- 정산앱 데이터 연동
- 실시간 콜 연동
- 현재 위치 확인
- GPS/날씨
- 실제 음악 재생
- 문자 발송
- 타 플랫폼 확장

정산앱은 별도 시스템이며 코칭센터는 정산앱으로 이동하는 링크만 제공한다. 정산 계산, 지급, 확정은 기존 정산앱 기준이다.

## 배포 전 체크리스트

- [ ] Root Directory가 `app`으로 설정되어 있다.
- [ ] Framework Preset이 `Next.js`로 감지된다.
- [ ] Build Command가 `npm run build`로 동작한다.
- [ ] Output Directory override를 설정하지 않았다.
- [ ] `.env`, 원천 엑셀/CSV/DB, `node_modules`, `.next`가 커밋되지 않았다.
- [ ] 테스트 계정 안내 노출 여부를 결정했다.
- [ ] 업로드 데이터가 in-memory/session 기준임을 베타 참여자에게 안내했다.
- [ ] 정산/최종 엑셀 파일 업로드 차단 정책이 유지된다.
- [ ] DB/Supabase/외부 API 연결이 추가되지 않았다.
- [ ] `npm test`, `npm run lint`, `npm run build`가 통과했다.

## 베타 공개 전 대표 확인 체크리스트

계정:

- [ ] 로그인 화면의 베타 안내 문구가 보인다.
- [ ] 테스트 계정 노출 여부를 결정했다.
- [ ] `admin / admin1234`로 관리자 화면에 진입된다.
- [ ] `rider1 / rider1234`로 라이더 화면에 진입된다.
- [ ] `pending / pending1234`는 승인 대기 화면만 보인다.

업로드:

- [ ] 정상 엑셀 파일 선택 후 미리보기가 생성된다.
- [ ] 미리보기만 생성된 상태에서는 대시보드 기준 데이터가 바뀌지 않는다.
- [ ] `이번 주차 데이터로 반영` 후 대시보드, 검수, 코칭, 라이더 화면이 바뀐다.
- [ ] 정산/최종 파일은 업로드 차단된다.
- [ ] 잘못된 파일 선택 후 기존 정상 반영 데이터가 유지된다.

링크:

- [ ] 라이더 MY 화면에서 정산앱 안내와 `정산앱 열기` 버튼이 보인다.
- [ ] 관리자 더보기 화면에서 정산 관리 앱 안내와 `정산 관리 앱 열기` 버튼이 보인다.
- [ ] 정산앱 링크가 새 탭 또는 새 창으로 열린다.
- [ ] 정산앱 링크는 데이터 연동이 아니라 단순 이동 기능임을 확인했다.

새로고침:

- [ ] 업로드 데이터는 in-memory/session 기준이라는 안내가 보인다.
- [ ] 새로고침 또는 재배포 후 다시 업로드가 필요할 수 있음을 테스트 참여자에게 안내했다.

모바일:

- [ ] 360px 폭에서 하단 5개 메뉴가 겹치지 않는다.
- [ ] 관리자 더보기와 라이더 MY의 정산앱 카드가 잘리지 않는다.
- [ ] 라이더 내현황에서 오늘의 페이스 체크와 다음 추천 행동이 먼저 보인다.

## 배포 후 확인

Vercel Preview URL에서 아래만 확인한다.

- 로그인 화면과 베타 안내
- 관리자 업로드 화면 접근
- 정상 엑셀 파일 선택, 미리보기, 이번 주차 데이터 반영
- 정산/최종 파일 차단
- 관리자 대시보드/검수/코칭/더보기 표시
- 라이더 내현황/내오더/내지도/내코칭/MY 표시
- 라이더 본인 데이터만 표시
- 새로고침 후 재업로드 안내
- 360px 모바일 폭에서 하단 메뉴와 카드 겹침 없음

## 참고 공식 문서

- Vercel Builds: https://vercel.com/docs/builds
- Vercel Configuring a Build: https://vercel.com/docs/builds/configure-a-build
- Next.js on Vercel: https://vercel.com/docs/frameworks/full-stack/nextjs
- Next.js Deploying: https://nextjs.org/docs/app/getting-started/deploying
