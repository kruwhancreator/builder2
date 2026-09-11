export type ExerciseType = 'translation' | 'guided_sentence' | 'picture_description';
export interface Word { id?: string; en: string; th?: string; index?: number; next_valid_ids?: string[] }
export interface Category { order: number; name?: string; category_name?: string; words?: (Word | string)[]; word_bank?: (Word | string)[] }
export interface ExerciseItem {
  id: number; item_number?: number; thai?: string; thai_prompt?: string; prompt?: string;
  thai_template?: string; required_orders?: number[]; translations?: Record<string, string>;
  translation?: string;
  model_answer: string; acceptable_answers?: string[]; image_url?: string; image_description?: string;
  context_hint?: string; teacher_guidance?: string; guidance?: string; grammar_focus?: string;
  exercise_guidance?: string; exercise_instruction?: string; unit_subtitle?: string; unit_title?: string;
  structure_required?: Record<string, unknown>;
}
export interface Exercise {
  id: string; code: string; title: string; type: ExerciseType; order_index?: number;
  use_ai_check?: boolean; instruction?: string; guidance?: string; grammar_focus?: string;
  structure_required?: Record<string, unknown>; categories?: Category[];
  word_bank?: Record<string, (Word | string)[]>; items: ExerciseItem[]; itemCount?: number;
}
export interface Unit {
  id: string; unit_number: number; title: string; subtitle?: string; exercises: Exercise[]; exerciseCount?: number;
}
export interface Chapter {
  book: string; slug: string; book_title: string; chapter: number; unit_number?: number;
  title: string; subtitle?: string; exercises: Record<string, Exercise>;
}
export interface Book {
  id: string; slug: string; title: string; subtitle?: string; total_units?: number; created_at?: string;
  units: Omit<Unit, 'exercises'>[];
}
