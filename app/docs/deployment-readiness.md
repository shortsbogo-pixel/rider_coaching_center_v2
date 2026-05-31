# Deployment Readiness

## 현재 상태

라이더 코칭센터 Ver.2는 쿠팡플러스 전용 모바일 웹앱 베타이다.

현재 구현 범위는 다음과 같다.

- 관리자 엑셀 업로드, 파싱, 검수 미리보기
- 관리자가 확정한 최신 주차 데이터의 앱 내부 반영
- 관리자 대시보드, 검수, 코칭, 운영 로그
- 관리자 페이스 체크 설정
- 기존 정산앱으로 이동하는 외부 링크 안내
- 라이더 본인 데이터 화면과 오늘의 페이스 체크
- 베타 안내와 테스트 계정 안내

아직 실제 DB, Supabase, 서버 저장, 외부 API, 문자 발송, GPS/날씨, 실제 음악 재생은 연결하지 않았다. 정산앱 링크는 별도 정산앱으로 이동하는 단순 외부 링크이며, 정산 계산이나 정산 엑셀 파싱, 정산 데이터 연동은 하지 않는다.

## 배포 전 필수 명령

`app` 폴더에서 실행한다.

```bash
npm test
npm run lint
npm run build
```

현재 Next.js 앱의 production build 명령은 `npm run build`이며, 내부적으로 `next build`를 실행한다.

이 프로젝트는 Vite가 아니라 Next.js App Router 앱이다. Node.js 기반 배포 환경에서는 `npm run build` 후 `npm run start`로 production 서버를 실행할 수 있다. 정적 export 전용 배포를 사용하려면 별도 `output: "export"` 검토가 필요하므로 현재 베타 기본안은 아니다.

로컬 개발 서버는 아래 명령으로 실행한다.

```bash
npm run dev
```

로컬 개발 서버는 개발 확인용이며, 외부 배포 URL과 다르다. 외부 배포에서는 배포 플랫폼이 의존성을 설치하고 production build를 실행한 뒤 정적 자산과 Next.js 실행 산출물을 제공한다.

## 배포 포함 기준

배포 대상은 `app` 폴더의 Next.js 애플리케이션 소스와 설정 파일이다.

포함 후보:

- `src/`
- `public/`
- `docs/`
- `package.json`
- `package-lock.json`
- `next.config.ts`
- `tsconfig.json`
- `postcss.config.mjs`
- `eslint.config.mjs`
- `.gitignore`
- `README.md`

## 배포 제외 파일

아래 파일과 폴더는 배포 소스 또는 커밋에 포함하지 않는다.

- `.env`, `.env.local`, `.env.*`
- `node_modules/`
- `.next/`
- `out/`
- `build/`
- `coverage/`
- `.vercel/`
- `dev-server.out.log`
- `dev-server.err.log`
- `.verification/`
- 원천 엑셀 파일
- CSV 파일
- DB 파일
- 업로드 파일 저장 폴더
- 상위 폴더의 `_sample_excel/`
- 상위 폴더의 `_ver1_reference/`

현재 `.gitignore`는 `node_modules`, `.next`, `out`, `build`, `coverage`, `.env*`, `.vercel`, 개발 로그, 검증 임시 폴더, 엑셀/CSV/DB 원천 파일, `uploads/`를 제외하도록 설정되어 있다.

## 개인정보와 원천 파일 주의

- 원천 엑셀 파일 바이너리는 코드나 배포물에 포함하지 않는다.
- 브라우저 `File` 객체나 ArrayBuffer를 저장하지 않는다.
- 현재 업로드 데이터는 브라우저 세션 또는 앱 내부 상태 기준이다.
- 새로고침 후에는 업로드 데이터가 사라질 수 있으며, 화면 안내대로 다시 업로드해야 한다.
- 실제 라이더 개인정보, 전화번호, 정산 원본, 계좌 정보, DB 비밀번호를 커밋하거나 배포하지 않는다.

## 베타 테스트 전 확인 항목

- 정상 엑셀 파일 선택 가능
- 정산/최종 파일 차단
- 오더별 상세 내역서 시트 누락 오류 표시
- 미리보기 생성 후 바로 앱 전체에 반영되지 않음
- 이번 주차 데이터로 반영 후 관리자/라이더 화면 변경
- 잘못된 파일 선택 후 기존 정상 반영 데이터 유지
- 관리자 검수 숫자와 이슈 유형 확인
- 관리자 코칭 메시지 확인
- 관리자 운영 로그 확인
- 관리자 페이스 체크 설정 변경
- 라이더 MY와 관리자 더보기의 정산앱 링크 안내 확인
- 라이더 계정에서 본인 데이터만 표시
- 라이더 오늘의 페이스 체크 입력
- 승인대기 계정 접근 제한
- 360px 모바일 폭에서 하단 메뉴와 카드가 겹치지 않음

상세 절차는 `app/docs/beta-test-checklist.md`를 기준으로 확인한다.

## 테스트 계정 안내

현재 베타 테스트 계정 안내는 `src/lib/beta.ts`의 `showTestAccounts` 플래그로 노출된다.

운영 배포 전 숨김 처리 방법:

1. `src/lib/beta.ts`에서 `betaMode` 또는 `showTestAccounts`를 `false`로 변경한다.
2. 로그인 화면에서 테스트 계정 카드가 보이지 않는지 확인한다.
3. 실제 인증 시스템이 붙기 전까지 운영 환경에는 테스트 계정 안내를 노출하지 않는다.

현재는 실제 인증 시스템이 아니며, 베타 화면 흐름 확인용 mock 로그인이다.

## 배포 방식 후보

### Manus 임시 배포

장점:

- 빠르게 외부 URL을 만들어 내부 베타 사용자에게 공유하기 좋다.
- 앱 실행과 테스트 확인을 한 환경에서 진행하기 쉽다.
- 단기 베타 데모와 피드백 수집에 적합하다.

주의점:

- 장기 운영, 권한, 로그 보존, 도메인/보안 정책은 별도 검토가 필요하다.
- 현재 앱의 데이터는 세션 상태 중심이므로 새로고침 또는 재배포 후 데이터가 유지되지 않을 수 있다.
- 원천 엑셀 파일을 런타임 저장소에 남기지 않는 절차를 유지해야 한다.

추천:

- 현재 소규모 베타에는 Manus 임시 배포가 가장 빠르다.
- 단, 실제 라이더 개인정보나 정산 원본 파일을 올리지 않는 조건으로 제한한다.

### Vercel

장점:

- Next.js에 가장 자연스러운 배포 후보이다.
- Git 기반 preview/production 흐름을 만들기 쉽다.
- Next.js 앱은 Vercel에서 framework preset과 build 기본값이 자동 감지되는 편이다.

주의점:

- 테스트 계정 안내를 운영 전 숨겨야 한다.
- 외부 URL 공유 시 누구나 접근할 수 있으므로 인증/접근 제한 전략이 필요하다.
- 향후 DB/Supabase 연결 시 환경변수와 secret 관리가 필요하다.

추천:

- 베타가 길어지거나 고정 URL, preview 배포, 접근 제한이 필요해지면 Vercel을 검토한다.

### Cloudflare Pages / Workers

장점:

- 정적 사이트와 글로벌 배포에 강점이 있다.
- Cloudflare 생태계의 접근 제어, DNS, 캐시 정책과 연결하기 쉽다.

주의점:

- 현재 앱은 일반 Next.js App Router 앱이며 정적 export 설정을 따로 하지 않았다.
- Cloudflare Pages의 static Next.js 가이드는 build directory로 `out`을 사용하는 정적 export 흐름을 전제로 한다.
- Cloudflare Workers 기반 Next.js 배포는 별도 어댑터/런타임 검토가 필요할 수 있다.

추천:

- 현재 베타에서는 우선순위를 낮춘다.
- 완전 정적 export 또는 Cloudflare Workers 운영 방식을 확정한 뒤 재검토한다.

## 현재 추천안

1. 내부 소규모 베타: Manus 임시 배포 또는 로컬 네트워크 시연
2. 고정 preview URL이 필요한 베타: Vercel preview 배포
3. 정식 운영 전: 인증, DB 저장, 개인정보 정책, 원천 파일 미저장 정책 확정 후 Vercel 또는 별도 Node.js 호스팅 검토

## 참고 공식 문서

- Vercel Builds: https://docs.vercel.com/docs/builds
- Next.js Deploying: https://nextjs.org/docs/app/getting-started/deploying
- Cloudflare Pages Next.js static guide: https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/
- Manus overview: https://www.manus.you/
