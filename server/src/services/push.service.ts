import * as webpushNamespace from 'web-push';
import {
  deleteSubscription,
  findSubscriptionsByUsers,
  upsertSubscription,
} from '../repositories/push.repository';
import { env } from '../config/env';


type WebPushModule = typeof webpushNamespace & { default?: typeof webpushNamespace };
const webpush = ((webpushNamespace as WebPushModule).default ??
  (webpushNamespace as unknown as WebPushModule)) as WebPushModule;

export async function subscribe(
  userId: string,
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
): Promise<void> {
  await upsertSubscription({
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  });
}

export async function unsubscribe(endpoint: string): Promise<void> {
  await deleteSubscription(endpoint);
}

export function getVapidPublicKey(): string {
  return env.vapidPublicKey;
}


export async function sendPushToUsers(
  userIds: readonly string[],
  payload: { title: string; body: string },
  excludeUserId?: string,
): Promise<void> {
  const subscriptions = (await findSubscriptionsByUsers(userIds)).filter(
    (subscription) => subscription.user_id !== excludeUserId,
  );

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          JSON.stringify(payload),
        );
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;

        if (status === 410 || status === 404) {
          await deleteSubscription(subscription.endpoint);
        }
      }
    }),
  );
}
