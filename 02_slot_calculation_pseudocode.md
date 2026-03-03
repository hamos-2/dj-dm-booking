# 🧠 슬롯 계산 로직 의사코드

> `lib/slots/calculateSlots.ts` 구현 기준  
> Google Calendar 이벤트를 기반으로 가용 슬롯을 계산한다.

---

## 함수 시그니처

```typescript
function calculateAvailableSlots(
  availability: AvailabilityConfig,   // 요일별 운영 시간 설정
  calendarEvents: CalendarEvent[],    // 해당 날짜의 Google Calendar 이벤트
  date: string,                       // "YYYY-MM-DD"
  timezone: string,                   // "Asia/Seoul"
  excludeEventId?: string             // 리스케줄 시 자기 자신 제외
): TimeSlot[]
```

---

## 타입 정의

```typescript
type AvailabilityConfig = {
  day_of_week: number          // 0 (Sun) ~ 6 (Sat)
  start_time: string           // "09:00"
  end_time: string             // "18:00"
  slot_duration_minutes: number // 60
  buffer_minutes: number        // 15
}

type CalendarEvent = {
  id: string
  start: string   // ISO8601
  end: string     // ISO8601
}

type TimeSlot = {
  start: string   // ISO8601
  end: string     // ISO8601
}
```

---

## 의사코드 (단계별)

### Step 1. 요청 날짜의 요일 확인

```
dayOfWeek = getDayOfWeek(date, timezone)
// date = "2025-06-10" → dayOfWeek = 2 (Tuesday)

if dayOfWeek != availability.day_of_week:
  return []  // 해당 날짜는 운영하지 않음
```

---

### Step 2. 운영 시간을 UTC Timestamp로 변환

```
workStart = toUTC(`${date}T${availability.start_time}`, timezone)
// e.g. "2025-06-10T09:00:00+09:00" → UTC

workEnd = toUTC(`${date}T${availability.end_time}`, timezone)
// e.g. "2025-06-10T18:00:00+09:00" → UTC
```

---

### Step 3. 슬롯 후보군 생성 (Candidate Slots)

```
slots = []
cursor = workStart

WHILE cursor + slot_duration <= workEnd:
  slotEnd = cursor + slot_duration_minutes
  slots.append({ start: cursor, end: slotEnd })
  cursor = slotEnd + buffer_minutes
  // 다음 슬롯 시작 = 이전 슬롯 종료 + 버퍼

// 예시 (9시~12시, 60분 슬롯, 15분 버퍼):
// [09:00~10:00], [10:15~11:15], [11:30~12:30] → 12:30 > 12:00이면 마지막 제외
```

---

### Step 4. Calendar 이벤트 필터링

```
// excludeEventId가 있으면 (리스케줄 케이스) 해당 이벤트 제외
filteredEvents = calendarEvents.filter(e => e.id != excludeEventId)
```

---

### Step 5. 충돌 슬롯 제거

```
availableSlots = []

FOR EACH slot IN slots:
  hasConflict = false

  FOR EACH event IN filteredEvents:
    // 겹침 조건: slot 시작이 이벤트 종료 전 AND slot 종료가 이벤트 시작 후
    IF slot.start < event.end AND slot.end > event.start:
      hasConflict = true
      BREAK

  IF NOT hasConflict:
    availableSlots.append(slot)
```

---

### Step 6. 과거 슬롯 제거 (옵션)

```
now = getCurrentUTCTime()

availableSlots = availableSlots.filter(slot => slot.start > now)
// 현재 시각 이후 슬롯만 반환
```

---

### Step 7. 결과 반환

```
RETURN availableSlots
// 각 슬롯은 ISO8601 UTC 문자열로 반환
```

---

## 전체 플로우 다이어그램

```
date + timezone
      │
      ▼
[Step 1] 요일 확인 ──── 운영 안 하는 날 → return []
      │
      ▼
[Step 2] 운영시간 → UTC 변환
      │
      ▼
[Step 3] 슬롯 후보 생성
         cursor = workStart
         WHILE cursor + duration <= workEnd
           append slot
           cursor += duration + buffer
      │
      ▼
[Step 4] excludeEventId 필터링
      │
      ▼
[Step 5] 충돌 검사
         FOR each slot
           FOR each event
             overlap? → 제거
      │
      ▼
[Step 6] 과거 슬롯 제거
      │
      ▼
[Step 7] TimeSlot[] 반환
```

---

## 겹침(Overlap) 조건 상세

```
두 기간 A(slot)와 B(event)가 겹치는 조건:

  A.start < B.end  AND  A.end > B.start

반대로 겹치지 않는 조건:
  A.end <= B.start  OR  A.start >= B.end
```

시각화:
```
Case 1: 완전히 앞       [slot]  [event]        → 겹침 없음
Case 2: 완전히 뒤       [event] [slot]          → 겹침 없음
Case 3: 부분 앞 겹침    [slot      ]            → 겹침 있음
                               [event     ]
Case 4: 부분 뒤 겹침        [slot      ]        → 겹침 있음
                        [event  ]
Case 5: 슬롯이 안에           [slot]            → 겹침 있음
                        [event        ]
Case 6: 슬롯이 밖에   [slot              ]      → 겹침 있음
                             [event]
```

---

## 엣지 케이스 처리

| 케이스 | 처리 방법 |
|--------|-----------|
| availability 없는 날 | 빈 배열 반환 |
| 모든 슬롯이 이벤트와 겹침 | 빈 배열 반환 |
| buffer = 0 | 슬롯 종료 직후 다음 시작 |
| 슬롯이 운영시간 끝을 초과 | WHILE 조건에서 자동 제거 |
| 리스케줄 (자기 슬롯 제외) | excludeEventId로 필터 |
| 타임존 변환 오류 | 에러 throw, 빈 배열 반환 금지 |
| Google Calendar 이벤트 all-day | start.date로 오는 경우 → 하루 전체 블록 처리 |

---

## 구현 참고 (TypeScript)

```typescript
// 겹침 검사 헬퍼
function isOverlapping(
  slotStart: Date,
  slotEnd: Date,
  eventStart: Date,
  eventEnd: Date
): boolean {
  return slotStart < eventEnd && slotEnd > eventStart;
}

// All-day 이벤트 처리
function normalizeEventTime(event: CalendarEvent): { start: Date; end: Date } {
  // Google Calendar는 all-day 이벤트를 { date: "YYYY-MM-DD" }로 반환
  const start = event.start.dateTime
    ? new Date(event.start.dateTime)
    : new Date(event.start.date + "T00:00:00Z");
  const end = event.end.dateTime
    ? new Date(event.end.dateTime)
    : new Date(event.end.date + "T23:59:59Z");
  return { start, end };
}
```
