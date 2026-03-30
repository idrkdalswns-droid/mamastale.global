export default function Loading() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-cream dark:bg-dark-cream">
      <div className="text-center">
        <div className="w-6 h-6 mx-auto mb-3 border-2 border-brown-pale/30 border-t-brown-pale rounded-full animate-spin" />
        <p className="text-sm text-brown-light font-light">불러오는 중...</p>
      </div>
    </div>
  );
}
