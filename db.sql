-- ====================================================================
-- SENTENCE BUILDER 2 - NON-DESTRUCTIVE SUPABASE DATABASE SCHEMA
-- ====================================================================
-- This script is SAFE to run repeatedly in the Supabase SQL Editor.
-- It will NEVER drop your tables and NEVER overwrite your entered data.
-- ====================================================================

-- 0. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. BOOKS TABLE (With Custom Slug for URLs & QR Codes)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,                 -- e.g. 'sentence-builder-vol-1', 'sentence-builder-vol-2'
  slug TEXT UNIQUE NOT NULL,           -- Custom URL slug for frontend & QR Code (e.g. 'sentence-builder-vol-2' or 'sb2')
  title TEXT NOT NULL,                 -- e.g. 'Sentence Builder Vol. 2'
  subtitle TEXT,                       -- e.g. 'แบบฝึกหัดแต่งประโยคและขยายประโยค Vol. 2'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure columns exist if table was created earlier
ALTER TABLE books ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- --------------------------------------------------------------------
-- 2. UNITS TABLE (Dynamic Units per Book)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_name TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  unit_number INT NOT NULL,        -- 1, 2, 3 ...
  title TEXT NOT NULL,             -- e.g. "Present Continuous & Sentence Expansion"
  subtitle TEXT NOT NULL,          -- e.g. "บทที่ 1 : ฉันกำลัง… [ I + am + กริยาเติม -ing ]"
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_book_unit UNIQUE (book_name, unit_number)
);

ALTER TABLE units ADD COLUMN IF NOT EXISTS book_name TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS unit_number INT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS subtitle TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE units ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --------------------------------------------------------------------
-- 3. EXERCISES TABLE (CRUD Exercises per Unit)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  exercise_code TEXT NOT NULL,         -- 'ex-1', 'ex-2', 'ex-3', 'ex-4'...
  title TEXT NOT NULL,                 -- e.g. "Exercise 1: แปลประโยคภาษาอังกฤษ"
  exercise_type TEXT NOT NULL,         -- 'translation', 'guided_sentence', 'picture_description'
  use_ai_check BOOLEAN DEFAULT true,   -- Is this exercise using AI to check answers?
  instruction TEXT,                    -- Exercise description / instructions for students
  guidance TEXT,                       -- Teacher / AI grading guidance notes
  grammar_focus TEXT,                  -- Grammar rules for this exercise
  categories JSONB,                    -- Modular Categories with words {en, th} for Ex 2
  word_bank JSONB,                     -- Word bank reference data for Ex 2
  structure_required JSONB,            -- Core / Context / Connect structure reference
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_unit_exercise UNIQUE (unit_id, exercise_code)
);

ALTER TABLE exercises ADD COLUMN IF NOT EXISTS unit_id UUID;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS exercise_code TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS exercise_type TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS use_ai_check BOOLEAN DEFAULT true;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS instruction TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS guidance TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS grammar_focus TEXT;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS categories JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS word_bank JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS structure_required JSONB;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 1;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- --------------------------------------------------------------------
-- 4. EXERCISE ITEMS TABLE (Quiz Questions & Target Model Answers)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS exercise_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  exercise_code TEXT NOT NULL,     -- 'ex-1', 'ex-2', 'ex-3'
  item_number INT NOT NULL,        -- 1, 2, 3, 4
  thai_prompt TEXT,                -- Thai prompt / sentence to translate
  prompt TEXT,                     -- Fill-in-the-blank prompt for Ex 2
  thai_template TEXT,              -- Modular Thai template for auto-assembly (e.g. "ฉัน{1}จริง ๆ เพื่อ{2}")
  model_answer TEXT NOT NULL,      -- Target answer (e.g., "I am commuting to get home.")
  acceptable_answers TEXT[],       -- Alternative valid answers array
  required_orders INT[],           -- Target categories required for this item (e.g., [1, 2])
  translations JSONB,              -- Optional custom override mapping of answer to Thai translation
  image_url TEXT,                  -- Public Supabase CDN URL for Exercise 3 picture
  image_description TEXT,          -- Image caption / description
  context_hint TEXT,               -- Context hint for Ex 3
  teacher_guidance TEXT,           -- Guidance notes for teachers / AI
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_item_per_exercise UNIQUE (unit_id, exercise_code, item_number)
);

ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS unit_id UUID;
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS exercise_code TEXT;
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS item_number INT;
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS thai_prompt TEXT;
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS prompt TEXT;
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS thai_template TEXT;
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS model_answer TEXT;
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS acceptable_answers TEXT[];
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS required_orders INT[];
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS translations JSONB;
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS image_description TEXT;
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS context_hint TEXT;
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS teacher_guidance TEXT;
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE exercise_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- --------------------------------------------------------------------
-- 5. ANALYTICS TABLES (QR Scan, Unit Completion & Learning Analytics)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS book_analytics (
  book_name TEXT PRIMARY KEY,
  qr_scan_count BIGINT DEFAULT 0,
  ai_check_count BIGINT DEFAULT 0,
  correct_check_count BIGINT DEFAULT 0,
  last_scanned_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE book_analytics ADD COLUMN IF NOT EXISTS qr_scan_count BIGINT DEFAULT 0;
ALTER TABLE book_analytics ADD COLUMN IF NOT EXISTS ai_check_count BIGINT DEFAULT 0;
ALTER TABLE book_analytics ADD COLUMN IF NOT EXISTS correct_check_count BIGINT DEFAULT 0;
ALTER TABLE book_analytics ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS unit_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_name TEXT NOT NULL,
  unit_number INT NOT NULL,
  view_count BIGINT DEFAULT 0,
  check_count BIGINT DEFAULT 0,
  correct_count BIGINT DEFAULT 0,
  last_viewed_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_book_unit_analytics UNIQUE (book_name, unit_number)
);

ALTER TABLE unit_analytics ADD COLUMN IF NOT EXISTS view_count BIGINT DEFAULT 0;
ALTER TABLE unit_analytics ADD COLUMN IF NOT EXISTS check_count BIGINT DEFAULT 0;
ALTER TABLE unit_analytics ADD COLUMN IF NOT EXISTS correct_count BIGINT DEFAULT 0;
ALTER TABLE unit_analytics ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ DEFAULT now();

-- --------------------------------------------------------------------
-- 6. DISABLE RLS FOR UNRESTRICTED PUBLIC READ/WRITE API ACCESS
-- --------------------------------------------------------------------
ALTER TABLE books DISABLE ROW LEVEL SECURITY;
ALTER TABLE units DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE book_analytics DISABLE ROW LEVEL SECURITY;
ALTER TABLE unit_analytics DISABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- 7. ATOMIC INCREMENT HELPER FUNCTIONS FOR SUPABASE RPC
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

CREATE OR REPLACE FUNCTION increment_exercise_check(target_book TEXT, target_unit INT, is_correct BOOLEAN)
RETURNS VOID AS $$
BEGIN
  -- 1. Update book-level counts
  INSERT INTO book_analytics (book_name, ai_check_count, correct_check_count, last_scanned_at)
  VALUES (target_book, 1, CASE WHEN is_correct THEN 1 ELSE 0 END, now())
  ON CONFLICT (book_name)
  DO UPDATE SET
    ai_check_count = book_analytics.ai_check_count + 1,
    correct_check_count = book_analytics.correct_check_count + (CASE WHEN is_correct THEN 1 ELSE 0 END);

  -- 2. Update unit-level counts
  INSERT INTO unit_analytics (book_name, unit_number, check_count, correct_count, last_viewed_at)
  VALUES (target_book, target_unit, 1, CASE WHEN is_correct THEN 1 ELSE 0 END, now())
  ON CONFLICT (book_name, unit_number)
  DO UPDATE SET
    check_count = unit_analytics.check_count + 1,
    correct_count = unit_analytics.correct_count + (CASE WHEN is_correct THEN 1 ELSE 0 END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------
-- 8. SUPABASE STORAGE BUCKET: exercise-images (Public Image Hosting)
-- --------------------------------------------------------------------
-- 8.1 Create the public bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-images',
  'exercise-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 8.2 Storage Access Policies (Allow Public Read, Upload, Update, Delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read exercise-images'
  ) THEN
    CREATE POLICY "Public Read exercise-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'exercise-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Insert exercise-images'
  ) THEN
    CREATE POLICY "Public Insert exercise-images" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'exercise-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Update exercise-images'
  ) THEN
    CREATE POLICY "Public Update exercise-images" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'exercise-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Delete exercise-images'
  ) THEN
    CREATE POLICY "Public Delete exercise-images" ON storage.objects FOR DELETE TO public USING (bucket_id = 'exercise-images');
  END IF;
END $$;

