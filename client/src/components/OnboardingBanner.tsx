import { useState } from 'react';
import Icon from './Icon';
import { useT } from '../i18n';

const STORAGE_KEY = 'wl_onboarded_v1';

export default function OnboardingBanner() {
  const { t } = useT();
  const [visible, setVisible] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== '1';
    } catch {
      return false;
    }
  });

  if (!visible) return null;

  function dismiss(): void {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      void 0;
    }
    setVisible(false);
  }

  const steps = [
    { icon: 'plus' as const, title: t('onboarding.step1Title'), text: t('onboarding.step1Text') },
    { icon: 'gift' as const, title: t('onboarding.step2Title'), text: t('onboarding.step2Text') },
    { icon: 'users' as const, title: t('onboarding.step3Title'), text: t('onboarding.step3Text') },
  ];

  return (
    <section className="onboarding-banner">
      <div className="onboarding-head">
        <span className="onboarding-title">
          <Icon name="sparkles" size={16} />
          {t('onboarding.title')}
        </span>
        <button className="btn btn-sm btn-ghost" onClick={dismiss}>
          {t('onboarding.dismiss')}
        </button>
      </div>
      <div className="onboarding-steps">
        {steps.map((step) => (
          <div key={step.title} className="onboarding-step">
            <span className="onboarding-step-icon">
              <Icon name={step.icon} size={16} />
            </span>
            <div>
              <b>{step.title}</b>
              <p className="faint">{step.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
