import { Citation } from '@/types/steps';

export function Citations({ items }: { items?: Citation[] }) {
  if (!items?.length) return null;
  
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((c, i) => (
        <span key={i} className="rounded-md border px-2 py-1 text-sm bg-gray-100 text-gray-800">
          {c.tagRef?.tag
            ? `${c.tagRef.program ?? ''}/${c.tagRef.block ?? ''}/${c.tagRef.tag} ${c.tagRef.address ? `(${c.tagRef.address})` : ''}`
            : c.page !== undefined
              ? `Doc ${c.docId} • p.${c.page}`
              : c.note ?? 'Citation'}
        </span>
      ))}
    </div>
  );
}
