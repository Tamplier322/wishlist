import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { tokenStorage } from './client';
import { enqueueRequest, isNetworkFailure } from '../utils/offline-queue';
import type {
  AuthEventsResponse,
  AuthResponse,
  BestImage,
  BestPrice,
  Category,
  Comment,
  Credentials,
  Invite,
  InviteInfo,
  Workspace,
  ItemFormValue,
  OAuthAccountsResponse,
  OAuthAvailability,
  OAuthProvider,
  OffersResult,
  PriceHistory,
  RegisterData,
  SharedWishlistView,
  TrashItem,
  User,
  Wishlist,
  WishlistContent,
  WishlistEvent,
  WishlistWithStats,
  WishItem,
  WishKind,
} from '../types';



const rawBaseQuery = fetchBaseQuery({
  baseUrl: '/api',
  prepareHeaders: (headers) => {
    const token = tokenStorage.get();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});


interface RefreshResponse {
  token?: string;
}

let refreshPromise: Promise<boolean> | null = null;

async function requestNewTokens(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!response.ok) return false;

    const data = (await response.json()) as RefreshResponse;
    if (!data.token) return false;

    tokenStorage.set(data.token);
    return true;
  } catch {
    return false;
  }
}

function refreshTokens(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = requestNewTokens().then(
      (ok) => {
        refreshPromise = null;
        return ok;
      },
      () => {
        refreshPromise = null;
        return false;
      },
    );
  }
  return refreshPromise;
}

let refreshBlockedUntil = 0;

async function tryRefreshTokens(): Promise<boolean> {
  if (Date.now() < refreshBlockedUntil) return false;
  const refreshed = await refreshTokens();
  if (!refreshed) refreshBlockedUntil = Date.now() + 10_000;
  return refreshed;
}

function requestUrl(args: string | FetchArgs): string {
  return typeof args === 'string' ? args : args.url;
}

function isQueueableRequest(args: string | FetchArgs): boolean {
  if (typeof args === 'string') return false;
  const method = (args.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return false;
  const url = args.url;
  return !url.startsWith('/auth/') && !url.startsWith('/uploads');
}

function isAuthEndpoint(args: string | FetchArgs): boolean {
  const url = requestUrl(args);
  return url.startsWith('/auth/login') ||
    url.startsWith('/auth/register') ||
    url.startsWith('/auth/refresh') ||
    url.startsWith('/auth/logout');
}


const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401 && !isAuthEndpoint(args)) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  if (result.error?.status === 401) tokenStorage.clear();

  if (result.error && isNetworkFailure(result.error.status) && isQueueableRequest(args)) {
    const request = args as FetchArgs;
    const body = request.body;
    await enqueueRequest({
      url: requestUrl(request),
      method: (request.method ?? 'POST').toUpperCase(),
      body: typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined,
    });
  }

  return result;
};

type ItemPatch = Partial<ItemFormValue>;

function applyItemPatch(item: WishItem, patch: ItemPatch): WishItem {
  return {
    ...item,
    ...(patch.title !== undefined ? { title: patch.title } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.link !== undefined ? { link: patch.link } : {}),
    ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
    ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
    ...(patch.price !== undefined ? { price: patch.price } : {}),
    ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
    ...(patch.priority !== undefined ? { priority: patch.priority } : {}),
    ...(patch.kind !== undefined ? { kind: patch.kind } : {}),
    ...(patch.status !== undefined ? { status: patch.status } : {}),
    updatedAt: new Date().toISOString(),
  };
}

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Wishlists', 'Wishlist', 'Invites', 'Me', 'Workspaces'],
  keepUnusedDataFor: 300,
  refetchOnMountOrArgChange: 60,
  refetchOnFocus: false,
  refetchOnReconnect: true,
  endpoints: (build) => ({

    register: build.mutation<AuthResponse, RegisterData>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    login: build.mutation<AuthResponse, Credentials>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST', body: {} }),
    }),
    getMe: build.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
    }),
    setPassword: build.mutation<
      AuthResponse,
      { currentPassword?: string; newPassword: string }
    >({
      query: (body) => ({ url: '/auth/password', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),

    getOAuthProviders: build.query<OAuthAvailability, void>({
      query: () => '/auth/oauth/providers',
    }),
    getOAuthAccounts: build.query<OAuthAccountsResponse, void>({
      query: () => '/auth/oauth/accounts',
      providesTags: ['Me'],
    }),
    getAuthEvents: build.query<AuthEventsResponse, void>({
      query: () => '/auth/security/events',
      providesTags: ['Me'],
    }),
    linkOAuthStart: build.mutation<{ url: string }, OAuthProvider>({
      query: (provider) => ({ url: `/auth/oauth/${provider}/link`, method: 'POST' }),
    }),
    unlinkOAuth: build.mutation<void, OAuthProvider>({
      query: (provider) => ({ url: `/auth/oauth/${provider}`, method: 'DELETE' }),
      invalidatesTags: ['Me'],
    }),
    exchangeOAuth: build.mutation<AuthResponse, { code: string }>({
      query: (body) => ({ url: '/auth/oauth/exchange', method: 'POST', body }),
    }),
    telegramLogin: build.mutation<AuthResponse, Record<string, string>>({
      query: (body) => ({ url: '/auth/oauth/telegram', method: 'POST', body }),
    }),
    telegramLink: build.mutation<{ ok: boolean; user: User }, Record<string, string>>({
      query: (body) => ({ url: '/auth/oauth/telegram/link', method: 'POST', body }),
      invalidatesTags: ['Me'],
    }),


    getWishlists: build.query<WishlistWithStats[], void>({
      query: () => '/wishlists',
      providesTags: ['Wishlists'],
    }),
    createWishlist: build.mutation<
      Wishlist,
      { name: string; description?: string; workspaceId?: string | null }
    >({
      query: (body) => ({ url: '/wishlists', method: 'POST', body }),
      invalidatesTags: ['Wishlists'],
    }),
    deleteWishlist: build.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/wishlists/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Wishlists'],
    }),
    updateWishlist: build.mutation<
      Wishlist,
      {
        id: string;
        patch: Partial<
          Pick<Wishlist, 'name' | 'description' | 'isShared' | 'deadline' | 'surpriseMode' | 'workspaceId'>
        >;
      }
    >({
      query: ({ id, patch }) => ({ url: `/wishlists/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Wishlist', id }, 'Wishlists'],
    }),
    getWishlistContent: build.query<WishlistContent, string>({
      query: (id) => `/wishlists/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Wishlist', id }],
    }),


    addItem: build.mutation<WishItem, { wishlistId: string; value: ItemFormValue }>({
      query: ({ wishlistId, value }) => ({
        url: `/wishlists/${wishlistId}/items`,
        method: 'POST',
        body: value,
      }),
      async onQueryStarted({ wishlistId, value }, { dispatch, queryFulfilled }) {
        const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const now = new Date().toISOString();
        const optimistic: WishItem = {
          id: optimisticId,
          wishlistId,
          authorId: '',
          authorName: '',
          authorColor: '#8f8478',
          categoryId: value.categoryId,
          title: value.title,
          description: value.description ?? '',
          link: value.link ?? '',
          imageUrl: value.imageUrl ?? '',
          price: value.price,
          currency: value.currency,
          priority: value.priority,
          kind: value.kind,
          status: value.status,
          reservedBy: null,
          reservedByName: null,
          reservedByColor: null,
          reservedUntil: null,
          createdAt: now,
          updatedAt: now,
        };

        const patch = dispatch(
          baseApi.util.updateQueryData('getWishlistContent', wishlistId, (draft) => {
            draft.items = [optimistic, ...draft.items];
          }),
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            baseApi.util.updateQueryData('getWishlistContent', wishlistId, (draft) => {
              const index = draft.items.findIndex((item) => item.id === optimisticId);
              if (index >= 0) draft.items[index] = data;
            }),
          );
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_result, _error, { wishlistId }) => [{ type: 'Wishlist', id: wishlistId }],
    }),
    updateItem: build.mutation<
      WishItem,
      { itemId: string; wishlistId?: string; value: ItemFormValue }
    >({
      query: ({ itemId, value }) => ({ url: `/items/${itemId}`, method: 'PATCH', body: value }),
      async onQueryStarted({ itemId, wishlistId, value }, { dispatch, queryFulfilled }) {
        const patch = wishlistId
          ? dispatch(
              baseApi.util.updateQueryData('getWishlistContent', wishlistId, (draft) => {
                const item = draft.items.find((entry) => entry.id === itemId);
                if (item) Object.assign(item, applyItemPatch(item, value));
              }),
            )
          : null;
        try {
          const { data } = await queryFulfilled;
          if (wishlistId) {
            dispatch(
              baseApi.util.updateQueryData('getWishlistContent', wishlistId, (draft) => {
                const index = draft.items.findIndex((entry) => entry.id === itemId);
                if (index >= 0) draft.items[index] = data;
              }),
            );
          }
        } catch {
          patch?.undo();
        }
      },
      invalidatesTags: ['Wishlist'],
    }),

    patchItem: build.mutation<
      WishItem,
      { itemId: string; wishlistId?: string; patch: Partial<ItemFormValue> }
    >({
      query: ({ itemId, patch }) => ({ url: `/items/${itemId}`, method: 'PATCH', body: patch }),
      async onQueryStarted({ itemId, wishlistId, patch }, { dispatch, queryFulfilled }) {
        const undo = wishlistId
          ? dispatch(
              baseApi.util.updateQueryData('getWishlistContent', wishlistId, (draft) => {
                const item = draft.items.find((entry) => entry.id === itemId);
                if (item) Object.assign(item, applyItemPatch(item, patch));
              }),
            )
          : null;
        try {
          const { data } = await queryFulfilled;
          if (wishlistId) {
            dispatch(
              baseApi.util.updateQueryData('getWishlistContent', wishlistId, (draft) => {
                const index = draft.items.findIndex((entry) => entry.id === itemId);
                if (index >= 0) draft.items[index] = data;
              }),
            );
          }
        } catch {
          undo?.undo();
        }
      },
      invalidatesTags: ['Wishlist'],
    }),
    deleteItem: build.mutation<{ ok: boolean }, { itemId: string; wishlistId: string }>({
      query: ({ itemId }) => ({ url: `/items/${itemId}`, method: 'DELETE' }),
      async onQueryStarted({ itemId, wishlistId }, { dispatch, queryFulfilled }) {
        const patch = dispatch(
          baseApi.util.updateQueryData('getWishlistContent', wishlistId, (draft) => {
            draft.items = draft.items.filter((item) => item.id !== itemId);
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patch.undo();
        }
      },
      invalidatesTags: (_result, _error, { wishlistId }) => [{ type: 'Wishlist', id: wishlistId }],
    }),

    getTrash: build.query<TrashItem[], string>({
      query: (wishlistId) => `/wishlists/${wishlistId}/trash`,
      providesTags: (_result, _error, wishlistId) => [{ type: 'Wishlist', id: wishlistId }],
    }),
    restoreItem: build.mutation<WishItem, { wishlistId: string; itemId: string }>({
      query: ({ wishlistId, itemId }) => ({
        url: `/wishlists/${wishlistId}/trash/${itemId}/restore`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, { wishlistId }) => [{ type: 'Wishlist', id: wishlistId }],
    }),
    purgeItem: build.mutation<{ ok: boolean }, { wishlistId: string; itemId: string }>({
      query: ({ wishlistId, itemId }) => ({
        url: `/wishlists/${wishlistId}/trash/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { wishlistId }) => [{ type: 'Wishlist', id: wishlistId }],
    }),
    getWishlistHistory: build.query<WishlistEvent[], { wishlistId: string; limit?: number }>({
      query: ({ wishlistId, limit = 50 }) => `/wishlists/${wishlistId}/history?limit=${limit}`,
      providesTags: (_result, _error, { wishlistId }) => [{ type: 'Wishlist', id: wishlistId }],
    }),


    addCategory: build.mutation<Category, { name: string; color: string }>({
      query: (body) => ({ url: '/categories', method: 'POST', body }),
      invalidatesTags: ['Wishlist'],
    }),
    deleteCategory: build.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Wishlist'],
    }),


    sendInvite: build.mutation<Invite, { wishlistId: string; username: string }>({
      query: ({ wishlistId, username }) => ({
        url: `/wishlists/${wishlistId}/invites`,
        method: 'POST',
        body: { username },
      }),
    }),
    getInvites: build.query<Invite[], void>({
      query: () => '/invites',
      providesTags: ['Invites'],
    }),
    respondToInvite: build.mutation<Invite, { inviteId: string; accept: boolean }>({
      query: ({ inviteId, accept }) => ({
        url: `/invites/${inviteId}/respond`,
        method: 'POST',
        body: { accept },
      }),
      invalidatesTags: ['Invites', 'Wishlists'],
    }),

    getInviteInfo: build.query<InviteInfo, string>({
      query: (code) => `/invites/${code}`,
    }),

    joinByInvite: build.mutation<{ wishlistId: string }, string>({
      query: (code) => ({ url: '/invites/join', method: 'POST', body: { code } }),
      invalidatesTags: ['Wishlists'],
    }),
    removeMember: build.mutation<{ ok: boolean }, { wishlistId: string; userId: string }>({
      query: ({ wishlistId, userId }) => ({
        url: `/wishlists/${wishlistId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { wishlistId }) => [{ type: 'Wishlist', id: wishlistId }],
    }),
    setMemberRole: build.mutation<
      { ok: boolean },
      { wishlistId: string; userId: string; role: 'editor' | 'viewer' }
    >({
      query: ({ wishlistId, userId, role }) => ({
        url: `/wishlists/${wishlistId}/members/${userId}`,
        method: 'PATCH',
        body: { role },
      }),
      invalidatesTags: (_result, _error, { wishlistId }) => [{ type: 'Wishlist', id: wishlistId }],
    }),


    searchOffers: build.mutation<OffersResult, { query: string; kind: WishKind }>({
      query: (body) => ({ url: '/offers/search', method: 'POST', body }),
    }),

    getPriceHistory: build.query<PriceHistory, { query: string; kind: WishKind }>({
      query: ({ query, kind }) => ({
        url: `/offers/history?query=${encodeURIComponent(query)}&kind=${kind}`,
      }),
    }),

    getBestPrice: build.query<BestPrice | null, { query: string; kind: WishKind }>({
      query: ({ query, kind }) => ({
        url: `/offers/best-price?query=${encodeURIComponent(query)}&kind=${kind}`,
      }),
    }),

    getBestImage: build.query<BestImage | null, { query: string; kind: WishKind }>({
      query: ({ query, kind }) => ({
        url: `/offers/best-image?query=${encodeURIComponent(query)}&kind=${kind}`,
      }),
    }),
    reorderItems: build.mutation<{ ok: boolean }, { wishlistId: string; order: string[] }>({
      query: ({ wishlistId, order }) => ({
        url: `/wishlists/${wishlistId}/items/reorder`,
        method: 'PUT',
        body: { order },
      }),
      invalidatesTags: (_result, _error, { wishlistId }) => [{ type: 'Wishlist', id: wishlistId }],
    }),


    getWorkspaces: build.query<Workspace[], void>({
      query: () => '/workspaces',
      providesTags: ['Workspaces'],
    }),
    createWorkspace: build.mutation<Workspace, { name: string; color: string }>({
      query: (body) => ({ url: '/workspaces', method: 'POST', body }),
      invalidatesTags: ['Workspaces'],
    }),
    updateWorkspace: build.mutation<
      Workspace,
      { id: string; patch: { name?: string; color?: string } }
    >({
      query: ({ id, patch }) => ({ url: `/workspaces/${id}`, method: 'PATCH', body: patch }),
      invalidatesTags: ['Workspaces'],
    }),
    deleteWorkspace: build.mutation<{ ok: boolean }, string>({
      query: (id) => ({ url: `/workspaces/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Workspaces'],
    }),


    getVapidPublicKey: build.query<{ publicKey: string }, void>({
      query: () => '/push/vapid-public-key',
    }),
    subscribePush: build.mutation<{ ok: boolean }, { endpoint: string; keys: { p256dh: string; auth: string } }>({
      query: (body) => ({ url: '/push/subscribe', method: 'POST', body }),
    }),
    unsubscribePush: build.mutation<{ ok: boolean }, { endpoint: string }>({
      query: (body) => ({ url: '/push/unsubscribe', method: 'POST', body }),
    }),


    updateMe: build.mutation<
      User,
      {
        displayName?: string;
        username?: string;
        email?: string;
        avatarColor?: string;
        avatarImage?: string | null;
      }
    >({
      query: (body) => ({ url: '/auth/me', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
    }),
    deleteMe: build.mutation<void, { password?: string; confirm?: string }>({
      query: (body) => ({ url: '/auth/me', method: 'DELETE', body }),
    }),


    resolveLink: build.query<
      { title: string; imageUrl: string | null; price: number | null; currency: string | null } | null,
      string
    >({
      query: (url) => ({ url: `/resolve-link?url=${encodeURIComponent(url)}` }),
    }),


    getComments: build.query<Comment[], string>({
      query: (itemId) => `/items/${itemId}/comments`,
      providesTags: ['Wishlist'],
    }),
    addComment: build.mutation<
      Comment,
      { itemId: string; text: string; hideFromAuthor: boolean }
    >({
      query: ({ itemId, ...body }) => ({
        url: `/items/${itemId}/comments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wishlist'],
    }),


    getSharedWishlist: build.query<SharedWishlistView, string>({
      query: (slug) => `/public/wishlists/${slug}`,
    }),


    uploadImage: build.mutation<{ url: string }, File>({
      query: (file) => {
        const body = new FormData();
        body.append('image', file);
        return { url: '/uploads', method: 'POST', body };
      },
    }),
  }),
});


export const resetApi = baseApi.util.resetApiState;


export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetMeQuery,
  useGetOAuthProvidersQuery,
  useGetOAuthAccountsQuery,
  useGetAuthEventsQuery,
  useLinkOAuthStartMutation,
  useUnlinkOAuthMutation,
  useExchangeOAuthMutation,
  useTelegramLoginMutation,
  useTelegramLinkMutation,
  useGetWishlistsQuery,
  useCreateWishlistMutation,
  useDeleteWishlistMutation,
  useUpdateWishlistMutation,
  useGetWishlistContentQuery,
  useAddItemMutation,
  useUpdateItemMutation,
  usePatchItemMutation,
  useDeleteItemMutation,
  useGetTrashQuery,
  useRestoreItemMutation,
  usePurgeItemMutation,
  useGetWishlistHistoryQuery,
  useAddCategoryMutation,
  useDeleteCategoryMutation,
  useSendInviteMutation,
  useGetInvitesQuery,
  useRespondToInviteMutation,
  useGetInviteInfoQuery,
  useJoinByInviteMutation,
  useRemoveMemberMutation,
  useSetMemberRoleMutation,
  useSearchOffersMutation,
  useGetBestPriceQuery,
  useGetBestImageQuery,
  useGetPriceHistoryQuery,
  useUpdateMeMutation,
  useDeleteMeMutation,
  useSetPasswordMutation,
  useGetCommentsQuery,
  useResolveLinkQuery,
  useGetWorkspacesQuery,
  useCreateWorkspaceMutation,
  useUpdateWorkspaceMutation,
  useDeleteWorkspaceMutation,
  useSubscribePushMutation,
  useUnsubscribePushMutation,
  useGetVapidPublicKeyQuery,
  useAddCommentMutation,
  useReorderItemsMutation,
  useGetSharedWishlistQuery,
  useUploadImageMutation,
} = baseApi;
