export interface ResponsiveImage {
  src: string;
  srcSet: string | undefined;
}

function proxyUrl(url: string, width: number): string {
  return `/image-proxy?url=${encodeURIComponent(url)}&w=${width}&format=webp`;
}

export function buildResponsiveImage(
  url: string | null | undefined,
  widths: readonly number[] = [320, 640, 960],
  fallbackWidth: number = 640,
): ResponsiveImage {
  if (!url) return { src: '', srcSet: undefined };
  if (!/^https:\/\//i.test(url)) return { src: url, srcSet: undefined };

  return {
    src: proxyUrl(url, fallbackWidth),
    srcSet: widths.map((width) => `${proxyUrl(url, width)} ${width}w`).join(', '),
  };
}
