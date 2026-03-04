"use client";

import { useState, useCallback, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { TaskComments, CommentRow, type Comment } from "./task-comments";

type Props = {
  taskId: string;
  initialComments: Comment[];
  currentUserId: string;
};

const LATEST_COUNT = 3;

export function TaskCommentsTrigger({ taskId, initialComments, currentUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(initialComments);

  const handleCommentsChange = useCallback((next: Comment[]) => setComments(next), []);

  useEffect(() => {
    setComments(initialComments);
  }, [initialComments]);

  const latestComments = comments.length <= LATEST_COUNT ? comments : comments.slice(-LATEST_COUNT);
  const hasMore = comments.length > LATEST_COUNT;

  return (
    <>
      <div className="rounded-xl border border-zinc-200/80 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800/80">
        <div className="flex items-center justify-between border-b border-zinc-200/80 px-4 py-3 dark:border-zinc-600">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Comments ({comments.length})</h3>
        </div>

        {comments.length === 0 ? (
          <div className="px-4 py-4">
            <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">No comments yet.</p>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-2 w-full rounded-lg border border-dashed border-zinc-300 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 dark:border-zinc-600 dark:text-teal-400 dark:hover:bg-zinc-800"
            >
              Add comment
            </button>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-700">
              {latestComments.map((c) => (
                <CommentRow key={c.id} comment={c} currentUserId={currentUserId} />
              ))}
            </ul>
            <div className="border-t border-zinc-100 px-4 py-2 dark:border-zinc-700">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="w-full rounded-lg py-2 text-center text-sm font-medium text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-zinc-800"
              >
                {hasMore ? `View all ${comments.length} comments` : "View all & add comment"}
              </button>
            </div>
          </>
        )}
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-zinc-900/50" />
          <Dialog.Content
            className="fixed left-[50%] top-[50%] z-50 flex max-h-[85vh] w-full max-w-lg translate-x-[-50%] translate-y-[-50%] flex-col rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
            aria-describedby={undefined}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
              <Dialog.Title className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Comments
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-2.72 2.72a.75.75 0 101.06 1.06L10 11.06l2.72 2.72a.75.75 0 101.06-1.06L11.06 10l2.72-2.72a.75.75 0 00-1.06-1.06L10 8.94 7.28 6.22z" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <TaskComments
                taskId={taskId}
                initialComments={comments}
                currentUserId={currentUserId}
                inModal
                onCommentsChange={handleCommentsChange}
              />
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
