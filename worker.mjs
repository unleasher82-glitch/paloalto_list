const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; frame-ancestors 'self' https://alizerotrust.com; object-src 'none'; base-uri 'self'; form-action 'self'",
};

const LLMS_TXT = `# Palo Alto Address Group Builder (AliZeroTrust)

> Free browser-based tool that generates Palo Alto PAN-OS set-format CLI to bulk-create address objects and a static address group from a list of IPs and CIDRs. Processing runs locally in the browser.

## Tool
- [Palo Alto Address Group & Object Builder](https://paloalto.alizerotrust.com/): Bulk input, duplicate removal, custom names, tags and descriptions, CLI output.

## Related
- [AliZeroTrust tools](https://alizerotrust.com/): Network and firewall engineering tools.
- [IP & CIDR Toolkit](https://alizerotrust.com/tools/ip-cidr/): Subnet calculation, IP range to CIDR conversion, exact CIDR aggregation.
`;

const MOBILE_TARGETS_CSS = `
/* Minimum interactive target size below 600px. */
@media (max-width: 599.98px) {
  body a,
  body button,
  body input,
  body select,
  body textarea {
    box-sizing: border-box;
    min-height: 44px;
    min-width: 44px;
  }
  body a {
    display: inline-flex;
    align-items: center;
    padding-top: 10px;
    padding-bottom: 10px;
  }
  body button,
  body input:not([type="checkbox"]):not([type="radio"]),
  body select {
    padding-top: 10px;
    padding-bottom: 10px;
  }
  body input[type="checkbox"],
  body input[type="radio"] {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
  }
}
`;

function withHeaders(response) {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
  // CSP frame-ancestors controls framing, including the AliZeroTrust parent site.
  headers.delete("X-Frame-Options");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function applyAccessibilityFixes(html) {
  // Add an accessible name only to the existing virtual-system name input.
  html = html.replace(
    /<input\b[^>]*\bid="vsysName"[^>]*>/,
    (input) => input.includes("aria-label=")
      ? input
      : input.replace("<input", '<input aria-label="Virtual system name"')
  );
  // Use the existing inline style element; no tool JavaScript is changed.
  return html.replace("</style>", MOBILE_TARGETS_CSS + "</style>");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/llms.txt") {
      return withHeaders(new Response(LLMS_TXT, {
        status: 200,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      }));
    }

    // Delegate all existing page, redirect, robots, sitemap and 404 routing
    // to the unchanged static asset service.
    const response = await env.ASSETS.fetch(request);

    if (
      request.method === "GET" &&
      response.status === 200 &&
      (url.pathname === "/" || url.pathname === "/index.html") &&
      (response.headers.get("Content-Type") || "").includes("text/html")
    ) {
      const html = applyAccessibilityFixes(await response.text());
      const headers = new Headers(response.headers);
      // The representation changed; asset length and validators no longer apply.
      headers.delete("Content-Length");
      headers.delete("Content-Encoding");
      headers.delete("ETag");
      headers.delete("Last-Modified");
      return withHeaders(new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers,
      }));
    }

    return withHeaders(response);
  },
};
