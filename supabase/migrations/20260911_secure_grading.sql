-- Sentence Builder: existing-project migration. Copy ALL of this file into SQL Editor.
-- Preserves all existing books, units, exercises, questions, images, and counters.
-- Deploy the updated app with SUPABASE_SERVICE_ROLE_KEY before applying this migration.
BEGIN;

ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 1;

-- Public visitors may read workbook content. Only the server may write it.
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_analytics ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.books, public.units, public.exercises, public.exercise_items,
  public.book_analytics, public.unit_analytics FROM anon, authenticated;
GRANT SELECT ON public.books, public.units, public.exercises, public.exercise_items TO anon, authenticated;
GRANT ALL ON public.books, public.units, public.exercises, public.exercise_items,
  public.book_analytics, public.unit_analytics TO service_role;
DO $$
DECLARE tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['books','units','exercises','exercise_items'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=tbl AND policyname='workbook_public_read') THEN
      EXECUTE format('CREATE POLICY workbook_public_read ON public.%I FOR SELECT TO anon, authenticated USING (true)', tbl);
    END IF;
  END LOOP;
END $$;

-- Revoke the old public storage write policies; public image URLs keep working.
DROP POLICY IF EXISTS "Public Insert exercise-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Update exercise-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete exercise-images" ON storage.objects;
UPDATE storage.buckets SET file_size_limit=5242880,
  allowed_mime_types=ARRAY['image/png','image/jpeg','image/webp','image/gif']
WHERE id='exercise-images';

-- Atomic replacement: any error rolls back both the deletion and insertion.
CREATE OR REPLACE FUNCTION public.replace_exercise_items(p_unit uuid, p_exercise text, p_items jsonb, p_categories jsonb DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
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
REVOKE ALL ON FUNCTION public.replace_exercise_items(uuid,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_exercise_items(uuid,text,jsonb,jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.delete_workbook_exercise(p_unit uuid,p_exercise text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.exercises WHERE unit_id=p_unit AND exercise_code=p_exercise FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Exercise not found'; END IF;
  DELETE FROM public.exercise_items WHERE unit_id=p_unit AND exercise_code=p_exercise;
  DELETE FROM public.exercises WHERE unit_id=p_unit AND exercise_code=p_exercise;
END $$;
REVOKE ALL ON FUNCTION public.delete_workbook_exercise(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_workbook_exercise(uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.reorder_workbook_exercises(p_unit uuid,p_orders jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
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
REVOKE ALL ON FUNCTION public.reorder_workbook_exercises(uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_workbook_exercises(uuid,jsonb) TO service_role;

-- Counters may only be incremented by the server after validation/evaluation.
REVOKE ALL ON FUNCTION public.increment_book_scan(text),public.increment_unit_view(text,integer),public.increment_exercise_check(text,integer,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.increment_book_scan(text),public.increment_unit_view(text,integer),public.increment_exercise_check(text,integer,boolean) TO service_role;
ALTER FUNCTION public.increment_book_scan(text) SET search_path=public,pg_temp;
ALTER FUNCTION public.increment_unit_view(text,integer) SET search_path=public,pg_temp;
ALTER FUNCTION public.increment_exercise_check(text,integer,boolean) SET search_path=public,pg_temp;

-- Shared atomic rate limiter. No raw IP addresses are stored.
CREATE TABLE IF NOT EXISTS public.request_limits (key text PRIMARY KEY, window_start timestamptz NOT NULL, requests integer NOT NULL);
ALTER TABLE public.request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.request_limits FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.request_limits TO service_role;
CREATE OR REPLACE FUNCTION public.consume_request_limit(p_key text,p_limit integer)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE used integer; bucket timestamptz := date_trunc('minute',clock_timestamp());
BEGIN
  IF p_limit<1 OR p_limit>1000 OR length(p_key)>128 THEN RETURN false; END IF;
  DELETE FROM public.request_limits WHERE window_start < bucket - interval '10 minutes';
  INSERT INTO public.request_limits AS limits(key,window_start,requests) VALUES(p_key,bucket,1)
  ON CONFLICT(key) DO UPDATE SET window_start=bucket,
    requests=CASE WHEN limits.window_start=bucket THEN least(limits.requests+1,p_limit+1) ELSE 1 END
  RETURNING requests INTO used;
  RETURN used<=p_limit;
END $$;
REVOKE ALL ON FUNCTION public.consume_request_limit(text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.consume_request_limit(text,integer) TO service_role;

COMMIT;
