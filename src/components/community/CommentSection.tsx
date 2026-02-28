"use client";

import { useState, useEffect } from "react";

interface Comment {
  id: string;
  content: string;
  author_alias: string;
  created_at: string;
}

interface CommentSectionProps {
  storyId: string;
}

export function CommentSection({ storyId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [alias, setAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetch(`/api/community/${storyId}/comments`)
      .then((res) => res.json())
      .then((data) => setComments(data.comments || []))
      .catch(() => {});
  }, [storyId]);

  const submitComment = async () => {
    if (!newComment.trim() || loading) return;
    setLoading(true);
    setSubmitError("");
    try {
      const res = await fetch(`/api/community/${storyId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          authorAlias: alias.trim() || undefined,
        }),
      });

      if (res.status === 401) {
        setSubmitError("댓글을 작성하려면 로그인이 필요합니다.");
        return;
      }

      if (!res.ok) {
        setSubmitError("댓글 등록에 실패했습니다.");
        return;
      }

      const data = await res.json();
      if (data.comment) {
        setComments((prev) => [...prev, data.comment]);
        setNewComment("");
        setAlias("");
        setShowForm(false);
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
    return `${days}일 전`;
  };

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-brown">
          💬 댓글 {comments.length > 0 && `(${comments.length})`}
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-coral font-medium"
        >
          {showForm ? "취소" : "댓글 작성"}
        </button>
      </div>

      {/* Comment form */}
      {showForm && (
        <div className="mb-4 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(196,149,106,0.1)" }}>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="별명 (선택)"
            maxLength={20}
            className="w-full px-3 py-2 rounded-lg text-xs font-sans outline-none mb-2"
            style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(196,149,106,0.1)", color: "#444" }}
          />
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="따뜻한 댓글을 남겨주세요..."
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-xs font-sans outline-none resize-none mb-1"
            style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(196,149,106,0.1)", color: "#444" }}
          />
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-brown-pale">{newComment.length}/500</span>
            {submitError && (
              <span className="text-[10px] text-red-500">
                {submitError}
                {submitError.includes("로그인") && (
                  <a
                    href={`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/community")}`}
                    className="text-coral font-medium ml-1.5 no-underline"
                  >
                    로그인 →
                  </a>
                )}
              </span>
            )}
          </div>
          <button
            onClick={submitComment}
            disabled={loading || !newComment.trim()}
            className="w-full py-2 rounded-full text-xs font-medium text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #E07A5F, #D4836B)" }}
          >
            {loading ? "등록 중..." : "댓글 등록"}
          </button>
        </div>
      )}

      {/* Comments list */}
      {comments.length === 0 ? (
        <p className="text-xs text-brown-pale font-light text-center py-4">
          아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!
        </p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-xl p-3"
              style={{ background: "rgba(255,255,255,0.4)" }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-brown">
                  {comment.author_alias || "익명"}
                </span>
                <span className="text-[10px] text-brown-pale">
                  {formatTime(comment.created_at)}
                </span>
              </div>
              <p className="text-xs text-brown-light font-light leading-relaxed">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
