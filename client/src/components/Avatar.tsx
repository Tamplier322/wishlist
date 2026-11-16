interface AvatarProps {
  name: string;
  color: string;
  size?: 'sm' | 'md';

  image?: string | null;
}

export default function Avatar({ name, color, size = 'md', image = null }: AvatarProps) {
  if (image) {
    return (
      <span className={`avatar avatar-image ${size === 'sm' ? 'avatar-sm' : ''}`} style={{ background: color }}>
        <img src={image} alt={name} />
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
