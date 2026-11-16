import { execRun, getRow, getRows } from '../../config/database';
import { createId } from '../../utils/ids';
import type { Comment, PublicUser } from '../../types/domain';

interface CommentRow {
  id: string;
  item_id: string;
  author_id: string;
  text: string;
  hide_from_author: number;
  created_at: string;
  username: string;
  avatar_color: string;
}

function toComment(row: CommentRow): Comment {
  const author: PublicUser = {
    id: row.author_id,
    username: row.username,
    avatarColor: row.avatar_color,
  };
  return {
    id: row.id,
    itemId: row.item_id,
    author,
    text: row.text,
    hideFromAuthor: row.hide_from_author === 1,
    createdAt: row.created_at,
  };
}

const SELECT = `
  SELECT c.*, u.username, u.avatar_color
  FROM comments c
  JOIN users u ON u.id = c.author_id
`;

export async function findCommentsByItem(itemId: string): Promise<Comment[]> {
  const rows = await getRows<CommentRow>(
    `${SELECT} WHERE c.item_id = ? ORDER BY c.created_at`,
    [itemId],
  );
  return rows.map(toComment);
}

export async function createComment(input: {
  itemId: string;
  authorId: string;
  text: string;
  hideFromAuthor: boolean;
}): Promise<Comment> {
  const id = createId();
  const now = new Date().toISOString();
  await execRun(
    `INSERT INTO comments (id, item_id, author_id, text, hide_from_author, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, input.itemId, input.authorId, input.text, input.hideFromAuthor ? 1 : 0, now],
  );
  const row = await getRow<CommentRow>(`${SELECT} WHERE c.id = ?`, [id]);
  if (!row) throw new Error('Failed to create comment');
  return toComment(row);
}
