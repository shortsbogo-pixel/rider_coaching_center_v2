# DB / Supabase Storage Design

## 목적

라이더 코칭센터 Ver.2가 현재 브라우저 세션 상태에서 동작하는 구조를 유지하되, 향후 베타/정식 운영에서 Supabase/PostgreSQL 저장 구조로 전환할 때 필요한 데이터 모델과 운영 원칙을 정리한다.

이번 단계에서는 실제 DB 연결, Supabase 설치, API 연결, 인증 구현을 하지 않는다. 이 문서는 설계 기준이며, 코드는 별도 저장 모델 타입까지만 추가한다.

## 현재 범위

현재 앱은 쿠팡플러스 전용이다. 배민플러스, 바로고, 꼬르륵 등 타 플랫폼 확장은 이번 설계 범위에서 제외한다.

현재 데이터 흐름:

1. 관리자가 브라우저에서 원천 엑셀 파일을 선택한다.
2. 브라우저에서 파일명, 시트, 행, 필수값을 검수한다.
3. 정규화된 오더와 라이더별 집계를 미리보기로 보여준다.
4. 관리자가 `이번 주차 데이터로 반영`을 누르면 앱 내부 상태에 최신 주차 데이터가 반영된다.
5. 새로고침, 재배포, 세션 변경 후에는 다시 업로드가 필요할 수 있다.

DB 도입 후 바뀌는 점:

- 최신 반영 주차 데이터가 DB에서 로드된다.
- 업로드 이력과 운영 로그가 세션이 아닌 서버 저장 기준으로 남는다.
- 라이더는 로그인 후 본인 `rider_id` 데이터만 조회한다.
- 새로고침 후에도 마지막 반영 주차를 다시 불러올 수 있다.
- 단, 원천 엑셀 파일 자체는 계속 저장하지 않는다.

## 추천 DB 후보

우선 후보는 Supabase/PostgreSQL이다.

이유:

- PostgreSQL 테이블과 제약 조건으로 주차별 데이터 정합성을 관리하기 좋다.
- Supabase Auth와 RLS를 붙이면 관리자/라이더 권한 분리에 적합하다.
- 주차별 업로드, 코칭 메시지, 운영 로그처럼 관계형 데이터가 많다.
- 추후 백업, 감사 로그, 관리자 권한 관리, 인덱스 최적화를 적용하기 쉽다.

주의:

- 개인정보와 운행 데이터가 저장되므로 RLS, 접근 로그, 백업 정책을 먼저 확정해야 한다.
- 원천 엑셀 파일 업로드 저장소를 만들면 안 된다.
- 서버 측 파싱으로 이동할 경우 `xlsx` 취약점과 파일 크기 제한, 타임아웃, 샌드박스가 별도 검토 대상이다.

## 단계별 저장 방식

| 단계 | 저장 방식 | 목적 | 전환 기준 |
| --- | --- | --- | --- |
| MVP/개발 | in-memory/session | 화면 흐름과 엑셀 파싱 검증 | 현재 단계 |
| 소규모 베타 | 제한된 server JSON store 또는 Supabase 개발 프로젝트 | 새로고침 후 데이터 유지, 운영자 테스트 | 실제 외부 베타 사용자가 반복 접속할 때 |
| 정식 운영 | Supabase/PostgreSQL + Auth + RLS | 권한 분리, 데이터 보존, 감사 로그, 백업 | 라이더 외부 접속과 운영 데이터 보존이 필요할 때 |

## 저장해야 할 데이터

- 사용자 계정: 관리자, 라이더, 승인대기, `rider_id`, 이름, 승인 상태
- 업로드 주차 정보: `week_code`, `week_label`, `source_file_name`, `uploaded_at`, `uploaded_by`, `applied_at`
- 정규화된 오더 데이터: `week_code`, `rider_id`, `rider_name`, `order_no`, `delivery_type`, `peak_time`, `pickup_area`, `dropoff_area`, `completed_at`, `distance`, `settlement_amount`
- 라이더별 주간 집계: 완료건수, 출근횟수, 멀티비율, `Post_Lunch`/`Post_Dinner` 참여율, 배차 친화 점수
- 코칭 메시지: 자동 메시지, 관리자 수정 메시지, 노출 ON/OFF, 내부 메모
- 오늘의 페이스 체크 수기 입력: 오늘 완료 콜 수, 컨디션, 식사 여부, 수면 시간, 휴식 여부, 이번 주 목표
- 운영 로그: 업로드 미리보기, 반영, 취소, 파일 차단, 시트 누락, 파싱 실패, 설정 변경

## 저장하지 않을 데이터

- 원본 엑셀 파일 바이너리
- 브라우저 `File` 객체
- 업로드 ArrayBuffer
- 정산 최종 파일
- 파싱 전 원본 행 전체
- GPS 현재 위치
- 실시간 콜 진행 상태
- 문자 발송 기록
- 실제 음악 재생 기록
- 불필요한 개인정보

## 테이블 초안

### `users`

사용자 계정과 권한 상태를 저장한다.

| 컬럼 | 타입 후보 | 설명 |
| --- | --- | --- |
| `id` | uuid | 내부 사용자 ID |
| `login_id` | text unique | 로그인 식별자 또는 Auth 매핑 키 |
| `role` | enum | `admin`, `rider` |
| `account_status` | enum | `active`, `pending`, `inactive` |
| `rider_id` | text nullable unique | 라이더 계정일 때 매핑 ID |
| `display_name` | text | 화면 표시 이름 |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 수정 시각 |

### `upload_weeks`

관리자가 반영한 주차 단위 데이터 묶음이다.

| 컬럼 | 타입 후보 | 설명 |
| --- | --- | --- |
| `id` | uuid | 업로드 주차 ID |
| `week_code` | text unique | 예: `2026_05-4` |
| `week_label` | text | 예: `5월4주차` |
| `source_file_name` | text | 파일명 문자열만 저장 |
| `uploaded_at` | timestamptz | 미리보기 생성 시각 |
| `uploaded_by` | uuid FK users.id | 업로드 관리자 |
| `applied_at` | timestamptz nullable | 이번 주차 데이터로 반영한 시각 |
| `status` | enum | `preview`, `applied`, `cancelled`, `rejected`, `failed` |
| `total_rows` | integer | 총행수 |
| `valid_order_count` | integer | 유효 오더 후보 |
| `issue_rows` | integer | 확인 필요 행 |
| `issue_count` | integer | 이슈 건수, 중복 포함 |

### `normalized_orders`

정규화된 오더 이력이다. 원천 행 전체를 저장하지 않는다.

| 컬럼 | 타입 후보 | 설명 |
| --- | --- | --- |
| `id` | uuid | 오더 레코드 ID |
| `week_id` | uuid FK upload_weeks.id | 주차 FK |
| `week_code` | text | 조회 최적화용 중복 컬럼 |
| `rider_id` | text | 라이더 ID |
| `rider_name` | text | 업로드 시점 표시 이름 |
| `order_no` | text | 주문번호 또는 축약 주문번호 |
| `delivery_type` | text | `단건`, `멀티배달1~5`, `확인필요` |
| `peak_time` | text | `Post_Lunch`, `Post_Dinner` 등 |
| `pickup_area` | text | 픽업 지역 |
| `dropoff_area` | text | 배달 지역 |
| `completed_at` | timestamptz nullable | 배달 완료 시각 |
| `distance_m` | numeric | 배달거리 m |
| `settlement_amount` | integer | 업로드 원천의 정산금액 필드, 코칭센터에서 계산하지 않음 |
| `created_at` | timestamptz | 저장 시각 |

권장 제약:

- `unique(week_id, order_no)`
- `index(week_code, rider_id)`
- `index(rider_id, completed_at)`

### `rider_weekly_summaries`

라이더별 주간 집계 결과다.

| 컬럼 | 타입 후보 | 설명 |
| --- | --- | --- |
| `id` | uuid | 집계 ID |
| `week_id` | uuid FK upload_weeks.id | 주차 FK |
| `week_code` | text | 조회 최적화 |
| `rider_id` | text | 라이더 ID |
| `rider_name` | text | 라이더명 |
| `completed_count` | integer | 완료건수 |
| `active_days` | integer | 출근횟수 |
| `multi_rate` | numeric | 멀티비율 |
| `post_lunch_rate` | numeric | Post_Lunch 참여율 |
| `post_dinner_rate` | numeric | Post_Dinner 참여율 |
| `dispatch_score` | integer | 배차 친화 점수 |
| `created_at` | timestamptz | 생성 시각 |

권장 제약:

- `unique(week_id, rider_id)`
- `index(rider_id, week_code)`

### `coaching_messages`

관리자 코칭 메시지 관리 데이터다.

| 컬럼 | 타입 후보 | 설명 |
| --- | --- | --- |
| `id` | uuid | 메시지 ID |
| `week_id` | uuid FK upload_weeks.id | 주차 FK |
| `rider_id` | text | 라이더 ID |
| `rider_name` | text | 표시명 |
| `auto_message` | text | 자동 코칭 메시지 |
| `custom_message` | text | 관리자 수정 메시지 |
| `visible_to_rider` | boolean | 라이더 노출 ON/OFF |
| `internal_memo` | text | 관리자 내부 메모 |
| `updated_by` | uuid FK users.id | 수정 관리자 |
| `updated_at` | timestamptz | 수정 시각 |

### `pace_check_entries`

라이더가 오늘의 페이스 체크에서 직접 입력한 현재 주차 상태다.

| 컬럼 | 타입 후보 | 설명 |
| --- | --- | --- |
| `id` | uuid | 입력 ID |
| `rider_id` | text | 라이더 ID |
| `entry_date` | date | 입력 기준 날짜 |
| `week_code` | text | 현재 목표 주차 코드 |
| `today_completed_calls` | integer | 오늘 완료 콜 수 |
| `today_start_time` | time nullable | 오늘 운행 시작 시간 |
| `condition` | enum | `good`, `normal`, `tired`, `risk` |
| `meal_status` | enum | `done`, `not_yet`, `skipped` |
| `sleep_hours` | numeric | 수면 시간 |
| `rest_status` | enum | `enough`, `short`, `none` |
| `weekly_goal_calls` | integer | 이번 주 목표 |
| `created_at` | timestamptz | 생성 시각 |
| `updated_at` | timestamptz | 수정 시각 |

권장 제약:

- `unique(rider_id, entry_date)`

### `operation_logs`

운영 로그와 감사 기록이다.

| 컬럼 | 타입 후보 | 설명 |
| --- | --- | --- |
| `id` | uuid | 로그 ID |
| `type` | enum | `upload_preview_created`, `upload_applied`, `upload_cancelled`, `upload_rejected`, `sheet_missing`, `parse_failed`, `pace_settings_updated` |
| `week_id` | uuid nullable FK upload_weeks.id | 관련 주차 |
| `week_code` | text nullable | 주차 코드 |
| `week_label` | text nullable | 주차 라벨 |
| `source_file_name` | text nullable | 파일명 문자열만 저장 |
| `actor_user_id` | uuid FK users.id | 실행 사용자 |
| `summary` | jsonb | 총행수, 유효 오더 후보, 확인 필요 행, 이슈 건수, 라이더 수 |
| `created_at` | timestamptz | 로그 시각 |

로그에는 원천 파일 바이너리, 브라우저 `File` 객체, 불필요한 개인정보를 넣지 않는다.

### `pace_check_settings`

관리자 페이스 체크 기본 설정이다.

| 컬럼 | 타입 후보 | 설명 |
| --- | --- | --- |
| `id` | uuid | 설정 ID |
| `default_weekly_goal_calls` | integer | 기본 이번 주 목표 콜 수 |
| `sleep_warning_hours` | numeric | 수면 경고 기준 |
| `risk_condition_safety_message` | text | 위험 컨디션 안전 문구 |
| `skipped_meal_message` | text | 식사 건너뜀 안내 문구 |
| `day_routine_message` | text | 주간형 루틴 문구 |
| `night_routine_message` | text | 야간형 루틴 문구 |
| `music_mode_safety_note` | text | 음악 모드 안전 문구 |
| `updated_by` | uuid FK users.id | 수정 관리자 |
| `updated_at` | timestamptz | 수정 시각 |

## 주요 관계도

```text
users(admin) 1 ── n upload_weeks
upload_weeks 1 ── n normalized_orders
upload_weeks 1 ── n rider_weekly_summaries
upload_weeks 1 ── n coaching_messages
upload_weeks 1 ── n operation_logs
users(rider) 1 ── n pace_check_entries
users(admin) 1 ── n operation_logs
```

조회 기준:

- 관리자: 전체 주차, 전체 라이더, 전체 운영 로그 조회
- 라이더: 본인 `rider_id`의 최신 반영 주차 오더, 집계, 코칭 메시지, 페이스 체크 입력만 조회
- 승인대기: 데이터 화면 접근 불가

## 권한 기준

관리자:

- 업로드 미리보기 생성
- 이번 주차 데이터 반영
- 검수 결과 확인
- 전체 라이더 집계 조회
- 코칭 메시지 수정
- 노출 ON/OFF 변경
- 페이스 체크 설정 변경
- 운영 로그 조회

라이더:

- 본인 `rider_id`의 최신 반영 주차 데이터 조회
- 본인 코칭 메시지 조회
- 본인 페이스 체크 입력 생성/수정
- 타 라이더 선택 UI 및 전체 조회 권한 없음

승인대기:

- 승인 대기 안내 화면만 조회
- 운행 데이터, 코칭, 페이스 체크, 정산앱 링크 접근 제한 여부는 운영 정책으로 결정

## 개인정보/민감정보 최소화 원칙

- `rider_id`와 표시 이름만 기본 저장한다.
- 전화번호, 계좌번호, 주민등록번호, 상세 주소, 불필요한 연락처는 저장하지 않는다.
- 원천 엑셀 파일명은 추적용 문자열로만 저장한다.
- 정산금액은 원천 업로드 필드를 보관할 수 있으나, 코칭센터에서 계산하지 않는다.
- 정산 확정, 지급 상태, 상세 원장은 기존 정산앱 기준으로 유지한다.
- 운영 로그에는 파일 바이너리, 원본 행 전체, 불필요한 개인정보를 남기지 않는다.

## 원천 엑셀 미저장 원칙

DB 도입 후에도 원천 엑셀 파일 자체는 저장하지 않는다.

저장 가능한 것:

- 검증된 파일명
- 주차 코드/라벨
- 검수 요약
- 정규화된 오더 데이터
- 라이더별 집계
- 코칭 메시지
- 운영 로그 요약

저장하지 않는 것:

- `.xlsx` 바이너리
- 브라우저 `File`
- ArrayBuffer
- 파싱 전 행 전체
- 정산 최종 파일

## 전환 시 바뀌는 구현 포인트

현재:

- `latestUploadedWeekData`는 브라우저 상태에 있다.
- 새로고침 후 다시 업로드가 필요할 수 있다.
- 운영 로그와 페이스 설정도 세션 기준이다.

DB 전환 후:

- 앱 시작 시 DB에서 최신 `applied` 주차를 로드한다.
- 업로드 미리보기는 저장 전 상태 또는 `preview` 상태로 분리한다.
- `이번 주차 데이터로 반영` 시 `upload_weeks.status = applied`와 관련 테이블을 트랜잭션으로 확정한다.
- 잘못된 파일 업로드는 기존 `applied` 주차를 덮어쓰지 않는다.
- 라이더 화면은 RLS 또는 서버 검증으로 본인 `rider_id`만 조회한다.

트랜잭션 후보:

1. `upload_weeks` 생성 또는 상태 갱신
2. `normalized_orders` upsert
3. `rider_weekly_summaries` upsert
4. `coaching_messages` 생성/갱신
5. `operation_logs` 기록

## 운영 전 체크리스트

- [ ] Supabase 프로젝트를 만들지 여부 결정
- [ ] Auth를 Supabase Auth로 할지 별도 인증으로 할지 결정
- [ ] `rider_id` 발급/매핑 기준 확정
- [ ] 같은 주차 재업로드 시 교체, 버전 이력, 롤백 정책 결정
- [ ] RLS 정책 작성: 관리자 전체 조회, 라이더 본인 조회
- [ ] 원천 엑셀 파일 미저장 정책 재확인
- [ ] 정산 최종 파일 업로드 차단 정책 유지
- [ ] 개인정보 최소 저장 범위 승인
- [ ] 운영 로그 보존 기간 결정
- [ ] 백업/복구 정책 결정
- [ ] `xlsx` 패키지 취약점과 파일 크기 제한, 파싱 위치 검토
- [ ] 서버 저장 전 테스트 데이터와 실제 라이더 데이터 분리
- [ ] 외부 베타 URL 접근 대상과 기간 제한
