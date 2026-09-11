import { notFound } from 'next/navigation';
import ExerciseWorkspace from '@/components/ExerciseWorkspace';
import { getChapterDataFromDb } from '@/lib/data-manager';

interface PageProps {
  params: Promise<{
    bookSlug: string;
    chapter: string;
    exercise: string;
  }>;
}

export default async function DynamicExercisePage({ params }: PageProps) {
  const { bookSlug, chapter, exercise } = await params;

  if (!/^chapter-[1-9]\d*$/.test(chapter) || !/^ex-[a-zA-Z0-9_-]+$/.test(exercise)) {
    notFound();
  }

  const unitNum = Number(chapter.replace('chapter-', ''));
  const chapterData = await getChapterDataFromDb(bookSlug, unitNum);

  if (!chapterData || !chapterData.exercises[exercise]) {
    notFound();
  }

  return (
    <ExerciseWorkspace key={`${bookSlug}/${chapter}/${exercise}`} chapter={chapter} chapterData={chapterData} selectedExercise={exercise} />
  );
}
