// The dotted world map for Window seat, built once and served as a static file.
import type { APIRoute } from 'astro';
import { dotsSvg } from '../../lib/worldmap';

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(dotsSvg(), { headers: { 'content-type': 'image/svg+xml; charset=utf-8' } });
