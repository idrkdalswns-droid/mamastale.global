"use client";

import { useState, useEffect } from "react";

interface UserReview {
  id: string;
  author_alias: string;
  child_info: string | null;
  stars: number;
  content: string;
  created_at: string;
}

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="text-lg transition-transform active:scale-110"
          style={{ color: n <= value ? "#E07A5F" : "#D0C8C0" }}
        >
          {n <= value ? "\u2605" : "\u2606"}
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ count }: { count: number }) {
  return (
    <span className="text-sm tracking-wider" style={{ color: "#E07A5F" }}>
      {"\u2605".repeat(count)}{"\u2606".repeat(5 - count)}
    </span>
  );
}

export function ReviewSection() {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [alias, setAlias] = useState("");
  const [childInfo, setChildInfo] = useState("");
  const [stars, setStars] = useState(5);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingReviews, setFetchingReviews] = useState(true);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetch("/api/reviews")
      .then((res) => res.json())
      .then((data) => setReviews(data.reviews || []))
      .catch(() => {})
      .finally(() => setFetchingReviews(false));
  }, []);

  const handleSubmit = async () => {
    if (!content.trim() || !alias.trim() || loading) return;
    setLoading(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorAlias: alias.trim(),
          childInfo: childInfo.trim() || undefined,
          stars,
          content: content.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error || "후기 등록에 실패했습니다.");
        return;
      }

      if (data.review) {
        setReviews((prev) => [data.review, ...prev]);
        setAlias("");
        setChildInfo("");
        setStars(5);
        setContent("");
        setShowForm(false);
        setSubmitted(true);
      }
    } catch {
      setSubmitError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "방금 전";
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}일 전`;
    return new Date(dateStr).toLocaleDateString("ko-KR");
  };

  return (
    <div className="mt-8">
      {/* Divider */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-px bg-brown-pale/20" />
        <span className="text-xs text-brown-pale font-light">사용자 후기</span>
        <div className="flex-1 h-px bg-brown-pale/20" />
      </div>

      {/* Write button */}
      {!showForm && (
        <button
          onClick={() => { setShowForm(true); setSubmitted(false); }}
          className="w-full py-3 rounded-xl text-sm font-medium mb-5 transition-all active:scale-[0.98]"
          style={{
            background: "rgba(224,122,95,0.08)",
            color: "#E07A5F",
            border: "1px solid rgba(224,122,95,0.15)",
          }}
        >
          후기 작성하기
        </button>
      )}

      {/* Success message */}
      {submitted && !showForm && (
        <div
          className="mb-5 p-3 rounded-xl text-center text-xs"
          style={{ background: "rgba(127,191,176,0.1)", border: "1px solid rgba(127,191,176,0.2)", color: "#3D8B7A" }}
        >
          후기가 등록되었습니다. 감사합니다!
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div
          className="mb-5 rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.6)", border: "1px solid rgba(196,149,106,0.1)" }}
        >
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="별명 (필수)"
              maxLength={20}
              className="flex-1 px-3 py-2.5 rounded-lg text-xs outline-none"
              style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(196,149,106,0.1)", color: "#444" }}
            />
            <input
              type="text"
              value={childInfo}
              onChange={(e) => setChildInfo(e.target.value)}
              placeholder="자녀 정보 (선택)"
              maxLength={30}
              className="flex-1 px-3 py-2.5 rounded-lg text-xs outline-none"
              style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(196,149,106,0.1)", color: "#444" }}
            />
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-brown-pale">별점</span>
            <StarInput value={stars} onChange={setStars} />
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="mamastale 사용 후기를 남겨주세요..."
            maxLength={500}
            rows={4}
            className="w-full px-3 py-2.5 rounded-lg text-xs outline-none resize-none mb-2"
            style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(196,149,106,0.1)", color: "#444" }}
          />

          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] text-brown-pale">{content.length}/500</span>
            {submitError && <span className="text-[10px] text-red-500">{submitError}</span>}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-full text-xs font-medium text-brown-pale"
              style={{ border: "1px solid rgba(196,149,106,0.15)" }}
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !content.trim() || !alias.trim()}
              className="flex-1 py-2.5 rounded-full text-xs font-medium text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #E07A5F, #D4836B)" }}
            >
              {loading ? "등록 중..." : "후기 등록"}
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {fetchingReviews && (
        <p className="text-xs text-brown-pale font-light text-center py-4 animate-pulse">
          후기를 불러오는 중...
        </p>
      )}

      {/* User reviews list */}
      {!fetchingReviews && reviews.length > 0 && (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-brown-pale/10"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-brown">{r.author_alias}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {r.child_info && (
                      <span className="text-[10px] text-brown-pale font-light">{r.child_info}</span>
                    )}
                    <span className="text-[10px] text-brown-pale font-light">{formatTime(r.created_at)}</span>
                  </div>
                </div>
                <StarDisplay count={r.stars} />
              </div>
              <p className="text-[13px] text-brown-light leading-6 font-light break-keep">
                {r.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
