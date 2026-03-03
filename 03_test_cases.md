# 🧪 동시 예약/변경 테스트 케이스

> Google Calendar Centric Booking System  
> Race Condition · Conflict · Edge Case 중심

---

## 테스트 전제 조건

- 운영 시간: 09:00~18:00 (KST)
- 슬롯 단위: 60분
- 버퍼: 15분
- 타임존: Asia/Seoul
- 모든 시간은 KST 기준 표기, 내부 처리는 UTC

---

## Category 1. 동시 예약 (Race Condition)

### TC-001: 동일 슬롯 동시 예약 요청
```
시나리오: 사용자 A, B가 동일한 09:00~10:00 슬롯을 동시에 예약 시도

요청 1: createBooking({ start: "09:00", end: "10:00" })  ← 1ms 먼저 도달
요청 2: createBooking({ start: "09:00", end: "10:00" })  ← 동시 도달

기대 결과:
  ✅ 요청 1: Google Calendar 이벤트 생성 성공 → DB 저장 → 200 OK
  ✅ 요청 2: Calendar 재조회 → 충돌 감지 → DB 저장 안 함 → 409 Conflict

검증 포인트:
  - DB에 booking 레코드가 정확히 1개만 존재
  - Google Calendar에 이벤트가 1개만 존재
  - 요청 2 응답 body에 { error: "SLOT_CONFLICT" } 포함
```

---

### TC-002: 부분 겹치는 슬롯 동시 예약
```
시나리오: 기존 예약 09:00~10:00 존재 상태에서
  사용자가 09:30~10:30 슬롯 예약 시도

요청: createBooking({ start: "09:30", end: "10:30" })

기대 결과:
  ✅ Calendar 조회 → 09:00~10:00 이벤트 발견 → 겹침 감지 → 409 Conflict
  ✅ DB 삽입 없음

검증 포인트:
  - 부분 겹침도 충돌로 처리되는지 확인
```

---

### TC-003: 버퍼 시간 내 예약 시도
```
시나리오: 09:00~10:00 예약 존재 (버퍼 15분)
  사용자가 10:00~11:00 슬롯 예약 시도 (버퍼 시간 무시)

기대 결과:
  ✅ getAvailableSlots에서 10:00 슬롯은 반환되지 않아야 함
     (다음 가용 슬롯: 10:15~11:15)
  ✅ 직접 createBooking({ start: "10:00", end: "11:00" }) 호출 시
     Calendar 이벤트는 없으므로 기술적으로 충돌 없음 → 생성 가능

주의:
  - 버퍼는 슬롯 생성 단계에서만 적용
  - Calendar 자체에는 버퍼 이벤트 없음 → createBooking 레벨에서 추가 검증 필요 여부 결정
  - 결정: createBooking은 Calendar 충돌만 검사, 버퍼 검증은 슬롯 단계에서만
```

---

## Category 2. 리스케줄 (Reschedule)

### TC-004: 정상 리스케줄
```
시나리오: booking_id=X (09:00~10:00, google_event_id=GEV-1) 리스케줄
  새 시간: 14:00~15:00 (충돌 없음)

요청: rescheduleBooking({ booking_id: X, new_start: "14:00", new_end: "15:00" })

기대 결과:
  ✅ Calendar 조회 (GEV-1 제외) → 충돌 없음
  ✅ Google Calendar PATCH GEV-1 → 14:00~15:00
  ✅ DB bookings 업데이트 (start/end 변경)
  ✅ DB booking_history 레코드 삽입
  ✅ google_event_id 동일 유지 (GEV-1)

검증 포인트:
  - Calendar에 기존 이벤트 ID가 그대로 존재하고 시간만 변경
  - 새 이벤트가 생성되지 않음
  - booking_history에 old/new 시간 기록 확인
```

---

### TC-005: 리스케줄 대상 시간에 다른 예약 존재
```
시나리오: 14:00~15:00에 이미 다른 예약(GEV-2) 존재
  booking_id=X를 14:00~15:00으로 리스케줄 시도

기대 결과:
  ✅ Calendar 조회 (GEV-1 제외) → GEV-2 충돌 감지 → 409 Conflict
  ✅ Calendar PATCH 없음
  ✅ DB 변경 없음
  ✅ booking_history 삽입 없음
```

---

### TC-006: 동일 슬롯으로 리스케줄 (자기 자신과 충돌)
```
시나리오: booking_id=X가 09:00~10:00 예약
  동일하게 09:00~10:00으로 리스케줄 시도

기대 결과:
  ✅ Calendar 조회 시 google_event_id(GEV-1) 제외 → 충돌 없음
  ✅ Calendar PATCH (시간 동일)
  ✅ DB 업데이트 (시간 동일)
  ✅ booking_history 삽입

검증 포인트:
  - 자기 자신의 이벤트를 excludeEventId로 제외하는 로직 동작 확인
```

---

### TC-007: 리스케줄 동시 요청
```
시나리오: booking_id=X를 동시에 두 곳에서 리스케줄 시도
  요청 1: → 14:00~15:00
  요청 2: → 14:00~15:00 (동일 타겟)

기대 결과:
  ✅ 요청 1: PATCH 성공 → DB 업데이트
  ✅ 요청 2: Calendar 재조회 → 요청 1의 결과로 이미 GEV-1이 14:00~15:00
             → 자기 자신이므로 충돌 없음 → PATCH (멱등성)
  또는:
  ✅ DB 레벨 optimistic lock 고려 시 → 후속 요청 실패 처리

주의:
  - 두 요청이 각각 다른 시간대로 리스케줄 시 마지막 PATCH 결과가 실제 상태
  - booking_history에 두 건이 기록되어야 추적 가능
```

---

## Category 3. 취소 (Cancel)

### TC-008: 정상 취소
```
시나리오: booking_id=X 취소 요청

기대 결과:
  ✅ Google Calendar 이벤트 GEV-1 삭제
  ✅ DB bookings.status = 'canceled'
  ✅ 해당 슬롯은 getAvailableSlots에서 다시 반환됨

검증 포인트:
  - 취소 후 동일 슬롯 예약 가능 여부 확인
```

---

### TC-009: 이미 취소된 예약 재취소
```
시나리오: 이미 status='canceled'인 booking을 다시 취소 시도

기대 결과:
  ✅ 400 Bad Request 또는 409
  ✅ Calendar 삭제 시도 없음 (google_event_id 이미 삭제됨)
  ✅ google_event_id가 없는 경우 Calendar API 호출 skip
```

---

### TC-010: Calendar 이벤트 삭제 실패 시
```
시나리오: Google Calendar API 오류 (500, timeout) 상황에서 취소 요청

기대 결과:
  ✅ Calendar 삭제 실패 → DB status 변경 하지 않음
  ✅ 503 또는 502 에러 반환
  ✅ 클라이언트에서 재시도 가능

검증 포인트:
  - DB와 Calendar 간 불일치 상태가 발생하지 않음
  - 부분 성공 상태 없음
```

---

## Category 4. 슬롯 조회 (getAvailableSlots)

### TC-011: 운영하지 않는 요일
```
입력: date = 일요일 (day_of_week = 0), availability 없음
기대 결과: [] (빈 배열)
```

---

### TC-012: 오늘 날짜 조회 (과거 슬롯 제외)
```
시나리오: 현재 시각이 13:30 KST
  오늘 날짜로 getAvailableSlots 요청

기대 결과:
  ✅ 09:00~13:00 슬롯 제외 (과거)
  ✅ 13:15~ 슬롯부터 반환 (버퍼 포함 계산)

검증 포인트:
  - 경계값: 13:30 현재, 13:15~14:15 슬롯 반환 여부
```

---

### TC-013: All-day 이벤트 존재 시
```
시나리오: Google Calendar에 all-day 이벤트 (종일 이벤트) 존재

기대 결과:
  ✅ 해당 날짜 슬롯 전체 반환 없음 (모두 겹침)
  또는:
  ✅ all-day 이벤트는 블로킹 이벤트로 처리 → 00:00~23:59와 겹침

검증 포인트:
  - event.start.date (all-day) vs event.start.dateTime 구분 처리
```

---

### TC-014: Calendar API 오류 시 슬롯 조회
```
시나리오: Google Calendar API 오류 발생

기대 결과:
  ✅ 500 에러 반환 (빈 슬롯 배열 반환 금지)
  ✅ 오류 시 슬롯을 임의로 가용하다고 판단하지 않음

이유:
  - 슬롯을 잘못 반환 → 중복 예약 가능성
  - Calendar가 source of truth → 조회 실패 시 안전하게 에러 처리
```

---

## Category 5. Instagram DM 연동

### TC-015: Webhook 수신 정상 처리
```
시나리오: Instagram에서 DM 수신 webhook 호출

기대 결과:
  ✅ instagram_messages 테이블에 저장
  ✅ 자동 booking 생성 없음
  ✅ 200 OK 즉시 반환 (Instagram webhook timeout 대응)
```

---

### TC-016: Admin DM 확인 후 예약 확정
```
시나리오: Admin이 DM inbox에서 시간 확인 후 "예약 확정" 클릭

기대 결과:
  ✅ createBooking 호출 (source: "instagram")
  ✅ 동일 충돌 검사 로직 실행
  ✅ 성공 시 Instagram DM으로 확인 메시지 발송 (옵션)
```

---

## 테스트 실행 매트릭스

| TC | 분류 | 우선순위 | 자동화 가능 |
|----|------|----------|------------|
| TC-001 | Race Condition | 🔴 Critical | ✅ |
| TC-002 | 부분 겹침 | 🔴 Critical | ✅ |
| TC-003 | 버퍼 처리 | 🟡 High | ✅ |
| TC-004 | 리스케줄 정상 | 🔴 Critical | ✅ |
| TC-005 | 리스케줄 충돌 | 🔴 Critical | ✅ |
| TC-006 | 자기 자신 제외 | 🔴 Critical | ✅ |
| TC-007 | 리스케줄 동시 | 🟡 High | ⚠️ 부분 |
| TC-008 | 취소 정상 | 🔴 Critical | ✅ |
| TC-009 | 이중 취소 | 🟡 High | ✅ |
| TC-010 | Calendar 오류 | 🟡 High | ✅ (Mock) |
| TC-011 | 운영 외 요일 | 🟢 Normal | ✅ |
| TC-012 | 과거 슬롯 제외 | 🟡 High | ✅ |
| TC-013 | All-day 이벤트 | 🟡 High | ✅ (Mock) |
| TC-014 | Calendar 오류 슬롯 | 🔴 Critical | ✅ (Mock) |
| TC-015 | Webhook 수신 | 🟡 High | ✅ |
| TC-016 | DM → 예약 확정 | 🟡 High | ⚠️ 부분 |

---

## 자동화 테스트 구조 (권장)

```typescript
// 테스트 파일 구조
tests/
├── unit/
│   ├── calculateSlots.test.ts    // TC-011, TC-012, TC-013
│   └── overlap.test.ts           // TC-002, TC-003, TC-006
├── integration/
│   ├── createBooking.test.ts     // TC-001, TC-002, TC-010, TC-014
│   ├── rescheduleBooking.test.ts // TC-004, TC-005, TC-006, TC-007
│   └── cancelBooking.test.ts     // TC-008, TC-009, TC-010
└── e2e/
    ├── webBookingFlow.test.ts    // 전체 웹 예약 플로우
    └── instagramFlow.test.ts     // TC-015, TC-016
```
