
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="wl-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="wl-skeleton" key={index}>
          <span className="skeleton skeleton-icon" />
          <span className="skeleton skeleton-line skeleton-line-lg" />
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-line skeleton-line-sm" />
          <div className="wl-skeleton-footer">
            <span className="skeleton skeleton-pill" />
            <span className="skeleton skeleton-pill" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function WishlistSkeleton() {
  return (
    <div className="wishlist-skeleton" aria-hidden="true">
      <div className="wishlist-skeleton-head">
        <span className="skeleton skeleton-line skeleton-line-lg" />
        <span className="skeleton skeleton-pill" />
      </div>
      {[0, 1].map((group) => (
        <div className="wishlist-skeleton-group" key={group}>
          <span className="skeleton skeleton-line skeleton-line-sm" />
          <div className="items-grid">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="wish-skeleton" key={index}>
                <span className="skeleton skeleton-media" />
                <span className="skeleton skeleton-line skeleton-line-lg" />
                <span className="skeleton skeleton-line" />
                <span className="skeleton skeleton-pill" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
