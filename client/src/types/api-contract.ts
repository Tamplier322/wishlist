/**
 * AUTO-GENERATED FILE — не редактировать вручную.
 *
 * Источник: server/src/utils/contracts.ts (zod-схемы публичного API).
 * Перегенерация: cd server && npm run contracts:generate
 * Проверка в CI:  cd server && npm run contracts:check
 */

export type ApiPublicUser = {
    id: string;
    username: string;
    avatarColor: string;
    avatarImage?: string | undefined;
};

export type ApiCategory = {
    id: string;
    ownerId: string;
    name: string;
    color: string;
    position: number;
};

export type ApiWishItem = {
    id: string;
    wishlistId: string;
    authorId: string;
    authorName: string;
    authorColor: string;
    categoryId: string | null;
    title: string;
    description: string;
    link: string;
    imageUrl: string;
    price: number | null;
    currency: string;
    priority: "low" | "medium" | "high";
    kind: "game" | "skin" | "book" | "app" | "tech" | "other";
    status: "wanted" | "reserved" | "purchased";
    reservedBy: string | null;
    reservedByName: string | null;
    reservedByColor: string | null;
    reservedUntil: string | null;
    createdAt: string;
    updatedAt: string;
};

export type ApiTrashItem = {
    id: string;
    wishlistId: string;
    authorId: string;
    authorName: string;
    authorColor: string;
    categoryId: string | null;
    title: string;
    description: string;
    link: string;
    imageUrl: string;
    price: number | null;
    currency: string;
    priority: "low" | "medium" | "high";
    kind: "game" | "skin" | "book" | "app" | "tech" | "other";
    status: "wanted" | "reserved" | "purchased";
    reservedBy: string | null;
    reservedByName: string | null;
    reservedByColor: string | null;
    reservedUntil: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string;
};

export type ApiWishlist = {
    id: string;
    ownerId: string;
    name: string;
    description: string;
    isShared: boolean;
    shareSlug: string | null;
    inviteCode: string | null;
    deadline: string | null;
    surpriseMode: boolean;
    workspaceId: string | null;
    createdAt: string;
};

export type ApiOffer = {
    id: string;
    provider: string;
    title: string;
    price: number | null;
    currency: string;
    shipping?: (number | null) | undefined;
    totalPrice?: (number | null) | undefined;
    rating: number | null;
    ratingSource: string | null;
    extra: string | null;
    imageUrl: string | null;
    url: string;
    exact?: boolean | undefined;
    matchScore?: number | undefined;
    relevanceScore?: number | undefined;
};

export type ApiOffersResult = {
    query: string;
    kind: "game" | "skin" | "book" | "app" | "tech" | "other";
    offers: {
        id: string;
        provider: string;
        title: string;
        price: number | null;
        currency: string;
        shipping?: (number | null) | undefined;
        totalPrice?: (number | null) | undefined;
        rating: number | null;
        ratingSource: string | null;
        extra: string | null;
        imageUrl: string | null;
        url: string;
        exact?: boolean | undefined;
        matchScore?: number | undefined;
        relevanceScore?: number | undefined;
    }[];
    searchLinks: {
        name: string;
        url: string;
    }[];
    providersUsed: string[];
    bestPrice: {
        price: number;
        currency: string;
        provider: string;
        exact: boolean;
        shipping?: (number | null) | undefined;
        totalPrice?: (number | null) | undefined;
    } | null;
};

export type ApiAuthResult = {
    token: string;
    refreshToken?: string | undefined;
    user: {
        id: string;
        username: string;
        avatarColor: string;
        avatarImage?: string | undefined;
        email?: string | undefined;
        createdAt?: string | undefined;
    };
};

export type ApiWishlistContent = {
    wishlist: {
        id: string;
        ownerId: string;
        name: string;
        description: string;
        isShared: boolean;
        shareSlug: string | null;
        inviteCode: string | null;
        deadline: string | null;
        surpriseMode: boolean;
        workspaceId: string | null;
        createdAt: string;
    };
    members: {
        id: string;
        wishlistId: string;
        userId: string;
        role: "owner" | "editor" | "viewer" | "member";
        color: string;
        joinedAt: string;
        user: {
            id: string;
            username: string;
            avatarColor: string;
            avatarImage?: string | undefined;
        };
    }[];
    categories: {
        id: string;
        ownerId: string;
        name: string;
        color: string;
        position: number;
    }[];
    items: {
        id: string;
        wishlistId: string;
        authorId: string;
        authorName: string;
        authorColor: string;
        categoryId: string | null;
        title: string;
        description: string;
        link: string;
        imageUrl: string;
        price: number | null;
        currency: string;
        priority: "low" | "medium" | "high";
        kind: "game" | "skin" | "book" | "app" | "tech" | "other";
        status: "wanted" | "reserved" | "purchased";
        reservedBy: string | null;
        reservedByName: string | null;
        reservedByColor: string | null;
        reservedUntil: string | null;
        createdAt: string;
        updatedAt: string;
    }[];
    inviteCode?: (string | null) | undefined;
};

export type ApiEvent = {
    id: string;
    wishlistId: string;
    actorId: string;
    actorName: string;
    action: "item-added" | "item-updated" | "item-removed" | "item-restored" | "item-purged" | "wishlist-updated" | "member-removed" | "category-changed";
    targetId: string | null;
    title: string | null;
    detail: string | null;
    createdAt: string;
};

export type ApiUser = {
    id: string;
    username: string;
    avatarColor: string;
    avatarImage: string | null;
    displayName: string;
    email: string;
    hasPassword: boolean;
    createdAt: string;
};

export type ApiOAuthAccount = {
    provider: "google" | "telegram";
    displayName: string | null;
    avatarUrl: string | null;
    email: string | null;
    createdAt: string;
};

export type ApiOAuthAccounts = {
    accounts: {
        provider: "google" | "telegram";
        displayName: string | null;
        avatarUrl: string | null;
        email: string | null;
        createdAt: string;
    }[];
    hasPassword: boolean;
    available: {
        google: boolean;
        telegram: {
            enabled: boolean;
            botUsername: string | null;
            botId: string | null;
        };
    };
};
