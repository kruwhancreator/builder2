import { notFound } from 'next/navigation';
import ExerciseWorkspace from '@/components/ExerciseWorkspace';
import { getChapterData } from '@/lib/data-manager';

interface PageProps {
  params: Promise<{
    chapter: string;
  }>;
}

export default async function ChapterPage({ params }: PageProps) {
  const { chapter } = await params;

  if (chapter !== 'chapter-1') {
    notFound();
  }

  const chapterData = getChapterData(chapter);

  return (
    <ExerciseWorkspace chapter={chapter} chapterData={chapterData} />
  );
}
