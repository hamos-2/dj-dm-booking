# 타투 예약 및 CRM 관리 시스템 프로젝트 문서 (DJ-DM Booking)

현재 프로젝트의 전체적인 아키텍처, 데이터베이스 스키마, 핵심 기능 및 기술 스택을 정리한 문서입니다. 새로운 기능을 추가하거나 전체 구조를 파악할 때 참고용으로 사용할 수 있습니다.

---

## 1. 전체 디렉토리 구조 (Directory Architecture)

Next.js (App Router) 기반의 프론트엔드와 Supabase (Edge Functions, Database) 기반의 백엔드로 나뉘어진 전체 구조를 갖고 있습니다.

```text
booking-system/
├── src/
│   ├── app/                    # Next.js App Router 기반의 페이지 및 API 엔드포인트
│   │   ├── (public)
│   │   │   ├── booking/        # 고객용 예약 신청 페이지 및 완료 화면
│   │   │   └── page.tsx        # 랜딩 페이지 (Home)
│   │   ├── admin/              # 관리자 전용 대시보드
│   │   │   ├── bookings/       # 예약 현황 및 CRM 칸반(Kanban) 보드
│   │   │   ├── instagram/      # 인스타그램 메시지 연동 뷰
│   │   │   ├── login/          # 관리자 로그인 페이지
│   │   │   └── settings/       # 가용시간(Availability), API 설정 등 관리 기능
│   │   └── api/                # 클라이언트 및 외부 통신용 Next.js API Routes 처리망
│   │       ├── admin/          # 관리자 설정 관리 API (DB 직접 통신)
│   │       ├── auth/           # Google OAuth, Supabase 로그인을 위한 API
│   │       └── availability/   # 예약 가능한 달력 날짜 및 시간 반환 API
│   ├── components/             # React UI 컴포넌트 폴더
│   │   ├── ui/                 # 버튼, 입력폼 등 재사용 컴포넌트
│   │   ├── kanban/             # 예약자 상태 관리를 위한 칸반보드 컴포넌트
│   │   ├── admin/              # 관리자 페이지 관련 컴포넌트
│   │   └── booking/            # 예약 폼 진행 상태 관리 관련 컴포넌트
│   └── lib/                    # Supabase 연동 클라이언트 설정 등 공통 유틸리티
│
├── supabase/                   # 백엔드 & 머신 파편화 로직 (Supabase)
│   ├── migrations/             # PostgreSQL DB Scheme 및 Table 수정에 대한 SQL 파일 정의
│   └── functions/              # 서버리스 백엔드 로직 (Edge Functions - Deno 기반)
│       ├── createBooking/      # 예약 생성 시 중복 검증 및 구글 캘린더 연동, DB Insert 수행
│       ├── cancelBooking/      # 예약 취소 로직
│       ├── restoreBooking/     # 취소된 예약 복구
│       ├── rescheduleBooking/  # 예약 시간 변경 및 상태 처리 처리
│       ├── getAvailableSlots/  # 예약 가용시간 및 남은 슬롯 계산 로직
│       ├── instagramWebhook/   # 인스타그램 DM 수신 후 DB 연동 및 프로세싱
│       ├── replyInstagram/     # Webhook에서 IG로 응답보내기
│       └── processAutomationQueue/ # 자동화(트리거 기반 메세지 등) 메시지 전송 로직
│
├── package.json
└── tsconfig.json
```

---

## 2. 데이터베이스 스키마 (Database Schema)

Supabase(PostgreSQL) 기반으로 설계되어있습니다.

### 핵심 테이블 목록
* **`availability`**: 주간 기반 정규 예약 가능 요일, 오픈/마감 시간, 휴식 단위(Buffer)를 설정합니다.
* **`specific_availability`**: 일반 스케줄을 무시하고, 지정한 날짜에만 특정 슬롯을 덮어씌울 수 있는 예외처리(특정 일자) 테이블입니다. 
* **`clients`**: 고객들의 세부 정보(이름, 이메일, 연락처, 인스타그램 ID)를 담는 CRM용 고객 테이블입니다.
* **`bookings`**: 예약 내역의 세부정보 및 스케줄 일정 (시작, 종료), 타투 부위, 사이즈, 연결된 고객 아이디(`client_id`), 예약 상태표시 등을 갖습니다. `booking_status` Enum (confirmed, canceled, inquiry, consultation_scheduled, pending_deposit, completed)을 토대로 칸반보드 등에서 상태를 구분합니다.
* **`images`**: 예약 신청 시 고객이 제출한 레퍼런스 이미지나 추후 디자인 시안을 저장합니다.
* **`instagram_users` & `instagram_messages`**: 연동된 인스타그램 DM 메시지와 유저 세션 데이터를 기록하여 CRM 보드에서 답장 및 수신 내역을 확인할 때 사용합니다.
* **`oauth_tokens`**, **`integration_settings`**: Google Calendar 등 서드파티 통합용 Auth Token 및 환경변수를 저장하는 테이블입니다.

---

## 3. 현재 구현된 핵심 기능

1. **외부 플랫폼 연동 예약 시스템 (고객용)**
   * 요일별/예외적 일자별 가용 시간 자동 계산 기반의 달력 및 시간 선택 
   * 예약 생성 시 중복 방지 설계 구현 완료
   * 참고 이미지 다중 업로드(`Supabase Storage` 활용) 및 개인정보/타투 크기 등 부가 정보 수집
   * **Google Calendar 연동**: 새로운 예약을 접수하면 Google 계정에 일정을 곧바로 삽입(Sync)

2. **CRM 및 관리자 대시보드 (Admin Dashboard)**
   * **예약 칸반보드(Kanban Board)**: Drag and Drop으로 문의(inquiry)부터 시술완료(completed)까지 예약 진행 상태 통합 관리.
   * **가용성(Availability) 제어 패널**: 정규 영업 시간 관리 및 공휴일 단위/특정일자 시간 커스텀 (Overrides) 설정/해제. 
   * **예약 관리**: 예약 승인, 취소 처리, 스케줄 재조정(Reschedule) 기능.

3. **Instagram DM 챗봇 및 Webhook 자동화 연동**
   * 인스타그램 Graph API와 서버리스(Edge Function `instagramWebhook`) 연결을 통해 인스타그램 DM의 실시간 수신 및 DB 기록
   * 새로운 예약 접수 시 칸반보드와 連動되어 인스타그램 메시지가 활성화되고 자동화된 메시지 프로세스를 발동 가능.

4. **Background 자동화(Automation Queue)**
   * 상태(Status)가 변경될 때 등에 따라 고객에게 안내 메일 또는 DM을 보내기 위해 Edge Function의 비동기 호출을 지원.

---

## 4. 프로젝트 기술 스택

* **프론트엔드 (Frontend)**: `Next.js 16.1.6` (App Router 방식), `React 19.2.3`, `TypeScript`
* **스타일링 (Styling)**: `Tailwind CSS v4`
* **UI 컴포넌트 라이브러리 (UI/Interaction)**: 칸반 보드 동작을 위한 `@dnd-kit/core` 및 커스텀 디자인 기반 Tailwind UI 요소
* **백엔드/BaaS**: `Supabase` (Auth, Database, Storage 관리) 및 Edge Functions (Deno 기반의 서버리스 런타임 통신)
* **데이터베이스/ORM**: `PostgreSQL` (Supabase DB)
* **API 설계 요소**: `Google Calendar API`, `Instagram Graph API` (Meta App 연동)
* **날짜 포맷팅**: `date-fns`, `date-fns-tz` 타임존 안전성.

---

## 5. 추가 기록 및 향후 개발 추천 기능 (Roadmap & Recommendations)

* **Payment 연동 (결제 관리)**: 
  예약금(pending_deposit 상태)의 입금 관리 프로세스를 현재 수동에서, Stripe 또는 한국 결제 Webhook으로 이어지도록 구성을 확장할 수 있습니다.
* **통계 및 애널리틱스 (Analytics Dashboard)**:
  월별 시술 부위 분포도, 취소율 대비 예약 성사율 등 CRM 데이터를 차트 컴포넌트로 관리자 페이지 첫 화면에 표기하면 유용할 수 있습니다.
* **CI/CD 파이프라인(Github Actions)**:
  `src` 내 코드가 푸쉬될 때 Next.js 빌드를 검증하고, 나아가 Vercel이나 Netlify로 자동 프리뷰(Preview) 배포가 올라가도록 구성하면 개발 편의성이 대폭 안정화됩니다.
