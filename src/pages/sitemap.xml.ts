// The pages search engines should find.
import type { APIRoute } from 'astro';
import { placesLive, projects, sideProjects } from '../data/site';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://johnetokhana.com');
  const paths = [
    '/',
    '/notes-ai/',
    '/writing/',
    '/play/music/',
    ...(placesLive ? ['/play/places/'] : []),
    ...projects.map((p) => `/work/${p.slug}/`),
    ...sideProjects.map((p) => `/work/${p.slug}/`),
  ];
  const urls = paths.map((p) => `  <url><loc>${new URL(p, base).href}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
};
