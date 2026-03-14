// #5: Server component wrapper for SEO — metadata is in layout.tsx
// Client-side logic (payment, SDK, interactivity) lives in PricingContent.tsx

import PricingContentWrapper from "./PricingContent";

export default function PricingPage() {
  return <PricingContentWrapper />;
}
