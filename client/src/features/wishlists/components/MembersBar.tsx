import { useState, type FormEvent } from 'react';
import Avatar from '../../../components/Avatar';
import Modal from '../../../components/Modal';
import { useSendInviteMutation } from '../../../api/baseApi';
import { useT } from '../../../i18n';
import type { WishlistMember } from '../../../types';

interface MembersBarProps {
  members: WishlistMember[];
  isOwner: boolean;
  ownerId: string;
  wishlistId: string;

  inviteCode?: string | null;
  onRemoveMember: (userId: string) => void;
}

export default function MembersBar({
  members,
  isOwner,
  ownerId,
  wishlistId,
  inviteCode,
  onRemoveMember,
}: MembersBarProps) {
  const { t } = useT();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendInvite] = useSendInviteMutation();

  const inviteButtonVisible = isOwner && members.length < 5;
  const inviteLink = inviteCode ? `${window.location.origin}/invite/${inviteCode}` : null;

  async function handleInvite(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    try {
      await sendInvite({ wishlistId, username: trimmed }).unwrap();
      setUsername('');
      setInviteOpen(false);
    } catch (error) {
      const message =
        typeof error === 'object' && error !== null && 'data' in error
          ? String((error.data as { message?: string }).message ?? '')
          : '';
      if (message) alert(message);
    }
  }

  async function handleCopy(): Promise<void> {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      void 0;
    }
  }

  return (
    <div className="members-bar">
      <span className="faint" style={{ marginRight: 4 }}>
        {t('wishlist.members')} ({members.length}/5):
      </span>

      {members.map((member) => (
        <span key={member.id} className="member-chip" style={{ borderColor: member.color }}>
          <Avatar name={member.user.username} color={member.color} size="sm" />
          {member.user.username}
          {member.role === 'owner' && <span className="role">{t('wishlist.ownerBadge')}</span>}
          {isOwner && member.userId !== ownerId && (
            <button
              className="modal-close"
              style={{ fontSize: 14, padding: '0 4px', color: 'var(--danger)' }}
              title={t('common.delete')}
              onClick={() => onRemoveMember(member.userId)}
            >
              ×
            </button>
          )}
        </span>
      ))}

      {inviteButtonVisible && (
        <button className="btn btn-sm" onClick={() => setInviteOpen(true)}>
          + {t('wishlist.inviteBtn', { count: 5 - members.length })}
        </button>
      )}

      {isOwner && members.length >= 5 && <span className="faint">{t('wishlist.inviteLimit')}</span>}

      {isOwner && inviteLink && (
        <div className="invite-link-row">
          <span className="faint">{t('wishlist.inviteLinkHint')}</span>
          <code>{inviteLink}</code>
          <button className="btn btn-sm" onClick={handleCopy}>
            {copied ? t('wishlist.copied') : t('wishlist.copyLink')}
          </button>
        </div>
      )}

      {inviteOpen && (
        <Modal title={t('wishlist.inviteTitle')} onClose={() => setInviteOpen(false)}>
          <p className="muted" style={{ marginBottom: 14, fontSize: 13.5 }}>
            {t('wishlist.inviteHint')}
          </p>
          <form onSubmit={handleInvite}>
            <div className="field">
              <label htmlFor="invite-username">{t('auth.username')}</label>
              <input
                id="invite-username"
                className="input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder={t('wishlist.invitePlaceholder')}
                autoFocus
                required
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setInviteOpen(false)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">
                {t('wishlist.inviteSend')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
