"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

const ADMIN_PHONE = "+918980226979";

export function SignInContactAdmin() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <p className="mt-8 text-center text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-medium text-violet-400 transition hover:text-violet-300"
        >
          Contact Admin
        </button>
      </p>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),24rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <Dialog.Title className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Contact Admin
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Reach out to get an account or for support.
            </Dialog.Description>
            <p className="mt-4 font-mono text-lg font-medium text-slate-900 dark:text-slate-100">
              {ADMIN_PHONE}
            </p>
            <a
              href={`tel:${ADMIN_PHONE.replace(/\s/g, "")}`}
              className="mt-4 inline-block rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-500"
            >
              Call
            </a>
            <Dialog.Close asChild>
              <button
                type="button"
                className="mt-4 block w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
