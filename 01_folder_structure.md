# 📁 Claude용 폴더 구조

> Next.js (App Router) + Supabase Edge Functions 기준  
> Google Calendar Centric Booking System

---

## Root Structure

```
booking-system/
├── app/                        # Next.js App Router
├── components/                 # Shared UI components
├── lib/                        # Utilities, API clients
├── supabase/                   # Supabase config & Edge Functions
├── types/                      # TypeScript type definitions
├── public/                     # Static assets
├── .env.local                  # Local env vars (gitignored)
├── .env.example                # Env var template
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## `/app` — Next.js App Router

```
app/
├── layout.tsx                  # Root layout (font, theme, etc.)
├── page.tsx                    # Landing / redirect
│
├── booking/
│   ├── page.tsx                # Customer booking page (date picker + slots)
│   └── confirm/
│       └── page.tsx            # Booking confirmation page
│
├── admin/
│   ├── layout.tsx              # Admin layout (sidebar, auth guard)
│   ├── page.tsx                # Dashboard home (today's bookings)
│   ├── bookings/
│   │   ├── page.tsx            # All bookings list
│   │   └── [id]/
│   │       └── page.tsx        # Booking detail + reschedule
│   ├── instagram/
│   │   └── page.tsx            # Instagram DM inbox + confirm booking
│   └── settings/
│       ├── page.tsx            # Admin settings
│       └── availability/
│           └── page.tsx        # Set weekly availability
│
└── api/                        # Next.js Route Handlers (thin wrappers)
    └── auth/
        └── google/
            └── callback/
                └── route.ts    # Google OAuth callback handler
```

---

## `/components` — UI Components

```
components/
├── booking/
│   ├── DatePicker.tsx          # Calendar date selector
│   ├── SlotGrid.tsx            # Available time slot grid
│   ├── BookingForm.tsx         # Customer name/contact form
│   └── BookingSuccess.tsx      # Confirmation message
│
├── admin/
│   ├── BookingTable.tsx        # Booking list table
│   ├── BookingCard.tsx         # Single booking card
│   ├── RescheduleModal.tsx     # Reschedule dialog
│   ├── CancelConfirmModal.tsx  # Cancel confirmation
│   ├── DmInbox.tsx             # Instagram DM message list
│   ├── DmConvertModal.tsx      # DM → Booking confirm modal
│   └── AvailabilityForm.tsx    # Weekly availability editor
│
└── ui/                         # Generic UI primitives
    ├── Button.tsx
    ├── Modal.tsx
    ├── Badge.tsx               # Status badge (confirmed/canceled)
    ├── Spinner.tsx
    └── Toast.tsx
```

---

## `/lib` — Utilities & API Clients

```
lib/
├── google/
│   ├── calendar.ts             # Google Calendar API wrapper
│   │   # - getEvents(userId, dateRange)
│   │   # - createEvent(userId, eventData)
│   │   # - patchEvent(userId, eventId, eventData)
│   │   # - deleteEvent(userId, eventId)
│   └── oauth.ts                # Token refresh logic
│
├── slots/
│   └── calculateSlots.ts       # Slot calculation pure function
│   #   Input: availability config + calendar events + date
│   #   Output: available slot array
│
├── supabase/
│   ├── client.ts               # Browser Supabase client
│   ├── server.ts               # Server-side Supabase client
│   └── admin.ts                # Service role client (for Edge Functions)
│
└── utils/
    ├── datetime.ts             # Timezone-safe date helpers
    ├── constants.ts            # App-wide constants
    └── validators.ts           # Input validation schemas (zod)
```

---

## `/supabase` — Supabase Config & Edge Functions

```
supabase/
├── config.toml                 # Supabase local dev config
│
├── migrations/
│   ├── 001_initial_schema.sql  # users, availability, bookings
│   ├── 002_booking_history.sql
│   ├── 003_oauth_tokens.sql
│   └── 004_instagram_messages.sql
│
├── seed.sql                    # Dev seed data
│
└── functions/
    ├── getAvailableSlots/
    │   └── index.ts            # GET /functions/v1/getAvailableSlots
    │
    ├── createBooking/
    │   └── index.ts            # POST /functions/v1/createBooking
    │
    ├── rescheduleBooking/
    │   └── index.ts            # POST /functions/v1/rescheduleBooking
    │
    ├── cancelBooking/
    │   └── index.ts            # POST /functions/v1/cancelBooking
    │
    ├── instagramWebhook/
    │   └── index.ts            # POST /functions/v1/instagramWebhook
    │
    ├── googleOAuthCallback/
    │   └── index.ts            # GET /functions/v1/googleOAuthCallback
    │
    └── _shared/                # Shared utilities across functions
        ├── googleClient.ts     # Shared Google API client factory
        ├── tokenManager.ts     # Access token refresh helper
        ├── cors.ts             # CORS headers
        └── errors.ts           # Standard error responses
```

---

## `/types` — TypeScript Definitions

```
types/
├── booking.ts          # Booking, BookingHistory, BookingStatus
├── availability.ts     # Availability, TimeSlot
├── google.ts           # GoogleCalendarEvent, OAuthToken
├── instagram.ts        # InstagramMessage
└── api.ts              # Request/Response types for all Edge Functions
```

---

## Environment Variables (`.env.example`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Instagram API
INSTAGRAM_APP_SECRET=
INSTAGRAM_VERIFY_TOKEN=

# App
NEXT_PUBLIC_APP_URL=
ADMIN_USER_ID=          # UUID of the single admin user

# Email (Optional)
RESEND_API_KEY=
```

---

## Implementation Order (Claude 실행 순서 권장)

```
1. supabase/migrations/*.sql         → DB 스키마 먼저
2. types/*.ts                        → 타입 정의
3. lib/google/oauth.ts               → OAuth 토큰 관리
4. lib/google/calendar.ts            → Calendar API 래퍼
5. lib/slots/calculateSlots.ts       → 슬롯 계산 로직
6. supabase/functions/_shared/       → 공유 유틸리티
7. supabase/functions/getAvailableSlots/
8. supabase/functions/createBooking/
9. supabase/functions/rescheduleBooking/
10. supabase/functions/cancelBooking/
11. supabase/functions/instagramWebhook/
12. app/booking/*                    → 고객 예약 페이지
13. app/admin/*                      → 어드민 대시보드
14. components/**                    → UI 컴포넌트
```
