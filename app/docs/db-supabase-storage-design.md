# DB / Supabase 도입 검토 문서

## 목적

라이더 코칭센터 Ver.2에 실제 DB 또는 Supabase를 붙이기 전에, 저장 대상과 비저장 대상, 권한, RLS, 운영 리스크를 판단하기 위한 체크리스트를 정리한다.

이번 문서는 설계/검토용이다. 실제 DB 연결, Supabase 패키지 설치, API 연결, 인증 구현, 마이그레이션 실행은 하지 않는다.

현재 앱은 쿠팡플러스 전용 모바일 웹앱이며, 정산앱과는 데이터 연동 없이 외부 링크로만 연결한다.

## 1. DB 도입이 필요한 시점

아래 조건 중 2개 이상이 실제 운영에서 발생하면 DB 도입을 우선 검토한다.

| 판단 항목 | DB 필요 신호 |
| --- | --- |
| 데이터 지속성 | 새로고침, 로그아웃, 기기 변경 후에도 최신 반영 주차 데이터가 유지되어야 한다. |
| 다중 사용자 | 관리자와 여러 라이더가 같은 주차 데이터를 동시에 확인해야 한다. |
| 운영 이력 | 업로드 미리보기, 반영, 취소, 파일 차단, 설정 변경 로그를 장기 보관해야 한다. |
| 권한 통제 | 라이더별 본인 데이터만 조회하도록 서버/DB 레벨에서 강제해야 한다. |
| 계정 운영 | 공용 테스트 계정 대신 관리자/라이더 개인 계정이 필요하다. |
| 베타 확대 | 소규모 내부 테스트를 넘어 실제 라이더 다수가 접속한다. |
| 장애 대응 | 잘못된 업로드 후 이전 반영 데이터 복구나 감사 추적이 필요하다. |

권장 전환 기준:

- 1차 베타: in-memory/session 상태로 흐름 검증 가능
- 반복 베타: server JSON store 또는 Supabase 개발 프로젝트 검토
- 운영 공개: Supabase/PostgreSQL + Auth + RLS 권장

## 2. 아직 DB 없이 가능한 범위

현재 구조로도 아래 검증은 가능하다.

- 관리자 로그인/라이더 로그인/pending 권한 분기 확인
- 브라우저 파일 선택 방식의 엑셀 파싱
- 업로드 파일명, 시트, 필수값 검수
- 미리보기와 확정 반영 흐름 검증
- 관리자 대시보드/검수/코칭 화면 확인
- 라이더 본인 화면에서 최신 업로드 주차 기준 UI 확인
- 오늘의 페이스 체크 수기 입력 UX 확인
- 운영 로그 UI 흐름 확인
- 정산앱 외부 링크 이동 확인

DB 없이 어려운 범위:

- 새로고침 후 데이터 유지
- 다른 기기/다른 사용자 간 동일 데이터 공유
- 실제 계정 발급/비밀번호 관리
- 관리자 권한 변경 이력 추적
- 운영 로그 장기 보관
- 라이더별 접근 권한을 서버/DB 레벨에서 강제
- 백업/복구/롤백

## 3. 저장해야 할 데이터

저장 대상은 원천 파일이 아니라 파싱, 검수, 정규화, 집계가 끝난 데이터다.

| 데이터 | 저장 목적 | 주요 필드 |
| --- | --- | --- |
| 사용자 계정 | 로그인, 승인 상태, 권한 분기 | `auth_user_id`, `role`, `account_status`, `display_name` |
| rider_id | 라이더 데이터 매핑 기준 | `rider_id`, `auth_user_id`, `display_name`, `active/inactive` |
| 업로드 주차 정보 | 최신 반영 주차와 업로드 이력 관리 | `week_code`, `week_label`, `source_file_name`, `uploaded_at`, `uploaded_by`, `applied_at`, `status` |
| 정규화된 오더 데이터 | 라이더별 내오더/내지도/내현황 기준 | `week_code`, `rider_id`, `rider_name`, `order_no`, `delivery_type`, `peak_time`, `pickup_area`, `dropoff_area`, `completed_at`, `distance`, `settlement_amount` |
| 라이더별 주간 집계 | 대시보드, 코칭, 라이더 현황 표시 | `completed_count`, `active_days`, `multi_rate`, `post_lunch_rate`, `post_dinner_rate`, `dispatch_score` |
| 코칭 메시지 | 관리자 코칭 관리와 라이더 노출 | `auto_message`, `custom_message`, `visible_to_rider`, `internal_memo`, `updated_by`, `updated_at` |
| 오늘의 페이스 체크 입력 | 라이더 수기 입력 기반 코칭 | `today_completed_calls`, `today_start_time`, `condition`, `meal_status`, `sleep_hours`, `rest_status`, `weekly_goal_calls` |
| 페이스 체크 설정 | 관리자 기준값 관리 | `default_weekly_goal_calls`, `sleep_warning_hours`, 안전 문구, 루틴 문구, 음악 모드 안내 문구 |
| 운영 로그 | 감사, 장애 대응, 베타 피드백 추적 | `type`, `week_code`, `source_file_name`, `actor_user_id`, `summary`, `created_at` |

`settlement_amount`는 원천 엑셀의 정규화 필드로만 보관할 수 있다. 코칭센터에서 정산 금액을 계산하거나 지급 상태를 판단하지 않는다.

## 4. 저장하지 말아야 할 데이터

아래 데이터는 DB, Storage, 운영 로그, 클라이언트 캐시에 저장하지 않는 것을 원칙으로 한다.

| 비저장 대상 | 이유 |
| --- | --- |
| 원본 엑셀 파일 바이너리 | 개인정보/정산 원천 데이터 노출 위험, 보관 책임 증가 |
| 브라우저 `File` 객체 | 브라우저 세션 객체이며 저장 대상이 아님 |
| ArrayBuffer 또는 파싱 전 원천 payload | 원천 파일 저장과 동일한 위험 |
| 정산 최종 파일 | 코칭센터 업로드 대상 제외, 기존 정산앱 영역 |
| GPS 현재 위치 | Ver.2 MVP 범위 제외, 민감 위치정보 |
| 실시간 콜 상태 | 실시간 관제 앱이 아니므로 저장/연동하지 않음 |
| 문자 발송 기록 | 문자 기능이 없으며 운영 범위 제외 |
| 실제 음악 재생 기록 | 음악 재생 기능이 없으며 운영 범위 제외 |
| 불필요한 개인정보 | 전화번호, 주민번호, 상세 주소, 계좌번호 등 |

운영 로그에도 원천 엑셀 행 전체, File 객체, 불필요한 개인정보를 넣지 않는다. 로그에는 파일명, 주차, 요약 수치, 이슈 유형만 남긴다.

## 5. 권한 기준

### admin

관리자는 전체 운영 데이터에 접근할 수 있다.

- 업로드 미리보기 생성
- 이번 주차 데이터 반영
- 검수 결과 조회
- 전체 대시보드 조회
- 전체 라이더 주간 집계 조회
- 코칭 메시지 수정
- 라이더 노출 ON/OFF 변경
- 페이스 체크 설정 변경
- 운영 로그 조회
- 정산앱 외부 링크 이동

주의:

- 관리자 계정은 최소 인원에게만 부여한다.
- 관리자 권한 변경 이력은 운영 로그 또는 별도 감사 로그에 남긴다.

### rider

라이더는 본인 `rider_id`에 매핑된 데이터만 조회한다.

- 본인 내현황 조회
- 본인 내오더 조회
- 본인 내지도 조회
- 본인 내코칭 조회
- 본인 오늘의 페이스 체크 입력/수정
- 본인에게 노출 ON인 코칭 메시지만 조회
- 정산앱 외부 링크 이동

금지:

- 다른 라이더 선택 UI
- 다른 라이더 오더/집계/코칭 조회
- 관리자 화면 접근
- 운영 로그 조회

### pending

승인대기 계정은 승인 대기 안내만 조회한다.

- 관리자 데이터 접근 불가
- 라이더 데이터 접근 불가
- 업로드/검수/코칭/운영 로그 접근 불가
- 오늘의 페이스 체크 입력 불가

운영 전 결정:

- pending 계정이 정산앱 링크를 볼 수 있는지 여부
- 승인/반려/비활성화 처리 주체
- 승인 시 `rider_id` 매핑 방식

## 6. Supabase RLS 정책 초안

이 섹션은 정책 방향 초안이다. 실제 SQL 적용 전에는 Supabase 공식 문서, changelog, 프로젝트 설정, Data API 노출 설정을 다시 확인해야 한다.

기본 원칙:

- `public` 등 노출 가능한 schema의 모든 테이블에 RLS를 켠다.
- 브라우저 클라이언트에 `service_role` 또는 secret key를 절대 노출하지 않는다.
- 권한 판단에는 사용자가 수정 가능한 `user_metadata`를 쓰지 않는다.
- 역할과 `rider_id`는 DB의 `profiles` 테이블 또는 `app_metadata` 기반으로 관리한다.
- UPDATE 정책은 SELECT 정책도 함께 필요하다는 점을 확인한다.
- view를 만들 경우 RLS 우회를 막기 위해 `security_invoker` 또는 비노출 schema를 검토한다.

권장 프로필 구조:

| 테이블 | 역할 |
| --- | --- |
| `profiles` | Supabase Auth 사용자와 앱 권한/라이더 ID를 매핑 |
| `upload_weeks` | 업로드 주차 메타데이터 |
| `normalized_orders` | 정규화된 오더 |
| `rider_weekly_summaries` | 라이더별 주간 집계 |
| `coaching_messages` | 코칭 메시지 |
| `pace_check_entries` | 라이더 수기 입력 |
| `pace_check_settings` | 관리자 설정 |
| `operation_logs` | 운영 감사 로그 |

예상 RLS 방향:

| 테이블 | admin 정책 | rider 정책 | pending 정책 |
| --- | --- | --- | --- |
| `profiles` | 전체 조회/승인 상태 변경 | 본인 프로필 조회 | 본인 승인대기 상태 조회 |
| `upload_weeks` | 전체 CRUD | 본인 데이터가 있는 applied 주차 메타 조회 | 접근 불가 |
| `normalized_orders` | 전체 조회/삽입/교체 | `rider_id`가 본인과 일치하는 applied 주차만 조회 | 접근 불가 |
| `rider_weekly_summaries` | 전체 조회/삽입/교체 | `rider_id`가 본인과 일치하는 집계만 조회 | 접근 불가 |
| `coaching_messages` | 전체 조회/수정 | 본인 `rider_id`이고 `visible_to_rider = true`인 메시지만 조회 | 접근 불가 |
| `pace_check_entries` | 운영상 필요 시 제한 조회 | 본인 입력 조회/생성/수정 | 접근 불가 |
| `pace_check_settings` | 조회/수정 | 읽기 전용 조회 | 접근 불가 |
| `operation_logs` | 전체 조회/삽입 | 접근 불가 | 접근 불가 |

정책 pseudo SQL 예시:

```sql
-- 실제 적용용 SQL이 아니라 정책 방향을 보여주는 초안이다.

-- admin 판별은 profiles.role = 'admin'과 profiles.account_status = 'active'를 기준으로 한다.
-- rider 판별은 profiles.rider_id와 각 데이터의 rider_id를 비교한다.

-- normalized_orders
-- admin: all rows
-- rider: own rider_id rows only, and only applied weeks

-- coaching_messages
-- admin: all rows
-- rider: own rider_id rows only when visible_to_rider = true

-- operation_logs
-- admin: select/insert
-- rider/pending: no access
```

구현 전 추가 검토:

- `profiles`를 `public`에 둘지, 별도 private schema를 둘지
- role 확인 helper function을 만들 경우 `security definer` 위치와 권한
- `upload_weeks.status = 'applied'` 기준으로 라이더 조회를 제한하는 방식
- 같은 주차 재업로드 시 기존 데이터를 교체할지 버전 이력으로 남길지
- 관리자 수정 메시지와 내부 메모의 라이더 노출 차단 보장
- 페이스 체크 입력이 건강/컨디션 정보에 가까우므로 관리자 조회 범위를 최소화할지

## 7. 베타 이후 DB 전환 순서

1. 운영 정책 확정
   - 개인 계정 발급 방식
   - 관리자 권한 부여자
   - `rider_id` 매핑 원칙
   - 데이터 보관 기간

2. Supabase 프로젝트 검토
   - 개발/베타/운영 프로젝트 분리 여부
   - Auth 사용 여부
   - region, 백업, 비용 기준
   - 공식 문서/changelog 확인

3. 스키마 초안 확정
   - `profiles`
   - `upload_weeks`
   - `normalized_orders`
   - `rider_weekly_summaries`
   - `coaching_messages`
   - `pace_check_entries`
   - `pace_check_settings`
   - `operation_logs`

4. RLS 초안 작성 및 리뷰
   - admin 전체 접근
   - rider 본인 데이터 접근
   - pending 데이터 접근 차단
   - operation log admin 전용

5. 로컬/개발 DB에서 마이그레이션 검증
   - 샘플 계정
   - 샘플 주차
   - 정상 업로드 반영
   - 잘못된 업로드가 기존 applied 데이터를 덮지 않는지

6. 앱 저장 어댑터 교체
   - `InMemoryWeekDataRepository` 유지
   - `SupabaseWeekDataRepository` 별도 추가
   - 기능 flag 또는 환경 설정으로 전환

7. 인증 흐름 전환
   - 테스트 계정 숨김
   - 개인 계정 로그인
   - pending 승인 흐름
   - 로그아웃/세션 만료 처리

8. 베타 데이터 마이그레이션 여부 결정
   - 기존 베타 데이터 폐기
   - 필요한 요약만 수동 이관
   - 실제 원천 엑셀 파일은 이관하지 않음

9. 운영 전 보안 점검
   - RLS 테스트
   - service key 노출 여부
   - 개인정보 최소화
   - 백업/복구 리허설

## 8. 비용/운영 리스크

| 리스크 | 설명 | 완화 방안 |
| --- | --- | --- |
| 월 비용 증가 | 사용자 수, row 수, 백업, 로그 보관에 따라 비용 증가 | 베타 기간 보관 기간 제한, 원천 파일 미저장 |
| 권한 오설정 | RLS 누락 시 라이더가 타인 데이터를 볼 위험 | 모든 테이블 RLS 기본 ON, 정책 테스트 자동화 |
| 인증 운영 부담 | 계정 발급, 비밀번호 초기화, 퇴사/이탈 처리 필요 | 관리자 운영 절차 문서화, 계정 비활성화 정책 |
| 원천 데이터 과보관 | 엑셀 원본 저장 시 개인정보/정산정보 관리 책임 증가 | 원본 파일/ArrayBuffer/File 미저장 원칙 유지 |
| 잘못된 업로드 반영 | 오더/집계가 잘못 저장될 수 있음 | preview와 applied 분리, 트랜잭션, 운영 로그 |
| 같은 주차 재업로드 | 기존 데이터 교체/이력 보관 정책 혼선 | 운영 전 정책 확정: 교체, 버전 이력, 롤백 |
| 성능 저하 | 오더 데이터 누적 시 조회 느려짐 | `week_code`, `rider_id`, `order_no` 인덱스 |
| xlsx 보안 | 악성/대용량 파일 파싱 위험 | 파일 크기 제한, 확장자/시트 검수, 서버 파싱 시 격리 |
| 정산앱 혼동 | 코칭센터가 정산앱처럼 오해될 수 있음 | 외부 링크 안내 문구 유지, 계산 기능 미추가 |
| 운영 로그 개인정보 | 로그에 민감정보가 남을 위험 | summary 중심 로그, 원천 행/개인정보 미기록 |

## 9. DB 도입 전 최종 결정 체크리스트

| 체크 항목 | 결정 |
| --- | --- |
| Supabase/PostgreSQL을 우선 DB로 선택할지 결정 | [ ] |
| 개발/베타/운영 프로젝트를 분리할지 결정 | [ ] |
| Supabase Auth를 사용할지 결정 | [ ] |
| 테스트 계정 폐기 또는 숨김 처리 방법 확정 | [ ] |
| 관리자 개인 계정 발급 방식 확정 | [ ] |
| 라이더 개인 계정 발급 방식 확정 | [ ] |
| `rider_id` 발급/매핑 원칙 확정 | [ ] |
| pending 승인/반려/비활성화 정책 확정 | [ ] |
| 같은 주차 재업로드 시 교체/버전 보관/롤백 정책 확정 | [ ] |
| 원본 엑셀 파일 미저장 원칙 재확인 | [ ] |
| 정산 최종 파일 업로드 차단 정책 유지 확인 | [ ] |
| 정산앱은 외부 링크이며 데이터 연동이 아님을 확인 | [ ] |
| `settlement_amount` 표시/비표시 범위 결정 | [ ] |
| 페이스 체크 입력의 관리자 조회 범위 결정 | [ ] |
| 운영 로그 보관 기간 결정 | [ ] |
| 백업/복구 정책 결정 | [ ] |
| 모든 노출 테이블 RLS ON 계획 수립 | [ ] |
| admin/rider/pending RLS 테스트 케이스 작성 | [ ] |
| `service_role` key가 클라이언트에 노출되지 않도록 배포 정책 수립 | [ ] |
| 공식 Supabase docs/changelog 확인 후 실제 SQL 작성 | [ ] |
| xlsx 취약점, 파일 크기 제한, 파싱 격리 방안 검토 | [ ] |
| 개인정보 최소화 항목 최종 승인 | [ ] |

## 10. 이번 단계에서 하지 않는 일

- Supabase 패키지 설치
- DB 프로젝트 생성
- `.env` 추가
- API route 추가
- 실제 인증 구현
- RLS SQL 적용
- 원천 엑셀 파일 저장
- 정산 계산
- 정산 엑셀 파싱
- GPS/실시간 콜/문자/음악 기능 추가

