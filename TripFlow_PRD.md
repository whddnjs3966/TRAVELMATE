# TripFlow — 여행 플래너 PRD

**Product Requirements Document**
**Version:** 1.0
**작성일:** 2026-04-02
**상태:** Draft

---

## 1. 프로덕트 개요

### 1.1 비전

"여행 계획의 모든 귀찮음을 없앤다."

월과 일정만 선택하면 최저가 항공권부터 날씨 맞춤 동선, 맛집, 준비물까지 한 번에 완성되는 올인원 여행 플래너.

### 1.2 핵심 가치

- **원스텝 검색**: 월 + 일수 + 출발지-도착지만 입력하면 최적 항공권 자동 탐색
- **AI 맞춤 일정**: 작년 날씨 데이터 기반으로 비 오는 날엔 실내, 맑은 날엔 야외 동선 자동 배치
- **결정 장애 해소**: 여행지가 없을 때, 취향 기반 추천으로 목적지까지 결정해줌

### 1.3 타겟 사용자

- **Primary**: 20~30대 직장인. 여행은 가고 싶지만 계획 세우기 귀찮은 사람
- **Secondary**: 가족 여행 계획하는 30~40대. 예산과 날씨가 중요한 사람
- **Tertiary**: 해외여행 초보. 어디로 가야 할지, 뭘 준비해야 할지 모르는 사람

### 1.4 플랫폼

- **Phase 1~3**: 모바일 퍼스트 반응형 웹 (PWA)
- **Phase 4**: React Native 앱 (Google Play 출시, iOS는 추후)
- 웹과 앱은 공통 디자인 시스템 + API 공유

---

## 2. 기술 아키텍처

### 2.1 기술 스택

| 레이어 | 기술 | 선정 이유 |
|--------|------|-----------|
| 프론트엔드 | Next.js 14+ (App Router) | SSR/SSG 지원, React Native과 로직 공유 가능 |
| 모바일 앱 | React Native + Expo | Next.js와 컴포넌트/훅 공유, EAS Build로 스토어 배포 |
| 백엔드 API | Cloudflare Workers + Hono.js | Edge 배포, 콜드스타트 없음, 무료 100K req/일 |
| 데이터베이스 | Supabase (PostgreSQL) | Auth 내장, RLS, 무료 500MB + 50K MAU |
| 캐시 | Upstash Redis | 서버리스 Redis, 무료 256MB + 500K cmd/월 |
| 파일 저장 | Supabase Storage | 무료 1GB, 일정 PDF/이미지 저장 |
| 호스팅 | Cloudflare Pages | 무제한 배포, 글로벌 CDN, 무료 |
| 모노레포 | Turborepo | 웹/앱/공통 패키지 관리 |

### 2.2 프로젝트 구조 (Monorepo)

```
tripflow/
├── apps/
│   ├── web/              # Next.js 웹앱
│   ├── mobile/           # React Native + Expo 앱
│   └── api/              # Cloudflare Workers API
├── packages/
│   ├── ui/               # 공유 UI 컴포넌트 (React Native Web 호환)
│   ├── core/             # 비즈니스 로직, 타입, 유틸
│   ├── api-client/       # API 호출 래퍼 (웹/앱 공유)
│   └── config/           # ESLint, TS, Tailwind 공유 설정
├── turbo.json
└── package.json
```

### 2.3 외부 API 의존성

| API | 용도 | 무료 한도 | 캐싱 전략 |
|-----|------|-----------|-----------|
| Amadeus Self-Service | 항공권 검색/가격 | 2,000건/월 (Search), 3,000건/월 (Price) | Redis 30분 TTL |
| Amadeus Inspiration | 여행지 추천 (최저가 목적지) | 2,000건/월 | Redis 24시간 TTL |
| 기상청 과거관측 API | 국내 과거 날씨 (ASOS) | 무제한 (공공데이터) | DB 영구 저장 |
| OpenWeatherMap | 해외 과거/현재 날씨 | 1,000건/일 | DB 영구 저장 (과거), Redis 1시간 (현재) |
| Google Places API | 맛집, 관광지 검색 | $200 크레딧/월 (~약 5,000건) | Redis 7일 TTL |
| Kakao Maps SDK | 지도 표시, 경로 시각화 | 300,000건/일 | 클라이언트 사이드 |
| Google Gemini API | AI 일정 생성, 체크리스트 | 15 RPM 무료 | Redis 24시간 TTL |
| 한국관광공사 TourAPI | 국내 관광지 상세정보 | 무제한 (공공데이터) | DB 주간 갱신 |
| Supabase Auth | 소셜 로그인 (카카오/구글) | 50,000 MAU | 해당 없음 |

### 2.4 캐싱 아키텍처

```
사용자 요청
    │
    ▼
[Cloudflare Workers]
    │
    ├─ Redis 캐시 HIT → 즉시 응답 (평균 <50ms)
    │
    └─ Redis 캐시 MISS
         │
         ├─ 항공권 → Amadeus API 호출 → 결과 Redis 저장 (TTL 30분)
         ├─ 날씨   → 기상청/OpenWeather → 결과 DB 영구 저장
         ├─ 맛집   → Google Places → 결과 Redis 저장 (TTL 7일)
         └─ AI일정 → Gemini API → 결과 Redis 저장 (TTL 24시간)
```

**핵심 원칙**: 같은 검색 조건의 두 번째 요청부터는 외부 API를 호출하지 않는다.

---

## 3. 데이터베이스 스키마

### 3.1 핵심 테이블

```sql
-- 사용자
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  provider TEXT NOT NULL,           -- 'kakao' | 'google'
  preferences JSONB DEFAULT '{}',   -- 여행 스타일, 선호 기후 등
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 여행 일정 (AI 생성 결과)
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                -- '제주도 3박4일 봄 여행'
  destination TEXT NOT NULL,          -- '제주도' | 'Tokyo'
  destination_type TEXT NOT NULL,     -- 'domestic' | 'international'
  departure_city TEXT NOT NULL,       -- '대구'
  start_date DATE,
  end_date DATE,
  duration_nights INT NOT NULL,       -- 3 (박)
  status TEXT DEFAULT 'draft',        -- 'draft' | 'saved' | 'completed'
  share_token TEXT UNIQUE,            -- 공유 링크용 토큰
  total_budget_estimate INT,          -- 예상 총 비용 (원)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 일정 상세 (일별)
CREATE TABLE trip_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number INT NOT NULL,            -- 1, 2, 3...
  date DATE,
  weather_summary JSONB,              -- { temp_high, temp_low, condition, rain_prob }
  spots JSONB NOT NULL DEFAULT '[]',  -- [{ name, type, lat, lng, time, memo }]
  restaurants JSONB DEFAULT '[]',     -- [{ name, category, rating, lat, lng, meal }]
  transport_notes TEXT,               -- 이동 수단 메모
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 항공권 검색 결과 (캐싱 + 히스토리)
CREATE TABLE flight_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  origin TEXT NOT NULL,               -- 'TAE' (IATA 코드)
  destination TEXT NOT NULL,          -- 'CJU'
  departure_date DATE NOT NULL,
  return_date DATE,
  cheapest_price INT,                 -- 최저가 (원)
  currency TEXT DEFAULT 'KRW',
  results JSONB,                      -- Amadeus 응답 요약
  searched_at TIMESTAMPTZ DEFAULT now()
);

-- 가격 알림 구독
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  month INT NOT NULL,                 -- 1~12
  duration_nights INT NOT NULL,
  target_price INT NOT NULL,          -- 목표 가격 이하 시 알림
  is_active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_price INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 여행 체크리스트
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',  -- [{ text, checked, category }]
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 날씨 데이터 캐시 (영구 저장)
CREATE TABLE weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL,             -- '제주' | 'tokyo'
  date DATE NOT NULL,
  source TEXT NOT NULL,               -- 'kma' | 'openweather'
  data JSONB NOT NULL,                -- { temp_high, temp_low, rain, humidity, condition }
  UNIQUE(location, date, source)
);

-- 여행지 큐레이션 DB
CREATE TABLE destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  country TEXT NOT NULL,
  type TEXT NOT NULL,                  -- 'domestic' | 'international'
  tags TEXT[] DEFAULT '{}',           -- ['힐링', '맛집', '액티비티', '역사']
  best_months INT[] DEFAULT '{}',    -- [3, 4, 5, 9, 10]
  avg_budget_per_day INT,            -- 일 평균 예산 (원)
  climate TEXT,                       -- 'tropical' | 'temperate' | 'cold'
  companion_fit TEXT[],               -- ['solo', 'couple', 'family', 'friends']
  description TEXT,
  thumbnail_url TEXT,
  iata_code TEXT,                     -- 가장 가까운 공항
  lat DECIMAL,
  lng DECIMAL,
  is_active BOOLEAN DEFAULT true
);

-- 사용자 후기
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  photos TEXT[] DEFAULT '{}',         -- Supabase Storage 경로
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 인덱스

```sql
CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_trips_share ON trips(share_token);
CREATE INDEX idx_weather_lookup ON weather_cache(location, date);
CREATE INDEX idx_destinations_tags ON destinations USING GIN(tags);
CREATE INDEX idx_destinations_months ON destinations USING GIN(best_months);
CREATE INDEX idx_alerts_active ON price_alerts(is_active) WHERE is_active = true;
CREATE INDEX idx_flight_searches_route ON flight_searches(origin, destination, departure_date);
```

### 3.3 Row Level Security (RLS)

```sql
-- 사용자는 자신의 데이터만 접근
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own trips"
  ON trips FOR ALL
  USING (auth.uid() = user_id);

-- 공유 링크는 누구나 읽기 가능
CREATE POLICY "Anyone can view shared trips"
  ON trips FOR SELECT
  USING (share_token IS NOT NULL);

-- 후기는 누구나 읽기 가능, 작성은 본인만
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can write own reviews"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## 4. API 엔드포인트 설계

### 4.1 인증

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /auth/kakao | 카카오 OAuth 로그인 |
| POST | /auth/google | 구글 OAuth 로그인 |
| POST | /auth/logout | 로그아웃 |
| GET | /auth/me | 현재 사용자 정보 |

### 4.2 항공권 검색

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /flights/search | 항공권 검색 (origin, destination, month, duration) |
| GET | /flights/cheapest-dates | 특정 구간의 월별 최저가 날짜 |
| GET | /flights/inspiration | 출발지 기준 최저가 목적지 추천 |
| POST | /flights/alerts | 가격 알림 등록 |
| DELETE | /flights/alerts/:id | 가격 알림 삭제 |
| GET | /flights/alerts | 내 가격 알림 목록 |

### 4.3 여행 일정

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | /trips/generate | AI 일정 생성 (destination, duration, month) |
| GET | /trips | 내 여행 일정 목록 |
| GET | /trips/:id | 일정 상세 조회 |
| PUT | /trips/:id | 일정 수정 |
| DELETE | /trips/:id | 일정 삭제 |
| POST | /trips/:id/share | 공유 링크 생성 |
| GET | /trips/shared/:token | 공유된 일정 조회 (비로그인 접근 가능) |
| GET | /trips/:id/export/pdf | PDF 내보내기 |

### 4.4 여행지 추천

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /destinations/recommend | 조건 기반 추천 (budget, style, month, companion) |
| GET | /destinations/:id | 여행지 상세 정보 |
| GET | /destinations/popular | 인기 여행지 |

### 4.5 날씨

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /weather/history | 과거 날씨 조회 (location, month, year) |
| GET | /weather/forecast | 현재/단기 예보 |

### 4.6 장소

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /places/restaurants | 맛집 검색 (location, category) |
| GET | /places/attractions | 관광지 검색 |
| GET | /places/:id | 장소 상세 |

### 4.7 체크리스트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /trips/:id/checklist | 체크리스트 조회 |
| PUT | /trips/:id/checklist | 체크리스트 업데이트 (체크 토글) |

### 4.8 후기

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /reviews?destination=제주도 | 여행지별 후기 |
| POST | /reviews | 후기 작성 |

---

## 5. 화면 설계

### 5.1 디자인 원칙

- **모바일 퍼스트**: 375px 기준 설계, 태블릿/데스크톱으로 확장
- **심플 & 세련**: 화이트 베이스, 메인 컬러 1개 + 보조 1개. 과도한 장식 배제
- **원핸드 UX**: 하단 탭 네비게이션, 주요 CTA 버튼은 엄지 닿는 영역
- **카드 기반 레이아웃**: 정보 밀도 조절, 스크롤 기반 탐색
- **마이크로 인터랙션**: 로딩 스켈레톤, 부드러운 전환 애니메이션

### 5.2 컬러 시스템

```
Primary:     #0066FF (파란색 계열, 하늘/여행 연상)
Primary Light: #E8F1FF
Secondary:   #FF6B35 (주황, CTA 강조)
Background:  #FAFAFA
Surface:     #FFFFFF
Text Primary:   #1A1A1A
Text Secondary: #6B7280
Text Tertiary:  #9CA3AF
Border:      #E5E7EB
Success:     #10B981
Warning:     #F59E0B
Error:       #EF4444
```

### 5.3 타이포그래피

```
Font Family: Pretendard (한국어 최적화)
Heading 1:   24px / Bold (700)
Heading 2:   20px / SemiBold (600)
Heading 3:   17px / SemiBold (600)
Body:        15px / Regular (400)
Caption:     13px / Regular (400)
Overline:    11px / Medium (500) / uppercase
```

### 5.4 화면 구성

#### Tab 1: 홈 (탐색)

```
┌─────────────────────────────┐
│  TripFlow          [알림]🔔  │
├─────────────────────────────┤
│                             │
│  어디로 떠나볼까요?           │
│                             │
│  ┌─────────────────────┐    │
│  │ 🛫 출발지  │ 대구     │    │
│  ├─────────────────────┤    │
│  │ 🛬 도착지  │ 선택하기  │    │
│  ├─────────────────────┤    │
│  │ 📅 여행월  │ 4월      │    │
│  ├─────────────────────┤    │
│  │ 🌙 일정   │ 3박 4일   │    │
│  └─────────────────────┘    │
│                             │
│  [ 🔍 최저가 항공권 찾기 ]    │
│                             │
│  ─────────────────────────  │
│                             │
│  🎯 여행지 고민 중이라면?      │
│  [ 나에게 맞는 여행지 추천 → ] │
│                             │
│  ─────────────────────────  │
│                             │
│  🔥 지금 뜨는 여행지           │
│  ┌────┐ ┌────┐ ┌────┐      │
│  │제주 │ │오사│ │다낭│       │
│  │ 도 │ │카 │ │   │       │
│  │45K~│ │89K~│ │120K│      │
│  └────┘ └────┘ └────┘      │
│                             │
├─────────────────────────────┤
│  🏠    ✈️    📋    👤       │
│  홈   검색   내일정  마이    │
└─────────────────────────────┘
```

#### Tab 2: 검색 결과

```
┌─────────────────────────────┐
│  ← 대구 → 제주 │ 4월 3박4일  │
├─────────────────────────────┤
│                             │
│  가장 저렴한 날짜             │
│  ┌─────────────────────┐    │
│  │  4/7(월)~4/10(목)     │    │
│  │  왕복 ₩42,300 🏷️최저가│    │
│  │  진에어 · 직항 1h 5m   │    │
│  │  [이 날짜로 일정 만들기] │    │
│  └─────────────────────┘    │
│                             │
│  다른 날짜 옵션               │
│  ┌─────────────────────┐    │
│  │  4/14~4/17 ₩48,900   │    │
│  │  제주항공 · 직항        │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │  4/21~4/24 ₩51,200   │    │
│  │  티웨이 · 직항          │    │
│  └─────────────────────┘    │
│                             │
│  ─────────────────────────  │
│  💰 가격 떨어지면 알림 받기    │
│  목표가: [₩40,000 ▼]        │
│  [ 알림 설정 ]               │
│                             │
├─────────────────────────────┤
│  🏠    ✈️    📋    👤       │
└─────────────────────────────┘
```

#### AI 일정 생성 결과

```
┌─────────────────────────────┐
│  ← 제주도 3박4일 봄 여행      │
│  4/7(월) ~ 4/10(목)         │
├─────────────────────────────┤
│                             │
│  🌤️ 작년 4월 날씨 분석        │
│  평균 16°C │ 비올확률 30%    │
│  ☀️☁️🌧️☀️                   │
│                             │
│  ── Day 1 (4/7 월) ☀️ ──    │
│                             │
│  🕐 10:30  제주공항 도착       │
│  🕑 11:30  ☕ 카페 │ 해안뷰   │
│  🕐 12:30  🍽️ 점심            │
│  │  흑돼지거리 ★4.5          │
│  🕑 14:00  🏖️ 협재해수욕장    │
│  🕐 17:00  🏨 숙소 체크인     │
│  🕑 18:30  🍽️ 저녁            │
│  │  해산물 맛집 ★4.3         │
│                             │
│  ── Day 2 (4/8 화) ☁️ ──    │
│  ...                        │
│                             │
│  ┌─ [지도 보기] [체크리스트] ─┐│
│                             │
│  ─────────────────────────  │
│  💰 예상 비용                 │
│  항공 ₩42,300 + 숙박 ₩180K  │
│  식비 ₩120K + 교통 ₩40K     │
│  총 약 ₩382,300              │
│                             │
│  ┌─────────────────────┐    │
│  │   [일정 저장하기] 💾     │    │
│  │   [공유하기] 🔗          │    │
│  │   [PDF 내보내기] 📄      │    │
│  └─────────────────────┘    │
│                             │
├─────────────────────────────┤
│  🏠    ✈️    📋    👤       │
└─────────────────────────────┘
```

#### 여행지 추천 플로우

```
Step 1: 예산
┌─────────────────────────────┐
│  어떤 여행을 찾고 계신가요?    │
│                             │
│  💰 1인 예산은?               │
│                             │
│  ┌───────────┐              │
│  │ 30만원 이하 │  가성비 여행  │
│  └───────────┘              │
│  ┌───────────┐              │
│  │ 30~70만원  │  적당한 여행  │
│  └───────────┘              │
│  ┌───────────┐              │
│  │ 70만원 이상 │  럭셔리 여행  │
│  └───────────┘              │
└─────────────────────────────┘

Step 2: 스타일
┌─────────────────────────────┐
│  어떤 스타일이 좋아요?        │
│  (복수 선택 가능)             │
│                             │
│  [🏖️ 힐링/휴양]  [🍜 맛집투어]│
│  [🏔️ 자연/경치]  [🎢 액티비티]│
│  [🏛️ 역사/문화]  [🛍️ 쇼핑]   │
└─────────────────────────────┘

Step 3: 동반자
┌─────────────────────────────┐
│  누구와 함께 가나요?          │
│                             │
│  [🧑 혼자]    [💑 연인]      │
│  [👨‍👩‍👧 가족]   [👫 친구]      │
└─────────────────────────────┘

Step 4: 결과
┌─────────────────────────────┐
│  이런 여행지는 어때요?         │
│                             │
│  ┌─────────────────────┐    │
│  │  📸 [제주도 사진]       │    │
│  │  🏆 1위 추천            │    │
│  │  제주도                 │    │
│  │  맛집 · 자연 · 3박4일   │    │
│  │  예산 약 35만원          │    │
│  │  [이 여행지로 계획 →]   │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │  📸 [다낭 사진]         │    │
│  │  2위 추천               │    │
│  │  다낭, 베트남            │    │
│  │  ...                   │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

#### Tab 3: 내 일정

```
┌─────────────────────────────┐
│  내 여행 일정                 │
├─────────────────────────────┤
│                             │
│  📌 다가오는 여행              │
│  ┌─────────────────────┐    │
│  │  제주도 3박4일          │    │
│  │  4/7 ~ 4/10 │ D-5     │    │
│  │  ✈️ ₩42,300 확정       │    │
│  └─────────────────────┘    │
│                             │
│  📋 저장된 일정               │
│  ┌─────────────────────┐    │
│  │  오사카 4박5일          │    │
│  │  아직 미정 │ 초안       │    │
│  └─────────────────────┘    │
│                             │
│  🔔 가격 알림                 │
│  ┌─────────────────────┐    │
│  │  대구→제주 │ 5월 3박    │    │
│  │  목표 ₩40,000          │    │
│  │  현재 ₩45,200 📈       │    │
│  └─────────────────────┘    │
│                             │
├─────────────────────────────┤
│  🏠    ✈️    📋    👤       │
└─────────────────────────────┘
```

#### Tab 4: 마이페이지

```
┌─────────────────────────────┐
│  마이페이지                   │
├─────────────────────────────┤
│                             │
│  👤 홍길동                    │
│  kakao 연동                  │
│                             │
│  ─────────────────────────  │
│  여행 스타일 설정       →     │
│  알림 설정             →     │
│  지난 여행 후기 관리    →     │
│  ─────────────────────────  │
│  공지사항              →     │
│  의견 보내기            →     │
│  버전 정보 v1.0.0      →     │
│  ─────────────────────────  │
│  로그아웃                    │
│                             │
├─────────────────────────────┤
│  🏠    ✈️    📋    👤       │
└─────────────────────────────┘
```

---

## 6. 핵심 유저 플로우

### 6.1 항공권 검색 → 일정 생성 플로우

```
[홈 화면]
   │ 출발지/도착지/월/일수 입력
   ▼
[항공권 검색 API 호출]
   │ Amadeus Flight Offers Search
   │ → Redis 캐시 확인 → MISS면 API 호출
   ▼
[검색 결과 화면]
   │ 최저가 날짜 순 정렬
   │ 사용자가 날짜 선택
   ▼
[AI 일정 생성 API 호출]
   │ 1. 해당 날짜의 과거 날씨 조회 (기상청/OpenWeather)
   │ 2. 날씨 기반 실내/야외 동선 생성 (Gemini)
   │ 3. 동선별 맛집/관광지 매칭 (Google Places)
   │ 4. 체크리스트 자동 생성 (Gemini)
   │ 5. 예산 추정 계산
   ▼
[일정 결과 화면]
   │ 일별 타임라인 + 지도 + 비용 요약
   │
   ├── [저장] → Supabase DB 저장
   ├── [공유] → 공유 토큰 생성 → 링크 복사
   ├── [PDF] → 서버사이드 PDF 생성 → 다운로드
   └── [가격알림] → 더 싸지면 알림 등록
```

### 6.2 여행지 추천 플로우

```
[홈 화면 - "여행지 추천" 탭]
   │
   ▼
[Step 1] 예산 선택 (3단계)
   ▼
[Step 2] 여행 스타일 선택 (복수 가능, 6가지)
   ▼
[Step 3] 동반자 유형 선택
   ▼
[추천 로직 실행]
   │ 1. destinations 테이블 필터링 (예산, 스타일 태그, 동반자)
   │ 2. 선택한 월의 best_months 매칭
   │ 3. Amadeus Inspiration API로 해당 목적지 최저가 확인
   │ 4. 점수 산정 후 상위 5개 추천
   ▼
[추천 결과 화면]
   │ 여행지 카드 (사진 + 가격 + 매칭률)
   │ 사용자가 여행지 선택
   ▼
[항공권 검색 플로우로 이동]
```

---

## 7. AI 프롬프트 설계

### 7.1 일정 생성 프롬프트

```
당신은 전문 여행 플래너입니다.
아래 조건에 맞는 여행 일정을 JSON 형식으로 생성해주세요.

[조건]
- 여행지: {destination}
- 기간: {start_date} ~ {end_date} ({duration}박 {duration+1}일)
- 출발지: {departure_city}
- 날씨 데이터: {weather_data}

[규칙]
1. 비올 확률 50% 이상인 날은 실내 위주 동선 (박물관, 카페, 쇼핑)
2. 맑은 날은 야외 위주 동선 (해변, 공원, 전망대)
3. 각 일정에 점심, 저녁 맛집 1곳씩 포함
4. 이동 동선이 효율적이도록 같은 지역 스팟을 묶어서 배치
5. 첫날은 도착 시간 고려, 마지막 날은 출발 시간 고려

[출력 형식]
{
  "days": [
    {
      "day_number": 1,
      "theme": "서귀포 해안 탐방",
      "spots": [
        {
          "time": "10:30",
          "name": "장소명",
          "type": "attraction|restaurant|cafe|hotel",
          "category": "해변|박물관|맛집|...",
          "duration_min": 60,
          "memo": "한 줄 팁",
          "indoor": false
        }
      ]
    }
  ],
  "packing_tips": ["우산", "썬크림", ...],
  "budget_estimate": {
    "food": 120000,
    "transport": 40000,
    "admission": 15000,
    "accommodation": 180000
  }
}
```

### 7.2 체크리스트 생성 프롬프트

```
여행 조건에 맞는 준비물 체크리스트를 생성해주세요.

[조건]
- 여행지: {destination} ({domestic/international})
- 기간: {duration}박
- 날씨: 평균 {temp}°C, 비 확률 {rain_prob}%
- 계절: {season}

[카테고리별로 분류]
- 필수서류 (여권, 보험 등)
- 의류
- 세면/위생
- 전자기기
- 기타 (날씨/여행지 특화)

JSON 배열로 출력: [{ "category": "...", "item": "...", "priority": "must|recommend|optional" }]
```

---

## 8. 비기능 요구사항

### 8.1 성능

| 지표 | 목표 |
|------|------|
| 항공권 검색 응답 (캐시 HIT) | < 200ms |
| 항공권 검색 응답 (캐시 MISS) | < 3초 |
| AI 일정 생성 | < 8초 (스트리밍 응답) |
| 페이지 초기 로드 (LCP) | < 2.5초 |
| First Input Delay | < 100ms |

### 8.2 보안

- Supabase RLS로 데이터 접근 제어
- API Rate Limiting: IP 기반 분당 30회
- CORS 화이트리스트 설정
- API 키는 Workers 환경변수 (Secrets)로 관리, 프론트엔드 노출 금지
- 사용자 입력 sanitize (XSS 방지)
- HTTPS only (Cloudflare 자동)

### 8.3 에러 처리

- 외부 API 장애 시 graceful degradation (캐시 데이터 우선 반환)
- Amadeus 월간 한도 초과 시 사용자에게 안내 + 대기열 처리
- 네트워크 오프라인 시 저장된 일정은 로컬에서 조회 가능 (PWA)

### 8.4 모니터링

- Cloudflare Analytics (무료 내장)
- Supabase Dashboard (DB 사용량)
- Upstash Console (Redis 커맨드 사용량)
- API별 일일 호출 카운터 (Redis INCR)

---

## 9. 개발 로드맵

### Phase 1: 핵심 MVP (4~5주)

| 주차 | 작업 | 산출물 |
|------|------|--------|
| 1주 | 인프라 셋업: Turborepo + CF Workers + Supabase + Redis | 배포 파이프라인 완성 |
| 1주 | 소셜 로그인 (카카오/구글) + 사용자 프로필 | 로그인/로그아웃 동작 |
| 2주 | 항공권 검색 UI + Amadeus 연동 + 캐싱 | 검색 결과 화면 완성 |
| 0.5주 | 날씨 데이터 연동 (기상청 + OpenWeather) | 날씨 조회 API |
| 0.5주 | 홈 화면 + 검색 폼 UI | MVP 웹 배포 |

**Phase 1 완료 기준**: 항공권 검색 → 최저가 날짜 확인까지 동작

### Phase 2: AI 일정 생성 (3~4주)

| 주차 | 작업 | 산출물 |
|------|------|--------|
| 1.5주 | AI 일정 생성 엔진 (Gemini + 날씨 + 프롬프트) | 일정 생성 API |
| 1주 | 맛집/관광지 연동 (Google Places) + 동선 매칭 | 장소 검색 API |
| 0.5주 | 카카오맵 지도 시각화 (마커 + 경로) | 지도 뷰 |
| 0.5주 | 일정 저장/공유/PDF 내보내기 | 일정 관리 기능 |

**Phase 2 완료 기준**: 검색 → 일정 생성 → 저장/공유까지 E2E 동작

### Phase 3: 추천 + 부가기능 (3~4주)

| 주차 | 작업 | 산출물 |
|------|------|--------|
| 1.5주 | 여행지 추천 시스템 (필터 + 큐레이션 DB + Inspiration API) | 추천 플로우 |
| 0.5주 | 체크리스트 자동 생성 + 인터랙티브 UI | 체크리스트 기능 |
| 1주 | 가격 알림 시스템 (Cron + 웹 푸시) | 알림 기능 |
| 0.5주 | 예산 계산기 + 내 일정 탭 완성 | 예산 UI |
| 0.5주 | 후기 작성/조회 기본 기능 | 후기 시스템 |

**Phase 3 완료 기준**: 웹 버전 전체 기능 완성, 베타 테스트 가능

### Phase 4: 모바일 앱 출시 (3~4주)

| 주차 | 작업 | 산출물 |
|------|------|--------|
| 1주 | React Native + Expo 프로젝트 셋업 + 공유 컴포넌트 연동 | 앱 기본 구조 |
| 1주 | 네이티브 기능: 푸시 알림, 디바이스 캘린더 연동, 오프라인 저장 | 네이티브 기능 |
| 0.5주 | 앱 전용 UX 최적화 (제스처, 햅틱, 스플래시) | 앱 UX |
| 0.5주 | Google Play 심사 준비 (스크린샷, 스토어 설명, 개인정보처리방침) | 스토어 등록 |
| 0.5주 | EAS Build + 심사 제출 + 출시 | Google Play 출시 |

---

## 10. 성공 지표 (KPI)

### 10.1 핵심 지표

| 지표 | 목표 (출시 후 3개월) |
|------|---------------------|
| MAU | 1,000명 |
| 일정 생성 완료율 | 검색 → 일정 저장 40% 이상 |
| 공유율 | 생성된 일정의 20% 이상 공유 |
| 재방문율 | 주간 리텐션 30% 이상 |
| 앱 설치 | 500건 |

### 10.2 기술 지표

| 지표 | 목표 |
|------|------|
| API 무료 한도 내 운영 | Amadeus < 2,000건/월 |
| 캐시 히트율 | > 70% |
| 에러율 | < 1% |
| 평균 응답 시간 | < 500ms (캐시 HIT 포함) |

---

## 11. 리스크 & 대응

| 리스크 | 영향 | 대응 전략 |
|--------|------|-----------|
| Amadeus 무료 한도 초과 | 항공권 검색 중단 | 캐싱 공격적 적용 + 한도 근접 시 검색 제한 UI |
| 국내선 데이터 부족 | 국내 여행 기능 약화 | 네이버/카카오 항공권 링크 리다이렉트로 보완 |
| Gemini API 응답 품질 불안정 | 일정 품질 저하 | 프롬프트 정교화 + 결과 검증 로직 + 폴백 템플릿 |
| Supabase 7일 비활성 일시정지 | 서비스 다운 | Cron으로 일일 헬스체크 핑 |
| Google Places $200 크레딧 초과 | 맛집 검색 중단 | 결과 장기 캐싱 (7일) + 인기 여행지 사전 수집 |
| React Native 성능 이슈 | 앱 UX 저하 | 리스트 가상화 + 이미지 lazy loading + 메모이제이션 |

---

## 12. 향후 확장 계획

- **v1.1**: 숙소 추천 연동 (Booking.com Affiliate API)
- **v1.2**: 여행 중 실시간 일정 수정 + 근처 장소 실시간 추천
- **v1.3**: 사용자 후기 기반 협업 필터링 추천 고도화
- **v2.0**: iOS 앱 출시
- **v2.1**: 소셜 기능 (여행 메이트 찾기, 일정 합치기)
- **수익화**: 항공권/숙소 예약 시 제휴 수수료 (Affiliate), 프리미엄 AI 일정 (무제한 생성)
