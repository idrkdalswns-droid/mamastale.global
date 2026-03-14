// Required by Cloudflare Pages for all dynamic routes
export const runtime = "edge";

export default function DIYLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
