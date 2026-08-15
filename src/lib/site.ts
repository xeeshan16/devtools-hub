/**
 * Single source of truth for anything that has to change when the custom
 * domain lands (design doc §7, step 8). `NEXT_PUBLIC_SITE_URL` lets the Vercel
 * preview deployments emit correct canonical URLs without a code change.
 */
export const site = {
  name: "DevTools Hub",
  tagline: "Fast, private developer utilities",
  description:
    "A suite of free developer tools — JSON formatter, Base64 encoder, JWT decoder, regex tester and more. Everything runs in your browser; nothing is uploaded.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://devtools-hub.vercel.app").replace(
    /\/$/,
    "",
  ),
  author: "Zeeshan Imdad",
  contactEmail: "zeeshanimdad1614@gmail.com",
} as const;

export function absoluteUrl(path = "/"): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}
