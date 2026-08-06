import { redirect, notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    chapter: string;
    exercise: string;
  }>;
}

export default async function ExercisePage({ params }: PageProps) {
  const { chapter } = await params;

  if (chapter !== 'chapter-1') {
    notFound();
  }

  // Redirect to full single-page unit view without tabs
  redirect(`/sentence-builder-vol-2/${chapter}`);
}
