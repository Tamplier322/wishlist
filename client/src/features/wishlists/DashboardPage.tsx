import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDialog } from '../../components/DialogProvider';
import { getApiErrorMessage } from '../../utils/api-error';
import {
  baseApi,
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
import { useAppDispatch, useAuthStatus } from '../../app/hooks';
import { useT } from '../../i18n';
import { LIST_TEMPLATES, BASE_WISH } from './listTemplates';
import Modal from '../../components/Modal';
import Icon from '../../components/Icon';
import EmptyIllustration from '../../components/EmptyIllustration';
import { CardGridSkeleton } from '../../components/Skeleton';
import OnboardingBanner from '../../components/OnboardingBanner';


export default function DashboardPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useT();
  const { user } = useAuthStatus();
  const { confirm, alert: showAlert } = useDialog();

  const { data: wishlists = [], isLoading } = useGetWishlistsQuery();
  const { data: invites = [] } = useGetInvitesQuery();
  const { data: workspaces = [] } = useGetWorkspacesQuery();
  const [createWishlist, { isLoading: creatingList }] = useCreateWishlistMutation();
  const [deleteWishlist] = useDeleteWishlistMutation();
  const [respondToInvite] = useRespondToInviteMutation();
  const [addItem] = useAddItemMutation();
  const [createWorkspace, { isLoading: creatingWorkspace }] = useCreateWorkspaceMutation();
  const [deleteWorkspace] = useDeleteWorkspaceMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [templateId, setTemplateId] = useState<string | null>(null);

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');

  const [activeWorkspace, setActiveWorkspace] = useState<string>('all');

  useEffect(() => {
    document.title = `Wishlist — ${t('dashboard.title')}`;
  }, [t]);

  async function handleCreate(event: FormEvent): Promise<void> {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;

    let wishlistId: string;
    try {
      const wishlist = await createWishlist({
        name,
        description: newDescription.trim() || undefined,
        workspaceId: activeWorkspace === 'all' ? null : activeWorkspace,
      }).unwrap();
      wishlistId = wishlist.id;
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.createListError')),
      });
      return;
    }

    setCreateOpen(false);
    setNewName('');
    setNewDescription('');
    setTemplateId(null);

    const template = templateId ? LIST_TEMPLATES.find((entry) => entry.id === templateId) : null;
    if (template) {
      try {
        await Promise.all(
          template.wishes.map((title) =>
            addItem({ wishlistId, value: { ...BASE_WISH, title } }).unwrap(),
          ),
        );
      } catch (error) {
        await showAlert({
          title: t('common.errorTitle'),
          message: getApiErrorMessage(error, t('dialogs.saveError')),
        });
      }
    }
  }

  function handleOpen(wishlistId: string): void {
    navigate(`/wishlist/${wishlistId}`);
  }

  async function handleDelete(
    event: React.MouseEvent,
    wishlist: { id: string; name: string },
  ): Promise<void> {
    event.stopPropagation();
    const ok = await confirm({
      title: t('dialogs.deleteListTitle'),
      message: t('dialogs.deleteListConfirm', { name: wishlist.name }),
      confirmLabel: t('common.delete'),
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteWishlist(wishlist.id).unwrap();
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.deleteError')),
      });
    }
  }

  function handleCreateWorkspace(): void {
    setWorkspaceName('');
    setWorkspaceOpen(true);
  }

  async function handleWorkspaceSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    const name = workspaceName.trim();
    if (!name) return;
    try {
      await createWorkspace({ name, color: '#c9762e' }).unwrap();
      setWorkspaceOpen(false);
      setWorkspaceName('');
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.saveError')),
      });
    }
  }

  async function handleDeleteWorkspace(workspace: { id: string; name: string }): Promise<void> {
    const ok = await confirm({
      title: t('dialogs.deleteWorkspaceTitle'),
      message: t('dialogs.deleteWorkspaceConfirm', { name: workspace.name }),
      confirmLabel: t('common.delete'),
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteWorkspace(workspace.id).unwrap();
    } catch (error) {
      await showAlert({
        title: t('common.errorTitle'),
        message: getApiErrorMessage(error, t('dialogs.deleteError')),
      });
    }
  }

  const visibleWishlists =
    activeWorkspace === 'all'
      ? wishlists
      : wishlists.filter((wishlist) => wishlist.workspaceId === activeWorkspace);

  return (
    <div className="container">
      <div className="wishlist-toolbar">
        <h1 className="section-title" style={{ margin: 0 }}>
          <Icon name="grid" size={20} />
          {t('dashboard.title')}
        </h1>
        <button className="btn btn-accent mobile-fab" onClick={() => setCreateOpen(true)}>
          <Icon name="plus" size={16} />
          {t('dashboard.newList')}
        </button>
      </div>

      <OnboardingBanner />

      <div className="category-bar">
        <button
          className={`category-chip ${activeWorkspace === 'all' ? 'active' : ''}`}
          onClick={() => setActiveWorkspace('all')}
        >
          <Icon name="grid" size={14} />
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
              className="workspace-remove"
              onClick={() => void handleDeleteWorkspace(workspace)}
              title={t('common.delete')}
              style={{
                position: 'absolute',
                top: -6,
                right: -6,
                width: 18,
                height: 18,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                border: '1px solid var(--line-strong)',
                background: 'var(--white)',
                color: 'var(--danger)',
                cursor: 'pointer',
              }}
            >
              <Icon name="close" size={11} />
            </button>
          </span>
        ))}
        {workspaces.length < 6 && (
          <button className="category-chip" onClick={handleCreateWorkspace}>
            <Icon name="plus" size={14} />
            {t('dashboard.workspace')}
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
                  <Icon name="users" size={15} style={{ color: 'var(--peach-deep)' }} />{' '}
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

      {isLoading && <CardGridSkeleton count={3} />}

      {!isLoading && visibleWishlists.length === 0 && (
        <div className="empty-state">
          <EmptyIllustration icon="gift" />
          <h3>{t('dashboard.emptyTitle')}</h3>
          <p>{t('dashboard.emptyText')}</p>
          <button className="btn btn-accent" style={{ marginTop: 14 }} onClick={() => setCreateOpen(true)}>
            <Icon name="plus" size={16} />
            {t('dashboard.newList')}
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
              onMouseEnter={() => {
                dispatch(baseApi.util.prefetch('getWishlistContent', wishlist.id, { force: false }));
              }}
            >
              <div className="wl-card-head">
                <div className="wl-card-icon">
                  <Icon name="folder" size={20} />
                </div>
                <Icon name="arrow-right" size={17} className="wl-card-open" />
              </div>
              <div className="wl-card-title">{wishlist.name}</div>
              <div className="wl-card-desc">{wishlist.description || t('dashboard.noDescription')}</div>
              <div className="wl-card-footer">
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge">
                    <Icon name={isOwner ? 'star' : 'users'} size={12} />
                    {isOwner ? t('dashboard.owner') : t('dashboard.member')}
                  </span>
                  <span className="badge" title={t('dashboard.totalWishes')}>
                    <Icon name="gift" size={12} />
                    {wishlist.stats?.total ?? 0}
                  </span>
                  <span className="badge" title={t('dashboard.purchasedWishes')}>
                    <Icon name="check-circle" size={12} />
                    {wishlist.stats?.purchased ?? 0}
                  </span>
                  {wishlist.isShared && (
                    <span className="badge" style={{ color: 'var(--peach-deep)' }}>
                      <Icon name="link" size={12} />
                      {t('dashboard.openedByLink')}
                    </span>
                  )}
                </div>
                {isOwner && (
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={(event) => void handleDelete(event, wishlist)}
                    aria-label={t('common.delete')}
                  >
                    <Icon name="trash" size={13} />
                    {t('common.delete')}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {createOpen && (
        <Modal
          title={t('dashboard.newList')}
          onClose={() => setCreateOpen(false)}
          busy={creatingList}
          busyLabel={t('common.saving')}
        >
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
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCreateOpen(false)}
                disabled={creatingList}
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={creatingList}>
                <Icon name="check" size={15} />
                {creatingList ? t('common.saving') : t('common.create')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {workspaceOpen && (
        <Modal
          title={t('dialogs.newWorkspaceTitle')}
          onClose={() => setWorkspaceOpen(false)}
          busy={creatingWorkspace}
          busyLabel={t('common.saving')}
        >
          <form onSubmit={handleWorkspaceSubmit}>
            <div className="field">
              <label htmlFor="ws-name">{t('dashboard.workspaceName')}</label>
              <input
                id="ws-name"
                className="input"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setWorkspaceOpen(false)}
                disabled={creatingWorkspace}
              >
                {t('common.cancel')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={creatingWorkspace}>
                <Icon name="check" size={15} />
                {creatingWorkspace ? t('common.saving') : t('common.create')}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
