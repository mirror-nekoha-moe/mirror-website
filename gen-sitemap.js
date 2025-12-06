import { mkdirSync, existsSync, createWriteStream } from 'fs';
import { SitemapStream, streamToPromise } from 'sitemap';

if (!existsSync('./public')) {
  mkdirSync('./public', { recursive: true });
}

const sitemap = new SitemapStream({ hostname: 'https://mirror.nekoha.moe' });

// Add your routes here
sitemap.write({ url: '/', changefreq: 'daily', priority: 1.0 });
sitemap.write({ url: '/search', changefreq: 'daily', priority: 1.0 });

sitemap.end();

streamToPromise(sitemap).then(data =>
  createWriteStream('./public/sitemap.xml').end(data)
);