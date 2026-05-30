# 엑셀 구조 및 Ver.2 필드 매핑

## 1. 원시 엑셀 파일 구조

분석 대상 원천 파일은 `_sample_excel/2026-05-4` 폴더의 `동구바로_대전_동구중앙_2026_05-4.xlsx`이다. 같은 폴더의 `_excluded` 아래 정산 최종 파일은 업로드 제외 대상이다.

| 시트명 | 크기 | 헤더 위치 | Ver.2 사용 방향 |
| --- | ---: | --- | --- |
| 종합 | 46행 x 40열 | 1~2행 복합 헤더 | MVP 제외. 라이더별 정산 요약 확장 시 참고 |
| 일자별 정산내역 | 260행 x 26열 | 7~8행 복합 헤더 | MVP 제외. 일자별 운영/정산 확장 시 참고 |
| 오더별 상세 내역서 | 4498행 x 25열 | 7행, 실제 컬럼 B:Y | MVP 핵심 원천 시트 |
| 지원금 | 12행 x 13열 | 7행 | MVP 제외. 지원금 상세 확장 시 참고 |
| 추가지원금 | 13행 x 7열 | 7행 | MVP 제외 |
| 차감내역 | 12행 x 10열 | 7행 | MVP 제외 |
| 협력사 자체 미션 | 494행 x 11열 | 7행 | MVP 제외. 미션 기능 확장 시 참고 |
| 시간제보험(차감) | 45행 x 5열 | 7행 | MVP 제외 |
| 보험료(소급) | 12행 x 5열 | 7행 | MVP 제외 |

## 2. 오더별 상세 내역서 컬럼 목록

`오더별 상세 내역서`는 7행에 헤더가 있고 A열은 비어 있다. 실제 데이터 컬럼은 B:Y이다. 첫 실제 오더 데이터는 9행부터 시작한다.

| Excel 열 | 원본 컬럼명 | 비고 |
| --- | --- | --- |
| B | 이름 | 라이더 표시명. 민감정보 취급 주의 |
| C | 축약형 주문번호 | 오더 중복 판별 후보 |
| D | 스토어명 | 픽업지/상점명 |
| E | 픽업지역 | 픽업 주소 또는 지역 텍스트 |
| F | 배달지역 | 배달 주소 또는 지역 텍스트 |
| G | 배정시간 | 오더 배정 시각 |
| H | 수락시간 | 라이더 수락 시각 |
| I | 배달시간 | 배달 완료 시각 |
| J | 배달소요시간 | 시간 문자열, 분 단위 변환 필요 |
| K | 피크타임 | Breakfast, Lunch_Peak, Post_Lunch, Dinner_Peak, Post_Dinner |
| L | 배달거리(m) | 숫자, km 파생 가능 |
| M | 배달타입 | 단건/멀티 계열 값. 샘플에는 `0`, `멀티배달5` 같은 확인필요 값도 있음 |
| N | 픽업 비용 | 금액 |
| O | 배달 비용 | 금액 |
| P | 지역 단가 | 금액 |
| Q | 배달거리 할증 | 금액 |
| R | 픽업지 할증 | 금액 |
| S | 도착지 할증 | 금액 |
| T | 기상 할증 | 금액 |
| U | 기타 프로모션1 | 금액 |
| V | 기타 프로모션2 | 금액 |
| W | 기타 프로모션3 | 금액 |
| X | 기타 프로모션4 | 금액 |
| Y | 정산금액 | 오더 단위 정산 금액 |

## 3. Ver.2 데이터 필드 매핑표

### 3.1 weekly_uploads

| Ver.2 필드 | 원천 | 변환/검증 규칙 |
| --- | --- | --- |
| upload_id | 시스템 생성 | UUID 또는 DB 기본값 |
| week_code | 파일명 `YYYY_MM-W` | 예: `2026_05-4` |
| week_label | week_code 파생 | 예: `2026년 5월 4주차` 또는 화면 표준 라벨 |
| original_file_name | 업로드 파일명 | 허용 파일명 패턴만 저장 |
| source_sheet_name | 시트명 | 반드시 `오더별 상세 내역서` 존재 |
| header_row | 파서 감지 | 샘플 기준 7 |
| total_rows | 파싱 결과 | 헤더 제외 원본 데이터 행 수 |
| parsed_rows | 파싱 결과 | 저장 가능한 오더 행 수 |
| issue_rows | 검수 결과 | 누락/변환/확인필요 행 수 |
| status | 검수 상태 | preview, ready, blocked, imported 등 |
| version | 재업로드 정책 | 같은 주차 교체/버전 저장 여부 결정 필요 |
| uploaded_by | 로그인 사용자 | admin user_id |
| uploaded_at | 시스템 시각 | 서버 시각 |

### 3.2 orders

| Ver.2 필드 | 원본 컬럼 | 변환/검증 규칙 |
| --- | --- | --- |
| order_id | 축약형 주문번호 | week_code와 조합해 중복 방지. 빈 값이면 행 번호 기반 임시 ID |
| week_code | 파일명 | 모든 오더에 동일 주차 부여 |
| week_label | 파일명 파생 | 화면 표시용 |
| rider_id | 이름 매칭 결과 | users/rider profile과 매칭. 미매칭은 검수 후보 |
| rider_name | 이름 | 원문 저장 범위와 마스킹 정책 확인 필요 |
| store_name | 스토어명 | 오더 상세/지도 표시용 |
| pickup_area_text | 픽업지역 | 주소 캐시 입력 후보 |
| dropoff_area_text | 배달지역 | 주소 캐시 입력 후보 |
| assigned_at | 배정시간 | 날짜/시간으로 파싱 |
| accepted_at | 수락시간 | 날짜/시간으로 파싱 |
| completed_at | 배달시간 | 날짜/시간으로 파싱 |
| duration_min | 배달소요시간 | `HH:MM:SS` 계열 값을 분 단위 숫자로 변환 |
| time_segment | 피크타임 | 허용값 외에는 검수 이슈 |
| distance_m | 배달거리(m) | 숫자 |
| distance_km | 배달거리(m) | `distance_m / 1000` 파생 |
| delivery_type | 배달타입 | 단건/멀티/확인필요로 정규화 |
| pickup_fee | 픽업 비용 | 숫자 |
| delivery_fee | 배달 비용 | 숫자 |
| area_fee | 지역 단가 | 숫자 |
| distance_surcharge | 배달거리 할증 | 숫자 |
| pickup_surcharge | 픽업지 할증 | 숫자 |
| dropoff_surcharge | 도착지 할증 | 숫자 |
| weather_surcharge | 기상 할증 | 숫자 |
| promo_fee_1 | 기타 프로모션1 | 숫자 |
| promo_fee_2 | 기타 프로모션2 | 숫자 |
| promo_fee_3 | 기타 프로모션3 | 숫자 |
| promo_fee_4 | 기타 프로모션4 | 숫자 |
| settlement_amount | 정산금액 | MVP에서는 예상/참고 금액으로만 사용 |
| completed_count | 원본에 없음 | 오더 1행 = 1건으로 기본 계산 |
| weekday | accepted_at 또는 completed_at | 요일별 활동 분석용 파생 |
| raw_row_number | Excel 행 번호 | 검수/추적용 |

### 3.3 rider_week_metrics

| Ver.2 필드 | 계산 원천 | 계산 규칙 |
| --- | --- | --- |
| rider_id | orders | 라이더 매칭 결과 |
| week_code | orders | 주차 |
| completed_count | orders | 오더 행 수 또는 completed_count 합계 |
| active_days | accepted_at/completed_at | 운행한 날짜 수 |
| weekday_completed | accepted_at/completed_at | 요일별 완료건수 |
| segment_completed | time_segment | 구간별 완료건수 |
| delivery_type_completed | delivery_type | 배달타입별 완료건수 |
| multi_rate | delivery_type | 멀티 계열 / 전체 |
| post_lunch_rate | time_segment | Post_Lunch / 전체 |
| post_dinner_rate | time_segment | Post_Dinner / 전체 |
| strong_segment | segment_completed | 최다 완료 구간 |
| weak_segment | segment_completed | 최저 또는 0건 구간 |
| dispatch_score | metrics | 완료건수, 멀티율, 포스트구간, 활동일 기반 |
| grade | completed_count 또는 score | 등급 기준 확정 필요 |

### 3.4 coaching_messages

| Ver.2 필드 | 원천 | 설명 |
| --- | --- | --- |
| message_id | 시스템 생성 | 주차+라이더 단위 고유값 |
| week_code | weekly_uploads | 기준 주차 |
| rider_id | users/orders | 대상 라이더 |
| auto_message | metrics 기반 생성 | 자동 생성 원문 |
| custom_message | 관리자 입력 | 저장 시 라이더 노출 후보 |
| visible_to_rider | 관리자 토글 | ON일 때만 라이더 `내코칭`에 표시 |
| status | 관리자 워크플로 | draft, visible, hidden 등 |
| updated_by | users | 수정 관리자 |
| updated_at | 시스템 시각 | 마지막 수정 시각 |

### 3.5 users

| Ver.2 필드 | 원천 | 설명 |
| --- | --- | --- |
| user_id | 시스템 생성 | 로그인 계정 ID |
| role | 회원가입/관리자 지정 | admin 또는 rider |
| rider_id | 라이더 계정 매핑 | rider role에서 필수 |
| name | 회원가입 또는 관리자 입력 | 표시명 |
| phone | 회원가입 또는 관리자 입력 | 저장/마스킹 정책 확인 필요 |
| account_status | 승인 흐름 | pending, active, inactive |
| created_at | 시스템 시각 | 생성 시각 |

## 4. 파싱/검수 주의사항

- `오더별 상세 내역서`의 A열은 비어 있으므로 헤더 인덱스를 단순 1열부터 가정하면 안 된다.
- 실제 샘플에는 `완료건수` 컬럼이 없다. Ver.2 MVP는 오더 상세 1행을 완료 1건으로 계산한다.
- `피크타임`은 Ver.1과 동일한 5개 코드가 들어오지만, 빈 값은 검수 이슈로 잡아야 한다.
- `배달타입`에는 숫자나 예상 외 멀티 값이 섞일 수 있다. 분석에는 `확인필요`로 분리하고 관리자 검수에 노출한다.
- 주소/지도는 텍스트 주소만으로 시작하고, 좌표 캐시는 MVP 이후 확장으로 두는 것이 안전하다.
