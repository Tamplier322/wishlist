import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { tokenStorage } from './client';
import type {
  BestImage,
  BestPrice,
  Category,
  Comment,
  Credentials,
  Invite,
  InviteInfo,
  Workspace,
  ItemFormValue,
  OffersResult,
  RegisterData,
  SharedWishlistView,
  User,
  Wishlist,
  WishlistContent,
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


const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error?.status === 401) tokenStorage.clear();
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: ['Wishlists', 'Wishlist', 'Invites', 'Me', 'Workspaces'],
  endpoints: (build) => ({

    register: build.mutation<{ token: string; user: User }, RegisterData>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    login: build.mutation<{ token: string; user: User }, Credentials>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    getMe: build.query<User, void>({
      query: () => '/auth/me',
      providesTags: ['Me'],
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
          Pick<Wishlist, 'name' | 'description' | 'isShared' | 'deadline' | 'workspaceId'>
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
      invalidatesTags: (_result, _error, { wishlistId }) => [{ type: 'Wishlist', id: wishlistId }],
    }),
    updateItem: build.mutation<WishItem, { itemId: string; value: ItemFormValue }>({
      query: ({ itemId, value }) => ({ url: `/items/${itemId}`, method: 'PATCH', body: value }),
      invalidatesTags: ['Wishlist'],
    }),

    patchItem: build.mutation<WishItem, { itemId: string; patch: Partial<ItemFormValue> }>({
      query: ({ itemId, patch }) => ({ url: `/items/${itemId}`, method: 'PATCH', body: patch }),
      invalidatesTags: ['Wishlist'],
    }),
    deleteItem: build.mutation<{ ok: boolean }, { itemId: string; wishlistId: string }>({
      query: ({ itemId }) => ({ url: `/items/${itemId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { wishlistId }) => [{ type: 'Wishlist', id: wishlistId }],
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


    searchOffers: build.mutation<OffersResult, { query: string; kind: WishKind }>({
      query: (body) => ({ url: '/offers/search', method: 'POST', body }),
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


    updateMe: build.mutation<User, { avatarColor?: string; avatarImage?: string | null }>({
      query: (body) => ({ url: '/auth/me', method: 'PATCH', body }),
      invalidatesTags: ['Me'],
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
  useGetMeQuery,
  useGetWishlistsQuery,
  useCreateWishlistMutation,
  useDeleteWishlistMutation,
  useUpdateWishlistMutation,
  useGetWishlistContentQuery,
  useAddItemMutation,
  useUpdateItemMutation,
  usePatchItemMutation,
  useDeleteItemMutation,
  useAddCategoryMutation,
  useDeleteCategoryMutation,
  useSendInviteMutation,
  useGetInvitesQuery,
  useRespondToInviteMutation,
  useGetInviteInfoQuery,
  useJoinByInviteMutation,
  useRemoveMemberMutation,
  useSearchOffersMutation,
  useGetBestPriceQuery,
  useGetBestImageQuery,
  useUpdateMeMutation,
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
