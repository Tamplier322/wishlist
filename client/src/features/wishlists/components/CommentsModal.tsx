import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAddCommentMutation, useGetCommentsQuery } from '../../../api/baseApi';
import { emitCommentTyping, subscribeToCommentTyping } from '../../../api/socket';
import { useAuthStatus } from '../../../app/hooks';
import Avatar from '../../../components/Avatar';
import Modal from '../../../components/Modal';
import { useDialog } from '../../../components/DialogProvider';
import { useT } from '../../../i18n';
import { getApiErrorMessage } from '../../../utils/api-error';
import type { WishItem } from '../../../types';

interface CommentsModalProps {
  item: WishItem;
  onClose: () => void;
}


export default function CommentsModal({ item, onClose }: CommentsModalProps) {
  const { t, formatDateTime } = useT();
  const { alert: showAlert } = useDialog();
  const { user } = useAuthStatus();
  const { data: comments = [], isLoading } = useGetCommentsQuery(item.id);
  const [addComment, { isLoading: sending }] = useAddCommentMutation();
  const listRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [hideFromAuthor, setHideFromAuthor] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [comments.length]);

  useEffect(() => {
    const unsubscribe = subscribeToCommentTyping(item.wishlistId, (payload) => {
      if (payload.itemId !== item.id) return;
      if (user !== null && payload.userId === user.id) return;
      setTypingUser(payload.username);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setTypingUser(null), 3000);
    });
    return () => {
      unsubscribe();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [item.id, item.wishlistId, user]);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      await addComment({ itemId: item.id, text: trimmed, hideFromAuthor }).unwrap();
      setText('');
      setHideFromAuthor(false);
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.sendCommentError')),
      });
    }
  }

  const isAuthor = user !== null && item.authorId === user.id;

  return (
    <Modal
      title={t('comments.title')}
      onClose={onClose}
      large
      busy={sending}
      busyLabel={t('common.loading')}
    >
      <div className="comments-subject muted">{item.title}</div>

      <div className="comments-list" ref={listRef}>
        {isLoading && <div className="spinner" />}
        {!isLoading && comments.length === 0 && (
          <div className="bell-empty">{t('comments.empty')}</div>
        )}
        {typingUser && (
          <div className="comment-typing faint" aria-live="polite">
            {t('comments.typing', { name: typingUser })}
          </div>
        )}
        {comments.map((comment) => {
          const mine = user !== null && comment.author.id === user.id;
          return (
            <div key={comment.id} className={`comment-row ${mine ? 'mine' : ''}`}>
              <Avatar name={comment.author.username} color={comment.author.avatarColor} size="sm" />
              <div className="comment-body">
                <div className="comment-meta">
                  <b>{comment.author.username}</b>
                  {comment.hideFromAuthor && <span className="badge">🤫 {t('comments.hiddenFromAuthor')}</span>}
                  <span className="faint">{formatDateTime(comment.createdAt)}</span>
                </div>
                <div className="comment-text">{comment.text}</div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="comment-form">
        <textarea
          className="textarea"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (event.target.value.trim()) emitCommentTyping(item.wishlistId, item.id);
          }}
          placeholder={t('comments.placeholder')}
          rows={2}
        />
        {!isAuthor && (
          <label className="comment-hide-toggle">
            <input
              type="checkbox"
              checked={hideFromAuthor}
              onChange={(event) => setHideFromAuthor(event.target.checked)}
            />
            🤫 {t('comments.hideFromAuthor')}
          </label>
        )}
        <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !text.trim()}>
          {t('comments.send')}
        </button>
      </form>
    </Modal>
  );
}
