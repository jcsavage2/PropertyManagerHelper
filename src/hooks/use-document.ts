import { useEffect, useState } from 'react';

export function useDocument(): { clientDocument: Document | null } {
  const [_document, setDocument] = useState<Document | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDocument(document);
  }, [typeof window]);

  return { clientDocument: _document };
}
