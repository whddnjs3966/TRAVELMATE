-- ============================================
-- TripFlow Initial Schema
-- ============================================

-- 1. 사용자
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  provider TEXT NOT NULL,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 여행 일정
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  destination_type TEXT NOT NULL,
  departure_city TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  duration_nights INT NOT NULL,
  status TEXT DEFAULT 'draft',
  share_token TEXT UNIQUE,
  total_budget_estimate INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 일정 상세 (일별)
CREATE TABLE trip_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  date DATE,
  weather_summary JSONB,
  spots JSONB NOT NULL DEFAULT '[]',
  restaurants JSONB DEFAULT '[]',
  transport_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 항공권 검색 결과
CREATE TABLE flight_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  cheapest_price INT,
  currency TEXT DEFAULT 'KRW',
  results JSONB,
  searched_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 가격 알림
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  month INT NOT NULL,
  duration_nights INT NOT NULL,
  target_price INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_price INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 체크리스트
CREATE TABLE checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 날씨 데이터 캐시
CREATE TABLE weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL,
  date DATE NOT NULL,
  source TEXT NOT NULL,
  data JSONB NOT NULL,
  UNIQUE(location, date, source)
);

-- 8. 여행지 큐레이션
CREATE TABLE destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT,
  country TEXT NOT NULL,
  type TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  best_months INT[] DEFAULT '{}',
  avg_budget_per_day INT,
  climate TEXT,
  companion_fit TEXT[],
  description TEXT,
  thumbnail_url TEXT,
  iata_code TEXT,
  lat DECIMAL,
  lng DECIMAL,
  is_active BOOLEAN DEFAULT true
);

-- 9. 사용자 후기
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  photos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 인덱스
-- ============================================
CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_trips_share ON trips(share_token);
CREATE INDEX idx_trip_days_trip ON trip_days(trip_id);
CREATE INDEX idx_weather_lookup ON weather_cache(location, date);
CREATE INDEX idx_destinations_tags ON destinations USING GIN(tags);
CREATE INDEX idx_destinations_months ON destinations USING GIN(best_months);
CREATE INDEX idx_alerts_active ON price_alerts(is_active) WHERE is_active = true;
CREATE INDEX idx_flight_searches_route ON flight_searches(origin, destination, departure_date);
CREATE INDEX idx_reviews_destination ON reviews(destination);

-- ============================================
-- Row Level Security
-- ============================================
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own trips"
  ON trips FOR ALL
  USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view shared trips"
  ON trips FOR SELECT
  USING (share_token IS NOT NULL);

ALTER TABLE trip_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own trip days"
  ON trip_days FOR ALL
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

ALTER TABLE flight_searches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own searches"
  ON flight_searches FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Anyone can insert searches"
  ON flight_searches FOR INSERT
  WITH CHECK (true);

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own alerts"
  ON price_alerts FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access own checklists"
  ON checklists FOR ALL
  USING (trip_id IN (SELECT id FROM trips WHERE user_id = auth.uid()));

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can write own reviews"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- destinations, weather_cache는 공개 읽기
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read destinations"
  ON destinations FOR SELECT USING (true);

ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read weather"
  ON weather_cache FOR SELECT USING (true);
CREATE POLICY "Service can insert weather"
  ON weather_cache FOR INSERT WITH CHECK (true);

-- ============================================
-- 시드 데이터: 인기 여행지
-- ============================================
INSERT INTO destinations (name, name_en, country, type, tags, best_months, avg_budget_per_day, climate, companion_fit, description, iata_code, lat, lng) VALUES
('제주도', 'Jeju', '대한민국', 'domestic', ARRAY['힐링', '맛집', '자연'], ARRAY[3,4,5,9,10], 80000, 'temperate', ARRAY['solo','couple','family','friends'], '한국의 하와이. 에메랄드빛 바다와 한라산이 만드는 천혜의 자연경관', 'CJU', 33.4996, 126.5312),
('오사카', 'Osaka', '일본', 'international', ARRAY['맛집', '쇼핑', '문화'], ARRAY[3,4,5,10,11], 120000, 'temperate', ARRAY['solo','couple','friends'], '일본의 부엌. 도톤보리 먹방투어와 오사카성의 매력', 'KIX', 34.6937, 135.5023),
('다낭', 'Da Nang', '베트남', 'international', ARRAY['힐링', '맛집', '자연'], ARRAY[2,3,4,5], 60000, 'tropical', ARRAY['couple','family','friends'], '가성비 최고의 동남아 휴양지. 미케비치와 바나힐', 'DAD', 16.0544, 108.2022),
('도쿄', 'Tokyo', '일본', 'international', ARRAY['쇼핑', '문화', '맛집'], ARRAY[3,4,5,10,11], 150000, 'temperate', ARRAY['solo','couple','friends'], '전통과 현대가 공존하는 세계 최대 도시', 'NRT', 35.6762, 139.6503),
('방콕', 'Bangkok', '태국', 'international', ARRAY['맛집', '쇼핑', '문화'], ARRAY[11,12,1,2], 50000, 'tropical', ARRAY['solo','couple','friends'], '화려한 사원과 야시장, 무한 가성비 여행지', 'BKK', 13.7563, 100.5018),
('부산', 'Busan', '대한민국', 'domestic', ARRAY['맛집', '자연', '힐링'], ARRAY[4,5,6,9,10], 70000, 'temperate', ARRAY['solo','couple','family','friends'], '해운대 바다와 광안리 야경, 돼지국밥의 도시', 'PUS', 35.1796, 129.0756),
('후쿠오카', 'Fukuoka', '일본', 'international', ARRAY['맛집', '쇼핑', '힐링'], ARRAY[3,4,5,10,11], 100000, 'temperate', ARRAY['solo','couple','friends'], '라멘의 성지. 가깝고 맛있는 일본 여행', 'FUK', 33.5904, 130.4017),
('세부', 'Cebu', '필리핀', 'international', ARRAY['액티비티', '힐링', '자연'], ARRAY[1,2,3,4,5], 70000, 'tropical', ARRAY['couple','family','friends'], '고래상어 스노클링과 에메랄드빛 바다의 섬', 'CEB', 10.3157, 123.8854),
('강릉', 'Gangneung', '대한민국', 'domestic', ARRAY['힐링', '맛집', '자연'], ARRAY[5,6,7,8,9], 60000, 'temperate', ARRAY['solo','couple','friends'], '동해 바다와 커피거리, 초당순두부의 고장', NULL, 37.7519, 128.8761),
('싱가포르', 'Singapore', '싱가포르', 'international', ARRAY['쇼핑', '맛집', '문화'], ARRAY[1,2,3,11,12], 130000, 'tropical', ARRAY['solo','couple','family','friends'], '깨끗한 도시국가, 마리나베이와 호커센터 맛집', 'SIN', 1.3521, 103.8198);
