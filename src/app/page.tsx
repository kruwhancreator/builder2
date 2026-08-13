import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect root domain landing directly to the book landing directory
  redirect('/sentence-builder-vol-2');
}
