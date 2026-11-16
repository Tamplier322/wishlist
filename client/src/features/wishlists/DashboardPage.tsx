import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAddItemMutation,
  useCreateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useGetWorkspacesQuery,
  useCreateWishlistMutation,
  useDeleteWishlistMutation,
  useGetInvitesQuery,
  useGetWishlistsQuery,
  useRespondToInviteMutation,
} from '../../api/baseApi';
import { useAuthStatus } from '../../app/hooks';
import { useT } from '../../i18n';
import { LIST_TEMPLATES, BASE_WISH } from './listTemplates';
import Modal from '../../components/Modal';


export default function DashboardPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const { user } = useAuthStatus();

  const { data: wishlists = [], isLoading } = useGetWishlistsQuery();
  const { data: invites = [] } = useGetInvitesQuery();
  const { data: workspaces = [] } = useGetWorkspacesQuery();
  const [createWishlist] = useCreateWishlistMutation();
  const [deleteWishlist] = useDeleteWishlistMutation();
  const [respondToInvite] = useRespondToInviteMutation();
  const [addItem] = useAddItemMutation();
  const [createWorkspace] = useCreateWorkspaceMutation();
  const [deleteWorkspace] = useDeleteWorkspaceMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);

  const [activeWorkspace, setActiveWorkspace] = useState<string>('all');

  useEffect(() => {
    document.title = `Wishlist — ${t('dashboard.title')}`;
  }, [t]);

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const wishlist = await createWishlist({
      name,
      description: newDescription.trim() || undefined,
      workspaceId: activeWorkspace === 'all' ? null : activeWorkspace,
    }).unwrap();


    const template = templateId ? LIST_TEMPLATES.find((entry) => entry.id === templateId) : null;
    if (template) {
      for (const title of template.wishes) {
        await addItem({ wishlistId: wishlist.id, value: { ...BASE_WISH, title } });
      }
    }

    setCreateOpen(false);
    setNewName('');
    setNewDescription('');
    setTemplateId(null);
  }

  function handleOpen(wishlistId: string): void {
    navigate(`/wishlist/${wishlistId}`);
  }

  function handleDelete(event: React.MouseEvent, id: string): void {
    event.stopPropagation();
    if (window.confirm(t('dashboard.deleteConfirm'))) {
      void deleteWishlist(id);
    }
  }

  async function handleCreateWorkspace(): Promise<void> {
    const name = window.prompt(t('dashboard.workspaceName'));
    if (name?.trim()) void createWorkspace({ name: name.trim(), color: '#c9762e' });
  }

  const visibleWishlists =
    activeWorkspace === 'all'
      ? wishlists
      : wishlists.filter((wishlist) => wishlist.workspaceId === activeWorkspace);

  return (
    <div className="container">
      <div className="wishlist-toolbar">
        <h1 className="section-title" style={{ margin: 0 }}>
          {t('dashboard.title')}
        </h1>
        <button className="btn btn-accent" onClick={() => setCreateOpen(true)}>
          + {t('dashboard.newList')}
        </button>
      </div>

      <div className="category-bar">
        <button
          className={`category-chip ${activeWorkspace === 'all' ? 'active' : ''}`}
          onClick={() => setActiveWorkspace('all')}
        >
          {t('dashboard.allWorkspaces')}
        </button>
        {workspaces.map((workspace) => (
          <span key={workspace.id} style={{ position: 'relative', display: 'inline-flex' }}>
            <button
              className={`category-chip ${activeWorkspace === workspace.id ? 'active' : ''}`}
              onClick={() => setActiveWorkspace(workspace.id)}
            >
              <span className="badge-dot" style={{ background: workspace.color }} />
              {workspace.name}
            </button>
            <button
              onClick={() => void deleteWorkspace(workspace.id)}
              title={t('common.delete')}
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: '1px solid var(--line-strong)',
                background: 'var(--white)',
                color: 'var(--danger)',
                fontSize: 11,
                lineHeight: 1,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </span>
        ))}
        {workspaces.length < 6 && (
          <button className="category-chip" onClick={handleCreateWorkspace}>
            + {t('dashboard.workspace')}
          </button>
        )}
      </div>

      {invites.length > 0 && (
        <section style={{ marginBottom: 26 }}>
          <h2 className="section-title" style={{ fontSize: 16 }}>
            {t('dashboard.invites')}
          </h2>
          {invites.map((invite) => (
            <div key={invite.id} className="invite-item">
              <div>
                <div className="who">
                  «{invite.wishlistName}» — {t('dashboard.from')} {invite.fromUsername}
                </div>
                <div className="faint">{t('dashboard.inviteText')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-sm btn-accent"
                  onClick={() => void respondToInvite({ inviteId: invite.id, accept: true })}
                >
                  {t('dashboard.accept')}
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => void respondToInvite({ inviteId: invite.id, accept: false })}
                >
                  {t('dashboard.decline')}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {isLoading && <div className="spinner" />}

      {!isLoading && visibleWishlists.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🎁</div>
          <h3>{t('dashboard.emptyTitle')}</h3>
          <p>{t('dashboard.emptyText')}</p>
          <button className="btn btn-accent" style={{ marginTop: 14 }} onClick={() => setCreateOpen(true)}>
            + {t('dashboard.newList')}
          </button>
        </div>
      )}

      <div className="wl-grid">
        {visibleWishlists.map((wishlist) => {
          const isOwner = user?.id === wishlist.ownerId;
          return (
            <article
              key={wishlist.id}
              className="wl-card"
              onClick={() => handleOpen(wishlist.id)}
            >
              <div className="wl-card-title">{wishlist.name}</div>
              <div className="wl-card-desc">{wishlist.description || t('dashboard.noDescription')}</div>
              <div className="wl-card-footer">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge">{isOwner ? t('dashboard.owner') : t('dashboard.member')}</span>
                  <span className="badge" title={t('dashboard.totalWishes')}>
                    🎁 {wishlist.stats?.total ?? 0}
                  </span>
                  <span className="badge" title={t('dashboard.purchasedWishes')}>
                    ✓ {wishlist.stats?.purchased ?? 0}
                  </span>
                  {wishlist.isShared && (
                    <span className="badge" style={{ color: 'var(--peach-deep)' }}>
                      🔗 {t('dashboard.openedByLink')}
                    </span>
                  )}
                </div>
                {isOwner && (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={(event) => handleDelete(event, wishlist.id)}
                    aria-label={t('common.delete')}
                  >
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {createOpen && (
        <Modal title={t('dashboard.newList')} onClose={() => setCreateOpen(false)}>
          <form onSubmit={handleCreate}>
            <div className="field">
              <label htmlFor="wl-name">{t('dashboard.formName')}</label>
              <input
                id="wl-name"
                className="input"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder={t('dashboard.formNamePlaceholder')}
                autoFocus
                required
              />
              {null}
            </div>
            <div className="field">
              <label htmlFor="wl-desc">{t('dashboard.formDescription')}</label>
              <textarea
                id="wl-desc"
                className="textarea"
                value={newDescription}
                onChange={(event) => setNewDescription(event.target.value)}
                placeholder={t('dashboard.formDescriptionPlaceholder')}
              />
            </div>
            <div className="field">
              <label htmlFor="wl-template">{t('dashboard.template')}</label>
              <select
                id="wl-template"
                className="select"
                value={templateId ?? ''}
                onChange={(event) => setTemplateId(event.target.value || null)}
              >
                <option value="">{t('dashboard.templateNone')}</option>
                {LIST_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setCreateOpen(false)}>
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary">
                {t('common.create')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
