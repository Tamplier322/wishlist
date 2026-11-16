import { Router } from 'express';
import {
  subscribePushHandler,
  unsubscribePushHandler,
  vapidKeyHandler,
} from '../controllers/push.controller';
import {
  createWorkspaceHandler,
  deleteWorkspaceHandler,
  listWorkspacesHandler,
  updateWorkspaceHandler,
} from '../controllers/workspace.controller';
import {
  addCommentHandler,
  listCommentsHandler,
} from '../controllers/comment.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { env, isProduction } from '../config/env';
import { getRow } from '../config/database';
import { COLLECTIONS, firestore } from '../config/firebase';
import { upload } from '../config/uploads';
import { uploadImageHandler } from '../controllers/upload.controller';
import { badRequest } from '../utils/errors';
import { createRateLimiter } from '../middlewares/rate-limit.middleware';
import {
  deleteMeHandler,
  getCurrentUser,
  listAuthEventsHandler,
  loginUser,
  logoutHandler,
  refreshTokenHandler,
  registerUser,
  setPasswordHandler,
  updateMeHandler,
} from '../controllers/auth.controller';
import {
  exchangeOAuthHandler,
  linkOAuthStartHandler,
  oauthAccountsHandler,
  oauthCallbackHandler,
  oauthProvidersHandler,
  startOAuthHandler,
  telegramLinkHandler,
  telegramLoginHandler,
  unlinkOAuthHandler,
} from '../controllers/oauth.controller';
import { suggestHandler } from '../controllers/search.controller';
import { resolveLinkHandler } from '../controllers/resolve.controller';
import {
  createWishlistHandler,
  deleteWishlistHandler,
  getSharedWishlistHandler,
  getWishlistHandler,
  listWishlistsHandler,
  removeMemberHandler,
  setMemberRoleHandler,
  updateWishlistHandler,
  wishlistIcsHandler,
  wishlistQrHandler,
} from '../controllers/wishlist.controller';
import {
  createItemHandler,
  deleteItemHandler,
  listItemsHandler,
  listTrashHandler,
  purgeItemHandler,
  restoreItemHandler,
  updateItemHandler,
} from '../controllers/item.controller';
import { listHistoryHandler } from '../controllers/event.controller';
import {
  createCategoryHandler,
  deleteCategoryHandler,
  listCategoriesHandler,
  updateCategoryHandler,
} from '../controllers/category.controller';
import {
  getInviteInfoHandler,
  joinByInviteHandler,
  listInvitesHandler,
  respondInviteHandler,
  sendInviteHandler,
} from '../controllers/invite.controller';
import {
  bestImageHandler,
  bestPriceHandler,
  priceHistoryHandler,
  searchOffersHandler,
} from '../controllers/offers.controller';
import { reorderItemsHandler } from '../controllers/item.controller';
import { seedTestData } from '../services/test-seed.service';
import { asyncHandler } from '../utils/controller-helpers';


const offersLimiter = createRateLimiter(20, 60_000);
const authLimiter = createRateLimiter(30, 60_000, 'auth');

const router = Router();


router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    database: env.dbDriver,
    commit: (process.env.RENDER_GIT_COMMIT ?? '').slice(0, 7) || null,
    firebase: {
      serviceAccount: env.firebase.serviceAccountJson !== '',
      projectId: env.firebase.projectId !== '',
      clientEmail: env.firebase.clientEmail !== '',
      privateKey: env.firebase.privateKey !== '',
    },
  });
});

if (env.enableTestSeed && !isProduction) {
  router.post(
    '/test/seed',
    asyncHandler(async (_req, res) => {
      const result = await seedTestData();
      res.status(201).json(result);
    }),
  );
}


router.get('/readyz', async (_req, res) => {
  const startedAt = Date.now();
  try {
    if (env.dbDriver === 'firestore') {
      await Promise.race([
        firestore().collection(COLLECTIONS.users).limit(1).get(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000)),
      ]);
    } else {
      await getRow('SELECT 1 AS ok');
    }
    res.json({
      status: 'ready',
      database: env.dbDriver,
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      database: env.dbDriver,
      message: error instanceof Error ? error.message : 'unknown error',
    });
  }
});


router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);
router.post('/auth/refresh', authLimiter, refreshTokenHandler);
router.post('/auth/logout', authLimiter, logoutHandler);
router.get('/auth/me', requireAuth, getCurrentUser);
router.patch('/auth/me', requireAuth, updateMeHandler);
router.delete('/auth/me', requireAuth, authLimiter, deleteMeHandler);
router.post('/auth/password', requireAuth, authLimiter, setPasswordHandler);
router.get('/auth/security/events', requireAuth, listAuthEventsHandler);

router.get('/auth/oauth/providers', oauthProvidersHandler);
router.post('/auth/oauth/exchange', authLimiter, exchangeOAuthHandler);
router.post('/auth/oauth/telegram', authLimiter, telegramLoginHandler);
router.post('/auth/oauth/telegram/link', requireAuth, authLimiter, telegramLinkHandler);
router.get('/auth/oauth/accounts', requireAuth, oauthAccountsHandler);
router.get('/auth/oauth/:provider/start', authLimiter, startOAuthHandler);
router.get('/auth/oauth/:provider/callback', authLimiter, oauthCallbackHandler);
router.post('/auth/oauth/:provider/link', requireAuth, authLimiter, linkOAuthStartHandler);
router.delete('/auth/oauth/:provider', requireAuth, authLimiter, unlinkOAuthHandler);


router.get('/wishlists', requireAuth, listWishlistsHandler);
router.post('/wishlists', requireAuth, createWishlistHandler);
router.get('/wishlists/:id', requireAuth, getWishlistHandler);
router.patch('/wishlists/:id', requireAuth, updateWishlistHandler);
router.delete('/wishlists/:id', requireAuth, deleteWishlistHandler);
router.get('/wishlists/:id/calendar.ics', wishlistIcsHandler);


router.post('/wishlists/:id/invites', requireAuth, sendInviteHandler);
router.delete('/wishlists/:id/members/:userId', requireAuth, removeMemberHandler);
router.patch('/wishlists/:id/members/:userId', requireAuth, setMemberRoleHandler);
router.get('/invites', requireAuth, listInvitesHandler);
router.post('/invites/:id/respond', requireAuth, respondInviteHandler);
router.get('/invites/:code', getInviteInfoHandler);
router.post('/invites/join', requireAuth, joinByInviteHandler);


router.get('/wishlists/:id/items', requireAuth, listItemsHandler);
router.post('/wishlists/:id/items', requireAuth, createItemHandler);
router.patch('/items/:id', requireAuth, updateItemHandler);
router.get('/items/:id/comments', requireAuth, listCommentsHandler);
router.post('/items/:id/comments', requireAuth, addCommentHandler);
router.delete('/items/:id', requireAuth, deleteItemHandler);
router.put('/wishlists/:id/items/reorder', requireAuth, reorderItemsHandler);

router.get('/wishlists/:id/trash', requireAuth, listTrashHandler);
router.post('/wishlists/:id/trash/:itemId/restore', requireAuth, restoreItemHandler);
router.delete('/wishlists/:id/trash/:itemId', requireAuth, purgeItemHandler);

router.get('/wishlists/:id/history', requireAuth, listHistoryHandler);


router.get('/categories', requireAuth, listCategoriesHandler);
router.post('/categories', requireAuth, createCategoryHandler);
router.patch('/categories/:id', requireAuth, updateCategoryHandler);
router.delete('/categories/:id', requireAuth, deleteCategoryHandler);


router.post('/uploads', requireAuth, (req, res, next) => {
  upload.single('image')(req, res, (error) => {
    if (error) {
      next(badRequest(error.message || 'Не удалось загрузить файл'));
      return;
    }
    next();
  });
}, uploadImageHandler);


router.get('/public/wishlists/:slug', getSharedWishlistHandler);
router.get('/public/wishlists/:slug/qr.svg', wishlistQrHandler);
router.post('/offers/search', offersLimiter, searchOffersHandler);
router.get('/offers/best-price', offersLimiter, bestPriceHandler);
router.get('/offers/best-image', offersLimiter, bestImageHandler);
router.get('/offers/history', offersLimiter, priceHistoryHandler);


router.get('/workspaces', requireAuth, listWorkspacesHandler);
router.post('/workspaces', requireAuth, createWorkspaceHandler);
router.patch('/workspaces/:id', requireAuth, updateWorkspaceHandler);
router.delete('/workspaces/:id', requireAuth, deleteWorkspaceHandler);


router.get('/search/suggest', requireAuth, suggestHandler);


router.get('/resolve-link', requireAuth, resolveLinkHandler);


router.get('/push/vapid-public-key', vapidKeyHandler);
router.post('/push/subscribe', requireAuth, subscribePushHandler);
router.post('/push/unsubscribe', requireAuth, unsubscribePushHandler);

export default router;
