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
import { env } from '../config/env';
import { upload } from '../config/uploads';
import { uploadImageHandler } from '../controllers/upload.controller';
import { badRequest } from '../utils/errors';
import { createRateLimiter } from '../middlewares/rate-limit.middleware';
import {
  getCurrentUser,
  loginUser,
  registerUser,
  updateMeHandler,
} from '../controllers/auth.controller';
import { suggestHandler } from '../controllers/search.controller';
import { resolveLinkHandler } from '../controllers/resolve.controller';
import {
  createWishlistHandler,
  deleteWishlistHandler,
  getSharedWishlistHandler,
  getWishlistHandler,
  listWishlistsHandler,
  removeMemberHandler,
  updateWishlistHandler,
} from '../controllers/wishlist.controller';
import {
  createItemHandler,
  deleteItemHandler,
  listItemsHandler,
  updateItemHandler,
} from '../controllers/item.controller';
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
import { bestImageHandler, bestPriceHandler, searchOffersHandler } from '../controllers/offers.controller';
import { reorderItemsHandler } from '../controllers/item.controller';


const offersLimiter = createRateLimiter(20, 60_000);

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


router.post('/auth/register', registerUser);
router.post('/auth/login', loginUser);
router.get('/auth/me', requireAuth, getCurrentUser);
router.patch('/auth/me', requireAuth, updateMeHandler);


router.get('/wishlists', requireAuth, listWishlistsHandler);
router.post('/wishlists', requireAuth, createWishlistHandler);
router.get('/wishlists/:id', requireAuth, getWishlistHandler);
router.patch('/wishlists/:id', requireAuth, updateWishlistHandler);
router.delete('/wishlists/:id', requireAuth, deleteWishlistHandler);


router.post('/wishlists/:id/invites', requireAuth, sendInviteHandler);
router.delete('/wishlists/:id/members/:userId', requireAuth, removeMemberHandler);
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
router.post('/offers/search', offersLimiter, searchOffersHandler);
router.get('/offers/best-price', offersLimiter, bestPriceHandler);
router.get('/offers/best-image', offersLimiter, bestImageHandler);


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
