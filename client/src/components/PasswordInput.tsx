import { useState } from 'react';
import Icon from './Icon';
import { useT } from '../i18n';

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}

export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  required = false,
}: PasswordInputProps) {
  const { t } = useT();
  const [visible, setVisible] = useState(false);

  return (
    <div className="input-wrap">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        className="input input-with-eye"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
      />
      <button
        type="button"
        className="input-eye"
        onClick={() => setVisible((prev) => !prev)}
        aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
        aria-pressed={visible}
        title={visible ? t('common.hidePassword') : t('common.showPassword')}
      >
        <Icon name={visible ? 'eye-off' : 'eye'} size={16} />
      </button>
    </div>
  );
}
