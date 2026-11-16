import { useEffect, useState } from 'react';

interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md';

  image?: string | null;
}

export default function Avatar({ name, color, size = 'md', image = null }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [image]);

  if (image && !failed) {
    return (
      <span className={`avatar avatar-image ${size === 'sm' ? 'avatar-sm' : ''}`} style={{ background: color }}>
        <img src={image} alt={name} onError={() => setFailed(true)} />
      </span>
    );
  }

  const initials = name.slice(0, 2).toUpperCase();
  return (
    <span className={`avatar ${size === 'sm' ? 'avatar-sm' : ''}`} style={{ background: color }}>
      {initials}
    </span>
  );
}
