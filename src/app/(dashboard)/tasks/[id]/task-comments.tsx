"use client";

import { useState, useTransition, useEffect } from "react";
import { addComment, listComments } from "@/app/actions/comment-actions";
import { useRouter } from "next/navigation";

export type Comment = {
  id: string;
  taskId: string;
  userId: string;
  body: string;
  createdAt: Date | string;
  userRole: string | null;
};

const ROLE_BADGES: Record<string, string> = {
  ADMIN: "bg-purple-100 text-purple-700",
  OPS_USER: "bg-blue-100 text-blue-700",
  SHOOT_USER: "bg-emerald-100 text-emerald-700",
};

export function formatRelativeTime(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" });
}

export function CommentRow({ comment, currentUserId }: { comment: Comment; currentUserId: string }) {
  return (
    <li className="px-5 py-3">
      <div className="flex items-center gap-2">
        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_BADGES[comment.userRole ?? ""] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-600 dark:text-zinc-200"}`}>
          {comment.userRole ?? "USER"}
        </span>
        <span className="text-[10px] text-zinc-400 font-mono">User</span>
        <span className="text-[10px] text-zinc-400">{formatRelativeTime(comment.createdAt)}</span>
        {comment.userId === currentUserId && (
          <span className="text-[10px] text-teal-500 font-medium">you</span>
        )}
      </div>
      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">{comment.body}</p>
    </li>
  );
}

export function TaskComments({
  taskId,
  initialComments,
  currentUserId,
  inModal = false,
  onCommentsChange,
}: {
  taskId: string;
  initialComments: Comment[];
  currentUserId: string;
  inModal?: boolean;
  onCommentsChange?: (comments: Comment[]) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>(initialComments);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const handleSubmit = () => {
    if (!body.trim()) return;
    setError(null);

    startTransition(async () => {
      const fd = new FormData();
      fd.set("taskId", taskId);
      fd.set("body", body.trim());
      const res = await addComment(fd);
      if (res.success) {
        setBody("");
        const refreshed = await listComments(taskId);
        if (refreshed.success && refreshed.data) {
          setComments(refreshed.data);
          onCommentsChange?.(refreshed.data);
        }
        router.refresh();
      } else {
        setError(res.error ?? "Failed to add comment");
      }
    });
  };

  const wrapperClass = inModal
    ? "flex min-h-0 flex-1 flex-col"
    : "rounded-xl border border-zinc-200 bg-white shadow-sm";
  const listMaxHeight = inModal ? "min-h-0 flex-1 overflow-y-auto" : "max-h-80 overflow-y-auto";

  return (
    <div className={wrapperClass}>
      {!inModal && (
        <div className="border-b border-zinc-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-zinc-900">
            Comments ({comments.length})
          </h3>
        </div>
      )}

      {comments.length === 0 ? (
        <p className={inModal ? "flex-1 px-5 py-6 text-center text-sm text-zinc-400" : "px-5 py-6 text-center text-sm text-zinc-400"}>
          No comments yet. Be the first to add one.
        </p>
      ) : (
        <ul className={`divide-y divide-zinc-100 ${listMaxHeight}`}>
          {comments.map((c) => (
            <CommentRow key={c.id} comment={c} currentUserId={currentUserId} />
          ))}
        </ul>
      )}

      <div className="shrink-0 border-t border-zinc-100 px-5 py-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Add a comment..."
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-teal-100"
          />
          <button
            onClick={handleSubmit}
            disabled={pending || !body.trim()}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-500 disabled:opacity-50 transition"
          >
            {pending ? "..." : "Post"}
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
