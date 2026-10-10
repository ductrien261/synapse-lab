export function safePresentationUrl(value: string | null | undefined): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? url : null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(value: string | null | undefined): string | null {
  const url = safePresentationUrl(value);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  let videoId: string | null = null;
  if (host === 'youtu.be' || host === 'www.youtu.be') {
    videoId = url.pathname.split('/')[1] || null;
  } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(host)) {
    const [, section, id] = url.pathname.split('/');
    videoId = section === 'watch' ? url.searchParams.get('v') : ['shorts', 'live', 'embed'].includes(section) ? id : null;
  }
  return videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : null;
}
