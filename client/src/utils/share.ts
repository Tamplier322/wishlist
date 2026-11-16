export type ShareResult = 'shared' | 'copied' | 'failed';

export interface ShareOptions {
  title: string;
  text?: string;
  url: string;
}

function legacyCopy(value: string): boolean {
  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}

export async function shareLink(options: ShareOptions): Promise<ShareResult> {
  const nav = navigator as Navigator & {
    share?: (data: { title?: string; text?: string; url?: string }) => Promise<void>;
  };

  if (typeof nav.share === 'function') {
    try {
      await nav.share({ title: options.title, text: options.text, url: options.url });
      return 'shared';
    } catch (error) {
      if ((error as DOMException | undefined)?.name === 'AbortError') return 'shared';
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(options.url);
      return 'copied';
    }
    return legacyCopy(options.url) ? 'copied' : 'failed';
  } catch {
    return legacyCopy(options.url) ? 'copied' : 'failed';
  }
}
