import Icon from '../../components/Icon';

export default function AuthArt() {
  return (
    <div className="auth-art" aria-hidden="true">
      <span className="auth-art-orb auth-art-orb-a" />
      <span className="auth-art-orb auth-art-orb-b" />
      <span className="auth-art-icon auth-art-icon-a">
        <Icon name="gift" size={20} />
      </span>
      <span className="auth-art-icon auth-art-icon-b">
        <Icon name="users" size={20} />
      </span>
      <span className="auth-art-icon auth-art-icon-c">
        <Icon name="cart" size={20} />
      </span>
    </div>
  );
}
