-- ====================================================================
-- SENTENCE BUILDER 2 - SUPABASE DATABASE SCHEMA
-- ====================================================================
-- Copy and run this ENTIRE script in your Supabase SQL Editor.
-- ====================================================================

-- 0. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DROP EXISTING TABLES IN ORDER
DROP TABLE IF EXISTS quiz_submissions CASCADE;
DROP TABLE IF EXISTS exercise_items CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;
DROP TABLE IF EXISTS unit_analytics CASCADE;
DROP TABLE IF EXISTS book_analytics CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS books CASCADE;

-- --------------------------------------------------------------------
-- 2. CREATE BOOKS TABLE (With Custom Slug for URLs & QR Codes)
-- --------------------------------------------------------------------
CREATE TABLE books (
  id TEXT PRIMARY KEY,                 -- e.g. 'sentence-builder-vol-1', 'sentence-builder-vol-2'
  slug TEXT UNIQUE NOT NULL,           -- Custom URL slug for frontend & QR Code (e.g. 'sentence-builder-vol-2' or 'sb2')
  title TEXT NOT NULL,                 -- e.g. 'Sentence Builder Vol. 2'
  subtitle TEXT,                       -- e.g. 'แบบฝึกหัดแต่งประโยคและขยายประโยค Vol. 2'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- --------------------------------------------------------------------
-- 3. CREATE UNITS TABLE (Dynamic Units per Book)
-- --------------------------------------------------------------------
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_name TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  unit_number INT NOT NULL,        -- 1, 2, 3 ...
  title TEXT NOT NULL,             -- e.g. "Present Continuous & Sentence Expansion"
  subtitle TEXT NOT NULL,          -- e.g. "บทที่ 1 : ฉันกำลัง… [ I + am + กริยาเติม -ing ]"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_book_unit UNIQUE (book_name, unit_number)
);

-- --------------------------------------------------------------------
-- 4. CREATE EXERCISES TABLE (CRUD Exercises per Unit)
-- --------------------------------------------------------------------
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  exercise_code TEXT NOT NULL,         -- 'ex-1', 'ex-2', 'ex-3', 'ex-4'...
  title TEXT NOT NULL,                 -- e.g. "Exercise 1: แปลประโยคภาษาอังกฤษ"
  exercise_type TEXT NOT NULL,         -- 'translation', 'guided_sentence', 'picture_description'
  use_ai_check BOOLEAN DEFAULT true,   -- Is this exercise using AI to check answers?
  instruction TEXT,                    -- Exercise description / instructions for students
  guidance TEXT,                       -- Teacher / AI grading guidance notes
  grammar_focus TEXT,                  -- Grammar rules for this exercise
  categories JSONB,                    -- Categories with orders & words for Ex 2 (e.g. [{ order: 1, name: "ทำอะไรจริง ๆ", words: [...] }])
  word_bank JSONB,                     -- Word bank reference data for Ex 2
  structure_required JSONB,            -- Core / Context / Connect structure reference
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_unit_exercise UNIQUE (unit_id, exercise_code)
);

-- --------------------------------------------------------------------
-- 5. CREATE EXERCISE ITEMS TABLE (Quiz Questions & Target Model Answers)
-- --------------------------------------------------------------------
CREATE TABLE exercise_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  exercise_code TEXT NOT NULL,     -- 'ex-1', 'ex-2', 'ex-3'
  item_number INT NOT NULL,        -- 1, 2, 3, 4
  thai_prompt TEXT,                -- Thai prompt / sentence to translate
  prompt TEXT,                     -- Fill-in-the-blank prompt for Ex 2
  model_answer TEXT NOT NULL,      -- Target answer (e.g., "I am commuting to get home.")
  acceptable_answers TEXT[],       -- Alternative valid answers array
  required_orders INT[],           -- Target categories required for this item (e.g., [1, 2])
  translations JSONB,              -- Mapping of answer word combinations to Thai translation
  image_url TEXT,                  -- Public Supabase CDN URL for Exercise 3 picture
  image_description TEXT,          -- Image caption / description
  context_hint TEXT,               -- Context hint for Ex 3
  teacher_guidance TEXT,           -- Guidance notes for teachers / AI
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_item_per_exercise UNIQUE (unit_id, exercise_code, item_number)
);

-- --------------------------------------------------------------------
-- 6. CREATE ANALYTICS TABLES (QR Scan & Unit Completion Tracking)
-- --------------------------------------------------------------------
CREATE TABLE book_analytics (
  book_name TEXT PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
  qr_scan_count BIGINT DEFAULT 0,
  last_scanned_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE unit_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_name TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  unit_number INT NOT NULL,
  view_count BIGINT DEFAULT 0,
  last_viewed_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_book_unit_analytics UNIQUE (book_name, unit_number)
);

-- --------------------------------------------------------------------
-- 7. DISABLE RLS FOR UNRESTRICTED PUBLIC READ/WRITE API ACCESS
-- --------------------------------------------------------------------
ALTER TABLE books DISABLE ROW LEVEL SECURITY;
ALTER TABLE units DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE book_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE unit_analytics DISABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 8. CREATE ATOMIC INCREMENT HELPER FUNCTIONS FOR SUPABASE RPC
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION increment_book_scan(target_book TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO book_analytics (book_name, qr_scan_count, last_scanned_at)
  VALUES (target_book, 1, now())
  ON CONFLICT (book_name) 
  DO UPDATE SET 
    qr_scan_count = book_analytics.qr_scan_count + 1,
    last_scanned_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_unit_view(target_book TEXT, target_unit INT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO unit_analytics (book_name, unit_number, view_count, last_viewed_at)
  VALUES (target_book, target_unit, 1, now())
  ON CONFLICT (book_name, unit_number)
  DO UPDATE SET 
    view_count = unit_analytics.view_count + 1,
    last_viewed_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ====================================================================
-- 9. SEED INITIAL BOOKS & UNIT 1 DATA
-- ====================================================================
INSERT INTO books (id, slug, title, subtitle, created_at) VALUES
  ('sentence-builder-vol-1', 'sentence-builder-vol-1', 'Sentence Builder Vol. 1', 'แบบฝึกหัดแต่งประโยคภาษาอังกฤษ Vol. 1 (เทคนิคปูพื้นฐาน)', '2026-07-22 00:00:00+00'),
  ('sentence-builder-vol-2', 'sentence-builder-vol-2', 'Sentence Builder Vol. 2', 'แบบฝึกหัดแต่งประโยคและขยายประโยค Vol. 2 (Core + Context + Connect)', '2026-07-20 00:00:00+00'),
  ('sentence-builder-vol-3', 'sentence-builder-vol-3', 'Sentence Builder Vol. 3', 'แบบฝึกหัดแต่งประโยคขั้นสูง Vol. 3 (Advanced Business & Writing)', '2026-07-01 00:00:00+00');

-- Seed Unit 1 for Vol. 2
INSERT INTO units (book_name, unit_number, title, subtitle)
VALUES ('sentence-builder-vol-2', 1, 'Present Continuous & Sentence Expansion', 'บทที่ 1 : ฉันกำลัง… [ I + am + กริยาเติม -ing ]');

DO $$
DECLARE
  u1_id UUID;
BEGIN
  SELECT id INTO u1_id FROM units WHERE book_name = 'sentence-builder-vol-2' AND unit_number = 1;

  -- Insert Exercise configurations for Unit 1
  INSERT INTO exercises (unit_id, exercise_code, title, exercise_type, use_ai_check, instruction, guidance, categories)
  VALUES
    (u1_id, 'ex-1', 'Exercise 1: แปลประโยคภาษาอังกฤษ', 'translation', true, 'แปลประโยคภาษาไทยเป็นภาษาอังกฤษโดยใช้โครงสร้าง Present Continuous', 'เน้นตรวจสอบ Subject-Verb Agreement และการเติม -ing', NULL),
    (u1_id, 'ex-2', 'Exercise 2: เลือกคำจากตารางมาแต่งประโยค', 'guided_sentence', true, 'เลือกคำจากตารางมาเติมในช่องว่างให้สมบูรณ์ โดยเชื่อมโยงความหมายให้ถูกต้อง', 'ตรวจคำศัพท์ที่เลือกและการวางตำแหน่งในประโยค', 
     '[
        {"order": 1, "name": "ทำอะไรจริง ๆ", "words": ["drink water", "practise speaking", "travel abroad"]},
        {"order": 2, "name": "เพื่ออะไร", "words": ["stay hydrated", "build confidence", "meet new people"]},
        {"order": 3, "name": "แม้ว่า...", "words": ["not thirsty", "shy", "alone"]}
      ]'::jsonb),
    (u1_id, 'ex-3', 'Exercise 3: ดูภาพแล้วแต่งประโยค (Core + Context + Connect)', 'picture_description', true, 'แต่งประโยคบรรยายภาพโดยใช้เทคนิค Core + Context + Connect', 'ตรวจ 3 องค์ประกอบหลัก: ประโยคแกนกลาง + บริบท + ตัวเชื่อม', NULL);

  -- Insert Question Items for Unit 1 Exercises
  -- Exercise 1 Items
  INSERT INTO exercise_items (unit_id, exercise_code, item_number, thai_prompt, model_answer, acceptable_answers)
  VALUES 
    (u1_id, 'ex-1', 1, 'ฉันกำลังเดินทางเพื่อกลับบ้าน', 'I am commuting to get home.', ARRAY['I am commuting to get home.']),
    (u1_id, 'ex-1', 2, 'ฉันกำลังจัดผมเพื่อเสริมความมั่นใจตอนนี้', 'I am fixing my hair to boost confidence now.', ARRAY['I am fixing my hair to boost confidence now.']),
    (u1_id, 'ex-1', 3, 'ฉันกำลังติดตามพัสดุเพราะว่ามันเร่งด่วน', 'I am tracking a parcel because it is urgent.', ARRAY['I am tracking a parcel because it is urgent.']),
    (u1_id, 'ex-1', 4, 'ฉันกำลังลังเลที่จะออกไปข้างนอก ณ ตอนนี้เพราะมันดึกแล้ว', 'I am hesitating to go outside now because it is late.', ARRAY['I am hesitating to go outside now because it is late.']);

  -- Exercise 2 Items with Progressive Orders & Translations
  INSERT INTO exercise_items (unit_id, exercise_code, item_number, prompt, model_answer, acceptable_answers, required_orders, translations)
  VALUES
    (u1_id, 'ex-2', 1, 'I do ____________________.', 'I do drink water.', 
     ARRAY['I do drink water.', 'I do practise speaking.', 'I do travel abroad.'],
     ARRAY[1],
     '{"drink water": "ฉันดื่มน้ำจริง ๆ", "practise speaking": "ฉันฝึกพูดจริง ๆ", "travel abroad": "ฉันไปเที่ยวต่างประเทศจริง ๆ"}'::jsonb),
     
    (u1_id, 'ex-2', 2, 'I do ____________________ to ____________________.', 'I do drink water to stay hydrated.', 
     ARRAY['I do drink water to stay hydrated.', 'I do practise speaking to build confidence.', 'I do travel abroad to meet new people.'],
     ARRAY[1, 2],
     '{"drink water|stay hydrated": "ฉันดื่มน้ำจริง ๆ เพื่อรักษาระดับน้ำในร่างกาย", "practise speaking|build confidence": "ฉันฝึกพูดจริง ๆ เพื่อสร้างความมั่นใจ", "travel abroad|meet new people": "ฉันไปเที่ยวต่างประเทศจริง ๆ เพื่อพบปะผู้คนใหม่ ๆ"}'::jsonb),
     
    (u1_id, 'ex-2', 3, 'I do ____________________ to ____________________ even when I''m ____________________.', 'I do drink water to stay hydrated even when I''m not thirsty.', 
     ARRAY['I do drink water to stay hydrated even when I''m not thirsty.', 'I do practise speaking to build confidence even when I''m shy.', 'I do travel abroad to meet new people even when I''m alone.'],
     ARRAY[1, 2, 3],
     '{"drink water|stay hydrated|not thirsty": "ฉันดื่มน้ำจริง ๆ เพื่อรักษาระดับน้ำในร่างกาย แม้ว่าฉันจะไม่กระหายน้ำก็ตาม", "practise speaking|build confidence|shy": "ฉันฝึกพูดจริง ๆ เพื่อสร้างความมั่นใจ แม้ว่าฉันจะเป็นคนขี้อายก็ตาม", "travel abroad|meet new people|alone": "ฉันไปเที่ยวต่างประเทศจริง ๆ เพื่อพบปะผู้คนใหม่ ๆ แม้ว่าฉันจะไปคนเดียวก็ตาม"}'::jsonb),
     
    (u1_id, 'ex-2', 4, 'I do ____________________ to ____________________ even when I''m ____________________.', 'I do practise speaking to build confidence even when I''m shy.', 
     ARRAY['I do drink water to stay hydrated even when I''m not thirsty.', 'I do practise speaking to build confidence even when I''m shy.', 'I do travel abroad to meet new people even when I''m alone.'],
     ARRAY[1, 2, 3],
     '{"drink water|stay hydrated|not thirsty": "ฉันดื่มน้ำจริง ๆ เพื่อรักษาระดับน้ำในร่างกาย แม้ว่าฉันจะไม่กระหายน้ำก็ตาม", "practise speaking|build confidence|shy": "ฉันฝึกพูดจริง ๆ เพื่อสร้างความมั่นใจ แม้ว่าฉันจะเป็นคนขี้อายก็ตาม", "travel abroad|meet new people|alone": "ฉันไปเที่ยวต่างประเทศจริง ๆ เพื่อพบปะผู้คนใหม่ ๆ แม้ว่าฉันจะไปคนเดียวก็ตาม"}'::jsonb);

  -- Exercise 3 Items
  INSERT INTO exercise_items (unit_id, exercise_code, item_number, image_description, context_hint, model_answer)
  VALUES
    (u1_id, 'ex-3', 1, 'ผู้ชายกำลังดื่มกาแฟในคาเฟ่', 'ดื่มกาแฟ / ในคาเฟ่ / เพื่อความสดชื่น', 'I am drinking coffee at the cafe right now to feel refreshed.'),
    (u1_id, 'ex-3', 2, 'ผู้หญิงกำลังวิ่งออกกำลังกายในสวนสาธารณะ', 'วิ่งออกกำลังกาย / ในสวนสาธารณะ / เพื่อสุขภาพดี', 'I am running in the park right now because it is healthy.'),
    (u1_id, 'ex-3', 3, 'ผู้หญิงกำลังเลือกซื้อของสุขภาพในซูเปอร์มาร์เก็ต', 'ซื้อของสุขภาพ / ในซูเปอร์มาร์เก็ต / เพราะห่วงสุขภาพ', 'I am buying healthy food at the supermarket now because I care about my health.');
END $$;
