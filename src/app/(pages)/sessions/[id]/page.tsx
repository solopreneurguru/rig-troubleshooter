import { redirect } from 'next/navigation';
import SessionWorkspace from './SessionWorkspace';

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  if (!id || id === 'undefined') {
    redirect('/sessions/new');
  }
  
  return <SessionWorkspace params={{ id }} />;
}
