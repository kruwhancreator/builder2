-- Sentence Builder: existing-project migration. Copy ALL of this file into SQL Editor.
-- Preserves all existing books, units, exercises, questions, images, and counters.
-- Deploy the updated app with SUPABASE_SERVICE_ROLE_KEY before applying this migration.
BEGIN;

-- 1. Ensure all exercise and question columns exist
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 1;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS categories jsonb;

ALTER TABLE public.exercise_items ADD COLUMN IF NOT EXISTS prompt text;
ALTER TABLE public.exercise_items ADD COLUMN IF NOT EXISTS thai_template text;
ALTER TABLE public.exercise_items ADD COLUMN IF NOT EXISTS required_orders integer[] DEFAULT ARRAY[1];
ALTER TABLE public.exercise_items ADD COLUMN IF NOT EXISTS translations jsonb;
ALTER TABLE public.exercise_items ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.exercise_items ADD COLUMN IF NOT EXISTS image_description text;
ALTER TABLE public.exercise_items ADD COLUMN IF NOT EXISTS context_hint text;
ALTER TABLE public.exercise_items ADD COLUMN IF NOT EXISTS teacher_guidance text;

-- 2. Ensure analytics tables exist
CREATE TABLE IF NOT EXISTS public.book_analytics (
  book_name TEXT PRIMARY KEY,
  qr_scan_count BIGINT DEFAULT 0,
  ai_check_count BIGINT DEFAULT 0,
  correct_check_count BIGINT DEFAULT 0,
  last_scanned_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.unit_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_name TEXT NOT NULL,
  unit_number INT NOT NULL,
  view_count BIGINT DEFAULT 0,
  check_count BIGINT DEFAULT 0,
  correct_count BIGINT DEFAULT 0,
  last_viewed_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_book_unit_analytics UNIQUE (book_name, unit_number)
);

-- 3. Table Permissions and Row Level Security
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_analytics ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.books, public.units, public.exercises, public.exercise_items TO anon, authenticated, service_role;
GRANT ALL ON public.book_analytics, public.unit_analytics TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['books','units','exercises','exercise_items','book_analytics','unit_analytics'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS workbook_public_read ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS workbook_all_access ON public.%I', tbl);
    EXECUTE format('CREATE POLICY workbook_all_access ON public.%I FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- 4. Storage bucket configuration for exercise images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-images',
  'exercise-images',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

DROP POLICY IF EXISTS "Public Insert exercise-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Update exercise-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete exercise-images" ON storage.objects;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Read exercise-images'
  ) THEN
    CREATE POLICY "Public Read exercise-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'exercise-images');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public Write exercise-images'
  ) THEN
    CREATE POLICY "Public Write exercise-images" ON storage.objects FOR ALL TO anon, authenticated, service_role USING (bucket_id = 'exercise-images') WITH CHECK (bucket_id = 'exercise-images');
  END IF;
END $$;

-- 5. Atomic replacement: any error rolls back both the deletion and insertion.
CREATE OR REPLACE FUNCTION public.replace_exercise_items(p_unit uuid, p_exercise text, p_items jsonb, p_categories jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' OR jsonb_array_length(p_items)>500 THEN
    RAISE EXCEPTION 'Invalid question list';
  END IF;
  IF p_categories IS NOT NULL AND jsonb_typeof(p_categories) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid categories'; END IF;
  PERFORM 1 FROM public.exercises WHERE unit_id=p_unit AND exercise_code=p_exercise FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exercise not found'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_items) x WHERE jsonb_typeof(x) IS DISTINCT FROM 'object' OR jsonb_typeof(x->'model_answer') IS DISTINCT FROM 'string') THEN
    RAISE EXCEPTION 'Every question requires a model answer';
  END IF;
  IF p_categories IS NOT NULL THEN
    UPDATE public.exercises SET categories=p_categories WHERE unit_id=p_unit AND exercise_code=p_exercise;
  END IF;
  DELETE FROM public.exercise_items WHERE unit_id=p_unit AND exercise_code=p_exercise;
  INSERT INTO public.exercise_items (unit_id,exercise_code,item_number,thai_prompt,prompt,thai_template,required_orders,
    model_answer,acceptable_answers,translations,image_url,image_description,context_hint,teacher_guidance)
  SELECT p_unit,p_exercise,ord::integer,COALESCE(x->>'thai',x->>'thai_prompt'),x->>'prompt',x->>'thai_template',
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(COALESCE(NULLIF(x->'required_orders','null'::jsonb),'[1]'::jsonb))::integer),ARRAY[1]),
    x->>'model_answer', ARRAY(SELECT jsonb_array_elements_text(COALESCE(NULLIF(x->'acceptable_answers','null'::jsonb),jsonb_build_array(x->>'model_answer')))),
    NULLIF(x->'translations','null'::jsonb),x->>'image_url',x->>'image_description',x->>'context_hint',x->>'teacher_guidance'
  FROM jsonb_array_elements(p_items) WITH ORDINALITY AS q(x,ord);
END $$;
GRANT EXECUTE ON FUNCTION public.replace_exercise_items(uuid,text,jsonb,jsonb) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delete_workbook_exercise(p_unit uuid,p_exercise text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.exercises WHERE unit_id=p_unit AND exercise_code=p_exercise FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exercise not found'; END IF;
  DELETE FROM public.exercise_items WHERE unit_id=p_unit AND exercise_code=p_exercise;
  DELETE FROM public.exercises WHERE unit_id=p_unit AND exercise_code=p_exercise;
END $$;
GRANT EXECUTE ON FUNCTION public.delete_workbook_exercise(uuid,text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.reorder_workbook_exercises(p_unit uuid,p_orders jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE entry jsonb;
BEGIN
  IF jsonb_typeof(p_orders) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid order'; END IF;
  PERFORM 1 FROM public.units WHERE id=p_unit FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unit not found'; END IF;
  FOR entry IN SELECT jsonb_array_elements(p_orders) LOOP
    UPDATE public.exercises SET order_index=(entry->>'order_index')::integer
    WHERE unit_id=p_unit AND exercise_code=entry->>'exercise_code';
    IF NOT FOUND THEN RAISE EXCEPTION 'Exercise not found'; END IF;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.reorder_workbook_exercises(uuid,jsonb) TO anon, authenticated, service_role;

-- 6. Analytics functions definition (Created before revoke/grant)
CREATE OR REPLACE FUNCTION public.increment_book_scan(target_book text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.book_analytics (book_name, qr_scan_count, last_scanned_at)
  VALUES (target_book, 1, now())
  ON CONFLICT (book_name) 
  DO UPDATE SET 
    qr_scan_count = public.book_analytics.qr_scan_count + 1,
    last_scanned_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_unit_view(target_book text, target_unit integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.unit_analytics (book_name, unit_number, view_count, last_viewed_at)
  VALUES (target_book, target_unit, 1, now())
  ON CONFLICT (book_name, unit_number)
  DO UPDATE SET 
    view_count = public.unit_analytics.view_count + 1,
    last_viewed_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_exercise_check(target_book text, target_unit integer, is_correct boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  INSERT INTO public.book_analytics (book_name, ai_check_count, correct_check_count, last_scanned_at)
  VALUES (target_book, 1, CASE WHEN is_correct THEN 1 ELSE 0 END, now())
  ON CONFLICT (book_name)
  DO UPDATE SET
    ai_check_count = public.book_analytics.ai_check_count + 1,
    correct_check_count = public.book_analytics.correct_check_count + (CASE WHEN is_correct THEN 1 ELSE 0 END);

  INSERT INTO public.unit_analytics (book_name, unit_number, check_count, correct_count, last_viewed_at)
  VALUES (target_book, target_unit, 1, CASE WHEN is_correct THEN 1 ELSE 0 END, now())
  ON CONFLICT (book_name, unit_number)
  DO UPDATE SET
    check_count = public.unit_analytics.check_count + 1,
    correct_count = public.unit_analytics.correct_count + (CASE WHEN is_correct THEN 1 ELSE 0 END);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_book_scan(text) TO anon, authenticated, service_role;
ALTER FUNCTION public.increment_book_scan(text) SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.increment_unit_view(text, integer) TO anon, authenticated, service_role;
ALTER FUNCTION public.increment_unit_view(text, integer) SET search_path = public, pg_temp;

GRANT EXECUTE ON FUNCTION public.increment_exercise_check(text, integer, boolean) TO anon, authenticated, service_role;
ALTER FUNCTION public.increment_exercise_check(text, integer, boolean) SET search_path = public, pg_temp;

-- 7. Shared atomic rate limiter. No raw IP addresses are stored.
CREATE TABLE IF NOT EXISTS public.request_limits (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  requests integer NOT NULL
);
ALTER TABLE public.request_limits ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.request_limits TO anon, authenticated, service_role;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'request_limits' AND policyname = 'request_limits_all_access'
  ) THEN
    CREATE POLICY request_limits_all_access ON public.request_limits FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.consume_request_limit(p_key text, p_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE 
  used integer; 
  bucket timestamptz := date_trunc('minute', clock_timestamp());
BEGIN
  IF p_limit < 1 OR p_limit > 1000 OR length(p_key) > 128 THEN 
    RETURN false; 
  END IF;
  DELETE FROM public.request_limits WHERE window_start < bucket - interval '10 minutes';
  INSERT INTO public.request_limits AS limits(key, window_start, requests) 
  VALUES (p_key, bucket, 1)
  ON CONFLICT(key) DO UPDATE SET 
    window_start = bucket,
    requests = CASE WHEN limits.window_start = bucket THEN least(limits.requests + 1, p_limit + 1) ELSE 1 END
  RETURNING requests INTO used;
  RETURN used <= p_limit;
END $$;
GRANT EXECUTE ON FUNCTION public.consume_request_limit(text, integer) TO anon, authenticated, service_role;

COMMIT;
