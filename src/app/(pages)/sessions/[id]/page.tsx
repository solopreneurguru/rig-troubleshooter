import { redirect } from 'next/navigation';
import SessionWorkspace from './SessionWorkspace';

export default async function SessionPage({ params }: { params: { id: string } }) {
  if (!params?.id || params.id === 'undefined') {
    redirect('/sessions/new');
  }
  
  return <SessionWorkspace params={params} />;
}
