import { ROBOTS } from "../lib/sitemap.ts";

export const GET = () => new Response(ROBOTS, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
