import Icon, { type IconName } from './Icon';

interface EmptyIllustrationProps {
  icon?: IconName;
  tone?: 'peach' | 'sage' | 'sand';
}

export default function EmptyIllustration({ icon = 'gift', tone = 'peach' }: EmptyIllustrationProps) {
  return (
    <div className={`empty-illustration tone-${tone}`} aria-hidden="true">
      <span className="empty-orb empty-orb-a" />
      <span className="empty-orb empty-orb-b" />
      <span className="empty-illustration-icon">
        <Icon name={icon} size={36} />
      </span>
      <span className="empty-spark empty-spark-a">
        <Icon name="sparkles" size={15} />
      </span>
      <span className="empty-spark empty-spark-b">
        <Icon name="star" size={12} />
      </span>
    </div>
  );
}
