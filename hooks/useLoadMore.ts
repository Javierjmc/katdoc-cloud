// hooks/useLoadMore.ts
// ============================================================
// Paginación cliente "cargar más": muestra un slice inicial y
// va revelando de a PAGE_SIZE. Resetea al cambiar la lista base.
// ============================================================
import { useState, useMemo, useEffect } from 'react';

export function useLoadMore<T>(list: T[], pageSize: number) {
  const [count, setCount] = useState(pageSize);

  useEffect(() => {
    setCount(pageSize);
  }, [list, pageSize]);

  const visible = useMemo(() => list.slice(0, count), [list, count]);
  const hasMore = list.length > count;

  const loadMore = () => setCount(c => c + pageSize);

  return { visible, hasMore, loadMore };
}
