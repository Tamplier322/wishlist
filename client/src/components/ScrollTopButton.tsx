import { useEffect, useState } from 'react';
import Icon from './Icon';
import { useT } from '../i18n';

export default function ScrollTopButton() {
  const { t } = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll(): void {
      setVisible(window.scrollY > 420);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      className="scroll-top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label={t('common.scrollTop')}
      title={t('common.scrollTop')}
    >
      <Icon name="arrow-up" size={18} />
    </button>
  );
}
