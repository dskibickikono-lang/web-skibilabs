import type { APIRoute } from 'astro';
import { isPublishBuild, siteOrigin } from '../config/company.ts';

/** Dopóki dane firmy nie są potwierdzone, cała witryna jest wyłączona z indeksowania. */
export const GET: APIRoute = () => {
  const body = isPublishBuild(process.env)
    ? `User-agent: *\nAllow: /\n\nSitemap: ${siteOrigin}/sitemap.xml\n`
    : `# Wersja robocza: dane firmy czekają na potwierdzenie właściciela.\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
