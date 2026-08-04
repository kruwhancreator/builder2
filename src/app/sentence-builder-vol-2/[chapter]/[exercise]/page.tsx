import { notFound } from 'next/navigation';
import chapter1Data from '@/data/sentence-builder-vol-2/chapter-1.json';
import ExerciseWorkspace from '@/components/ExerciseWorkspace';

interface PageProps {
  params: Promise<{
    chapter: string;
    exercise: string;
  }>;
}

export default async function ExercisePage({ params }: PageProps) {
  const { chapter, exercise } = await params;

  if (chapter !== 'chapter-1') {
    notFound();
  }

  const validExercises = ['ex-1', 'ex-2', 'ex-3'];
  if (!validExercises.includes(exercise)) {
    notFound();
  }

  return (
    <ExerciseWorkspace
      chapter={chapter}
      exerciseId={exercise}
      chapterData={chapter1Data}
    />
  );
}
