import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/marketing';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/dashboard', '/settings', '/profile', '/learning-profile', '/login', '/register'],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
