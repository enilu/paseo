import startEntry from "@tanstack/react-start/server-entry";
import { handleAgentShareApi } from "~/agent-share-api";
import { getAndroidVersionCode } from "~/android-version";
import { getCanonicalRedirect } from "~/canonical-url";
import { getDoc } from "~/docs";
import { getLatestAndroidVersion } from "~/latest-release";
import { buildLlmsTxt } from "~/llms";

interface WebsiteEnv {
  WEBSITE_CACHE?: KVNamespace;
}

function markdownResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}

function plainTextResponse(body: string): Response {
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=300",
    },
  });
}

function docSlugFromMarkdownPath(pathname: string): string | null {
  if (pathname === "/docs.md") return "";
  const match = pathname.match(/^\/docs\/(.+)\.md$/);
  return match ? match[1] : null;
}

export default {
  async fetch(request: Request, env: WebsiteEnv, context: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/shares" || url.pathname.startsWith("/api/shares/")) {
      return handleAgentShareApi(request, env.WEBSITE_CACHE ?? null);
    }

    const environment = import.meta.env.DEV ? "development" : "production";
    const canonicalRedirect = getCanonicalRedirect(url, environment);
    if (canonicalRedirect) {
      return Response.redirect(canonicalRedirect, 301);
    }

    if (url.pathname === "/cloud" || url.pathname === "/cloud/") {
      url.pathname = "/hub";
      return Response.redirect(url.toString(), 301);
    }

    const altRedirectMatch = url.pathname.match(/^\/docs\/alternatives\/(.+?)\/?$/);
    if (altRedirectMatch) {
      url.pathname = `/alternatives/${altRedirectMatch[1]}`;
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname === "/llms.txt") {
      return markdownResponse(buildLlmsTxt());
    }

    if (url.pathname === "/android-version.txt") {
      const version = await getLatestAndroidVersion({
        cache: env.WEBSITE_CACHE ?? null,
        waitUntil: (promise) => context.waitUntil(promise),
      });
      return plainTextResponse(`${getAndroidVersionCode(version)}\n`);
    }

    const slug = docSlugFromMarkdownPath(url.pathname);
    if (slug !== null) {
      const doc = getDoc(slug);
      if (!doc) return new Response("Not found", { status: 404 });
      return markdownResponse(doc.content);
    }

    const response = await startEntry.fetch(request);
    if (url.pathname.startsWith("/share/")) {
      const secured = new Response(response.body, response);
      secured.headers.set(
        "content-security-policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'",
      );
      secured.headers.set("referrer-policy", "no-referrer");
      secured.headers.set("x-robots-tag", "noindex, nofollow");
      return secured;
    }
    return response;
  },
};
