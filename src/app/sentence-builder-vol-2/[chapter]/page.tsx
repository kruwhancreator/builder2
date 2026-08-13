import { notFound } from 'next/navigation';
import ExerciseWorkspace from '@/components/ExerciseWorkspace';
import { getChapterDataFromDb } from '@/lib/data-manager';

interface PageProps {
  params: Promise<{
    chapter: string;
  }>;
}

export default async function ChapterPage({ params }: PageProps) {
  const { chapter } = await params;

  if (!chapter.startsWith('chapter-')) {
    notFound();
  }

  const unitNum = Number(chapter.replace('chapter-', '')) || 1;
  const chapterData = await getChapterDataFromDb('sentence-builder-vol-2', unitNum);

  return (
    <ExerciseWorkspace chapter={chapter} chapterData={chapterData} />
  );
}
