"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { KeyboardShortcutsProvider } from "@/components/keyboard-shortcuts";

export function DashboardClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <KeyboardShortcutsProvider>
        {children}
      </KeyboardShortcutsProvider>
    </ThemeProvider>
  );
}
