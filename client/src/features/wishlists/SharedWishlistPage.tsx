import { useState, type MouseEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGetSharedWishlistQuery } from '../../api/baseApi';
import Avatar from '../../components/Avatar';
import EmptyIllustration from '../../components/EmptyIllustration';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import Icon from '../../components/Icon';
import { useT } from '../../i18n';
import { PRIORITY_KEYS } from '../../i18n/labels';
import { groupAndSortByPriority } from '../../utils/priority';
import { shareLink } from '../../utils/share';
import { KIND_ICONS, PRIORITY_ICONS } from '../../utils/item-icons';
import WishDetailsModal from './components/WishDetailsModal';
import type { WishItem } from '../../types';


export default function SharedWishlistPage() {
  const { slug } = useParams();
  const { t } = useT();
  const { data: view, isLoading, isError } = useGetSharedWishlistQuery(slug ?? '', {
    skip: !slug,
  });
  const [detailsItem, setDetailsItem] = useState<WishItem | null>(null);
  const groups = view ? groupAndSortByPriority(view.items, 'default') : [];
  const detailsCurrent = detailsItem
    ? (view?.items.find((item) => item.id === detailsItem.id) ?? detailsItem)
    : null;

  function handleCardClick(event: MouseEvent<HTMLElement>, item: WishItem): void {
    if ((event.target as HTMLElement).closest('button, a, input, textarea, select, label')) return;
    setDetailsItem(item);
  }

  async function handleShare(): Promise<void> {
    if (!slug) return;
    await shareLink({
      title: view?.wishlist.name ?? 'Wishlist',
      text: t('shared.shareText'),
      url: `${window.location.origin}/s/${slug}`,
    });
  }

  return (
    <div className="page">
      <Header publicMode />

      <main className="main">
        <div className="container">
          {isLoading && <div className="spinner" />}

          {isError && (
            <div className="empty-state">
              <EmptyIllustration icon="lock" tone="sand" />
              <h3>{t('shared.unavailable')}</h3>
              <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
                <Icon name="arrow-right" size={15} />
                {t('common.backHome')}
              </Link>
            </div>
          )}

          {view && (
            <>
              <div className="shared-head">
                <h1 className="wishlist-title">{view.wishlist.name}</h1>
                <button className="btn btn-sm" onClick={() => void handleShare()}>
                  <Icon name="share" size={14} />
                  {t('shared.shareBtn')}
                </button>
              </div>
              {view.wishlist.description && (
                <p className="muted" style={{ marginBottom: 16 }}>
                  {view.wishlist.description}
                </p>
              )}

              <div className="members-bar">
                <span className="faint" style={{ marginRight: 4 }}>
                  <Icon name="users" size={14} />
                  {t('shared.ownerAndMembers')}:
                </span>
                {view.members.map((member) => (
                  <span key={member.id} className="member-chip" style={{ borderColor: member.color }}>
                    <Avatar name={member.user.username} color={member.color} size="sm" />
                    {member.user.username}
                    {member.role === 'owner' && <span className="role">{t('wishlist.ownerBadge')}</span>}
                  </span>
                ))}
              </div>

              {view.wishlist.shareSlug && (
                <div className="shared-qr">
                  <img
                    src={`/api/public/wishlists/${view.wishlist.shareSlug}/qr.svg`}
                    alt={t('shared.qrHint')}
                    width={112}
                    height={112}
                    loading="lazy"
                  />
                  <span className="faint">{t('shared.qrHint')}</span>
                </div>
              )}

              <div className="category-bar">
                {view.categories.map((category) => (
                  <span key={category.id} className="category-chip" style={{ cursor: 'default' }}>
                    <span className="badge-dot" style={{ background: category.color }} />
                    {category.name}
                  </span>
                ))}
              </div>

              {groups.length === 0 ? (
                <div className="empty-state">
                  <EmptyIllustration icon="gift" tone="sage" />
                  <h3>{t('shared.noItems')}</h3>
                </div>
              ) : (
                groups.map((group) => (
                  <section key={group.priority} className="priority-group">
                    <div className="priority-group-title" data-priority={group.priority}>
                      <span className="priority-icon">
                        <Icon name={PRIORITY_ICONS[group.priority]} size={14} />
                      </span>
                      {t(PRIORITY_KEYS[group.priority])}
                      <span className="priority-count">{group.items.length}</span>
                    </div>
                    <div className="items-grid">
                      {group.items.map((item) => {
                        const category = item.categoryId
                          ? (view.categories.find((entry) => entry.id === item.categoryId) ?? null)
                          : null;
                        return (
                          <article
                            key={item.id}
                            className={`wish-card wish-card-clickable ${item.status === 'purchased' ? 'status-purchased' : ''}`}
                            style={{ ['--author-color' as string]: item.authorColor }}
                            onClick={(event) => handleCardClick(event, item)}
                          >
                            <div className="wish-card-body">
                              <div className="wish-card-title-row">
                                <div className="wish-card-title-main">
                                  <span className="wish-kind-icon wish-kind-icon-sm" aria-hidden>
                                    <Icon name={KIND_ICONS[item.kind]} size={18} />
                                  </span>
                                  <h4 className="wish-card-title">{item.title}</h4>
                                </div>
                                {item.price !== null && (
                                  <span className="wish-price">
                                    {item.price} {item.currency}
                                  </span>
                                )}
                              </div>
                              {item.description && <p className="wish-card-desc">{item.description}</p>}
                              <div className="wish-card-meta">
                                {category && (
                                  <span className="badge">
                                    <span className="badge-dot" style={{ background: category.color }} />
                                    {category.name}
                                  </span>
                                )}
                                <span className="wish-author">
                                  <span className="dot" />
                                  {item.authorName}
                                </span>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </>
          )}
        </div>
      </main>

      {detailsCurrent && view && (
        <WishDetailsModal
          item={detailsCurrent}
          category={
            detailsCurrent.categoryId
              ? (view.categories.find((entry) => entry.id === detailsCurrent.categoryId) ?? null)
              : null
          }
          onClose={() => setDetailsItem(null)}
        />
      )}

      <Footer />
    </div>
  );
}
