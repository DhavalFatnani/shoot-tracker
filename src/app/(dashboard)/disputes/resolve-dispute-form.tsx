"use client";

import { useState, useTransition } from "react";
import { resolveDispute, uploadDisputePhoto } from "@/app/actions/dispute-actions";
import { useRouter } from "next/navigation";

export function ResolveDisputeForm({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  const handleResolve = () => {
    if (!comment.trim()) {
      setError("Resolution comment is required");
      return;
    }
    setError(null);

    startTransition(async () => {
      let photoUrl: string | undefined;

      if (file) {
        const uploadFd = new FormData();
        uploadFd.set("file", file);
        const uploadRes = await uploadDisputePhoto(uploadFd);
        if (!uploadRes.success) {
          setError(uploadRes.error ?? "Photo upload failed");
          return;
        }
        photoUrl = uploadRes.url;
      }

      const fd = new FormData();
      fd.set("disputeId", disputeId);
      fd.set("comment", comment);
      if (photoUrl) fd.set("photoUrl", photoUrl);

      const res = await resolveDispute(fd);
      if (res.success) {
        setExpanded(false);
        router.refresh();
      } else {
        setError(res.error ?? "Failed to resolve");
      }
    });
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="rounded-md bg-teal-100 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-200 transition"
      >
        Resolve
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <div>
        <label htmlFor={`comment-${disputeId}`} className="mb-1 block text-xs font-medium text-zinc-700">
          Resolution comment *
        </label>
        <textarea
          id={`comment-${disputeId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          placeholder="Describe how this dispute was resolved..."
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-teal-300 focus:outline-none focus:ring-1 focus:ring-teal-100"
        />
      </div>

      <div>
        <label htmlFor={`photo-${disputeId}`} className="mb-1 block text-xs font-medium text-zinc-700">
          Photo (optional)
        </label>
        <input
          id={`photo-${disputeId}`}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-xs text-zinc-500 file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-teal-700 hover:file:bg-teal-100"
        />
        {preview && (
          <img src={preview} alt="Preview" className="mt-2 h-24 w-auto rounded-md border border-zinc-200 object-cover" />
        )}
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={handleResolve}
          disabled={pending}
          className="rounded-md bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending ? "Resolving..." : "Resolve dispute"}
        </button>
        <button
          onClick={() => { setExpanded(false); setError(null); }}
          disabled={pending}
          className="rounded-md bg-zinc-200 px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-300 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
