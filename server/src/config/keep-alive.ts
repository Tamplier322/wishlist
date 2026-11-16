
export function startKeepAlive(): void {
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (!externalUrl || process.env.NODE_ENV !== 'production') return;

  const PING_INTERVAL_MS = 9 * 60 * 1000;
  setInterval(() => {
    fetch(`${externalUrl}/api/health`).catch(() => undefined);
  }, PING_INTERVAL_MS);

  console.log(`Keep-alive enabled: pinging ${externalUrl}/api/health every 9 min`);
}
