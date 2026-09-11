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

  if (!/^chapter-[1-9]\d*$/.test(chapter)) {
    notFound();
  }

  const unitNum = Number(chapter.replace('chapter-', ''));
  const chapterData = await getChapterDataFromDb(bookSlug, unitNum);

  if (!chapterData) {
    notFound();
  }

  return (
    <ExerciseWorkspace key={`${bookSlug}/${chapter}`} chapter={chapter} chapterData={chapterData} />
  );
}
