import { useEffect, useState } from 'react';
import { useAppSelector } from '../app/hooks';


export default function TopProgressBar() {
  const pending = useAppSelector((state) => {
    const queries = Object.values(state.api.queries ?? {});
    const mutations = Object.values(state.api.mutations ?? {});
    return (
      queries.some((query) => (query as { status?: string } | null)?.status === 'pending') ||
      mutations.some((mutation) => (mutation as { status?: string } | null)?.status === 'pending')
    );
  });

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pending) {

      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setVisible(false), 350);
    return () => clearTimeout(timer);
  }, [pending]);

  if (!visible) return null;
  return <div className={`top-progress ${pending ? '' : 'done'}`} aria-hidden />;
}
