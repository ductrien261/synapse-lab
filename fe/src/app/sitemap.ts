import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/marketing';

const PAGES = ['', '/platform', '/domains', '/ai', '/sources', '/about', '/anatomy', '/algorithms'];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((path) => ({
    url: `${SITE.url}${path || '/'}`,
    changeFrequency: path === '' ? 'weekly' : 'monthly',
    priority: path === '' ? 1 : 0.7,
  }));
}
