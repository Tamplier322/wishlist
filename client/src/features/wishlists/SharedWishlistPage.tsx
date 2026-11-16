import { Link, useParams } from 'react-router-dom';
import { useGetSharedWishlistQuery } from '../../api/baseApi';
import Avatar from '../../components/Avatar';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import { useT } from '../../i18n';


export default function SharedWishlistPage() {
  const { slug } = useParams();
  const { t } = useT();
  const { data: view, isLoading, isError } = useGetSharedWishlistQuery(slug ?? '', {
    skip: !slug,
  });

  return (
    <div className="page">
      <Header publicMode />

      <main className="main">
        <div className="container">
          {isLoading && <div className="spinner" />}

          {isError && (
            <div className="empty-state">
              <div className="empty-icon">🔒</div>
              <h3>{t('shared.unavailable')}</h3>
              <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
                {t('common.backHome')}
              </Link>
            </div>
          )}

          {view && (
            <>
              <h1 className="wishlist-title">{view.wishlist.name}</h1>
              {view.wishlist.description && (
                <p className="muted" style={{ marginBottom: 16 }}>
                  {view.wishlist.description}
                </p>
              )}

              <div className="members-bar">
                <span className="faint" style={{ marginRight: 4 }}>
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

              <div className="category-bar">
                {view.categories.map((category) => (
                  <span key={category.id} className="category-chip" style={{ cursor: 'default' }}>
                    <span className="badge-dot" style={{ background: category.color }} />
                    {category.name}
                  </span>
                ))}
              </div>

              {view.items.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📭</div>
                  <h3>{t('shared.noItems')}</h3>
                </div>
              ) : (
                <div className="items-grid">
                  {view.items.map((item) => {
                    const category = item.categoryId
                      ? (view.categories.find((entry) => entry.id === item.categoryId) ?? null)
                      : null;
                    return (
                      <article
                        key={item.id}
                        className={`wish-card ${item.status === 'purchased' ? 'status-purchased' : ''}`}
                        style={{ ['--author-color' as string]: item.authorColor }}
                      >
                        <div className="wish-card-body">
                          <div className="wish-card-title-row">
                            <h4 className="wish-card-title">{item.title}</h4>
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
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
