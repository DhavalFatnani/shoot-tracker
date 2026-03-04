"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toaster";

export function SignInMessageToast({ message }: { message: string | undefined }) {
  const { toast } = useToast();

  useEffect(() => {
    if (!message) return;
    const text = message.replace(/\+/g, " ");
    if (/session expired/i.test(text)) {
      toast(text, { variant: "default" });
    } else if (/password/i.test(text)) {
      toast(text, { variant: "success" });
    }
  }, [message, toast]);

  return null;
}
