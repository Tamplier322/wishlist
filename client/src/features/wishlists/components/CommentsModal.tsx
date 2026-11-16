import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAddCommentMutation, useGetCommentsQuery } from '../../../api/baseApi';
import { useAuthStatus } from '../../../app/hooks';
import Avatar from '../../../components/Avatar';
import Modal from '../../../components/Modal';
import { useT } from '../../../i18n';
import type { WishItem } from '../../../types';

interface CommentsModalProps {
  item: WishItem;
  onClose: () => void;
}


export default function CommentsModal({ item, onClose }: CommentsModalProps) {
  const { t } = useT();
  const { user } = useAuthStatus();
  const { data: comments = [], isLoading } = useGetCommentsQuery(item.id);
  const [addComment, { isLoading: sending }] = useAddCommentMutation();
  const listRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [hideFromAuthor, setHideFromAuthor] = useState(false);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [comments.length]);

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    await addComment({ itemId: item.id, text: trimmed, hideFromAuthor }).unwrap();
    setText('');
    setHideFromAuthor(false);
  }

  const isAuthor = user !== null && item.authorId === user.id;

  return (
    <Modal title={`💬 ${t('comments.title')}`} onClose={onClose} large>
      <div className="comments-subject muted">{item.title}</div>

      <div className="comments-list" ref={listRef}>
        {isLoading && <div className="spinner" />}
        {!isLoading && comments.length === 0 && (
          <div className="bell-empty">{t('comments.empty')}</div>
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
                  <span className="faint">
                    {new Date(comment.createdAt).toLocaleString(undefined, {
                      day: '2-digit',
                      month: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
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
          onChange={(event) => setText(event.target.value)}
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
