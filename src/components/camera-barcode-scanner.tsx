"use client";

import { useEffect, useId, useRef, useState } from "react";

type CameraBarcodeScannerProps = {
  onScan: (value: string) => void;
  onClose: () => void;
  /** Validate before calling onScan; if false, onScan is not called. */
  validate?: (value: string) => boolean;
};

export function CameraBarcodeScanner({ onScan, onClose, validate }: CameraBarcodeScannerProps) {
  const containerId = useId().replace(/:/g, "");
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);
  const onScanRef = useRef(onScan);
  const onCloseRef = useRef(onClose);
  const validateRef = useRef(validate);
  onScanRef.current = onScan;
  onCloseRef.current = onClose;
  validateRef.current = validate;

  useEffect(() => {
    let mounted = true;
    setError(null);
    setStarting(true);

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 260, height: 160 },
            aspectRatio: 1.333,
          },
          (decodedText) => {
            if (!mounted || !scannerRef.current) return;
            const raw = decodedText.trim();
            const digitsOnly = raw.replace(/\D/g, "");
            const value = digitsOnly.slice(0, 10);
            if (value.length !== 10) return;
            if (validateRef.current && !validateRef.current(value)) return;
            scanner.stop().catch(() => {});
            scannerRef.current = null;
            onScanRef.current(value);
            onCloseRef.current();
          },
          () => {
            // Ignore per-frame scan errors (no barcode in view)
          }
        );
        if (mounted) setStarting(false);
      } catch (e) {
        if (mounted) {
          setError(e instanceof Error ? e.message : "Could not start camera");
          setStarting(false);
        }
      }
    }

    start();
    return () => {
      mounted = false;
      const s = scannerRef.current;
      if (s) {
        s.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [containerId]);

  return (
    <div className="flex flex-col gap-3">
      <div
        id={containerId}
        className="overflow-hidden rounded-lg bg-black [&_.qr-shader]:!rounded-lg"
        style={{ minHeight: 240 }}
      />
      {starting && (
        <p className="text-center text-sm text-slate-500">Starting camera…</p>
      )}
      {error && (
        <p className="text-center text-sm text-red-600">{error}</p>
      )}
      <p className="text-center text-xs text-slate-400">
        Point your camera at a 10-digit barcode. Serial must be 10 digits.
      </p>
    </div>
  );
}
