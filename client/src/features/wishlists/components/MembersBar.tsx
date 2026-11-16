import { useState, type FormEvent } from 'react';
import Avatar from '../../../components/Avatar';
import Icon from '../../../components/Icon';
import Modal from '../../../components/Modal';
import { useDialog } from '../../../components/DialogProvider';
import { useSendInviteMutation, useSetMemberRoleMutation } from '../../../api/baseApi';
import { useT } from '../../../i18n';
import { getApiErrorMessage } from '../../../utils/api-error';
import type { WishlistMember } from '../../../types';

interface MembersBarProps {
  members: WishlistMember[];
  isOwner: boolean;
  ownerId: string;
  wishlistId: string;

  inviteCode?: string | null;
  onlineUserIds?: string[];
  onRemoveMember: (userId: string) => void;
}

export default function MembersBar({
  members,
  isOwner,
  ownerId,
  wishlistId,
  inviteCode,
  onlineUserIds = [],
  onRemoveMember,
}: MembersBarProps) {
  const { t } = useT();
  const { alert: showAlert } = useDialog();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendInvite, { isLoading: sending }] = useSendInviteMutation();
  const [setMemberRole] = useSetMemberRoleMutation();

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
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.inviteError')),
      });
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
        <Icon name="users" size={14} />
        {t('wishlist.members')} ({members.length}/5):
      </span>

      {members.map((member) => {
        const isOnline = onlineUserIds.includes(member.userId);
        return (
        <span
          key={member.id}
          className={`member-chip ${isOnline ? 'online' : ''}`}
          style={{ borderColor: member.color }}
          title={isOnline ? t('wishlist.online') : undefined}
        >
          <Avatar name={member.user.username} color={member.color} size="sm" />
          {isOnline && <span className="presence-dot" aria-hidden />}
          {member.user.username}
          {member.role === 'owner' && <span className="role">{t('wishlist.ownerBadge')}</span>}
          {isOwner && member.userId !== ownerId && (
            <select
              className="member-role"
              value={member.role === 'viewer' ? 'viewer' : 'editor'}
              aria-label={t('wishlist.roleEditor')}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                void setMemberRole({
                  wishlistId,
                  userId: member.userId,
                  role: event.target.value === 'viewer' ? 'viewer' : 'editor',
                });
              }}
            >
              <option value="editor">{t('wishlist.roleEditor')}</option>
              <option value="viewer">{t('wishlist.roleViewer')}</option>
            </select>
          )}
          {isOwner && member.userId !== ownerId && (
            <button
              className="modal-close"
              style={{ width: 22, height: 22, color: 'var(--danger)' }}
              title={t('common.delete')}
              aria-label={t('common.delete')}
              onClick={() => onRemoveMember(member.userId)}
            >
              <Icon name="close" size={12} />
            </button>
          )}
        </span>
        );
      })}

      {inviteButtonVisible && (
        <button className="btn btn-sm" onClick={() => setInviteOpen(true)}>
          <Icon name="plus" size={14} />
          {t('wishlist.inviteBtn', { count: 5 - members.length })}
        </button>
      )}

      {isOwner && members.length >= 5 && <span className="faint">{t('wishlist.inviteLimit')}</span>}

      {isOwner && inviteLink && (
        <div className="invite-link-row">
          <Icon name="link" size={14} />
          <span className="faint">{t('wishlist.inviteLinkHint')}</span>
          <code>{inviteLink}</code>
          <button className="btn btn-sm" onClick={handleCopy}>
            <Icon name={copied ? 'check' : 'copy'} size={13} />
            {copied ? t('wishlist.copied') : t('wishlist.copyLink')}
          </button>
        </div>
      )}

      {inviteOpen && (
        <Modal
          title={t('wishlist.inviteTitle')}
          onClose={() => setInviteOpen(false)}
          busy={sending}
          busyLabel={t('common.loading')}
        >
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
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setInviteOpen(false)}
                disabled={sending}
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={sending}>
                <Icon name="users" size={14} />
                {sending ? t('common.loading') : t('wishlist.inviteSend')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
