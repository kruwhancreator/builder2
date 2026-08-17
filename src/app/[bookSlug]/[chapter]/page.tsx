import { notFound } from 'next/navigation';
import ExerciseWorkspace from '@/components/ExerciseWorkspace';
import { getChapterDataFromDb } from '@/lib/data-manager';

interface PageProps {
  params: Promise<{
    bookSlug: string;
    chapter: string;
  }>;
}

export default async function DynamicChapterPage({ params }: PageProps) {
  const { bookSlug, chapter } = await params;

  if (!chapter.startsWith('chapter-')) {
    notFound();
  }

  const unitNum = Number(chapter.replace('chapter-', '')) || 1;
  const chapterData = await getChapterDataFromDb(bookSlug, unitNum);

  if (!chapterData) {
    notFound();
  }

  return (
    <ExerciseWorkspace chapter={chapter} chapterData={chapterData} />
  );
}
