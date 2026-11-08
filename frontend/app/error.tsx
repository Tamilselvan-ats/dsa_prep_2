"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#030712", color: "#f1f5f9", fontFamily: "ui-sans-serif, system-ui, sans-serif", minHeight: "100vh" }}>
        <div className="min-h-screen flex items-center justify-center p-6" style={{ minHeight: "100vh" }}>
          <div className="text-center max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Error Icon */}
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
                style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}
              >
                <AlertTriangle className="w-10 h-10" style={{ color: "#ef4444" }} />
              </div>

              <h1 className="text-2xl font-bold mb-2" style={{ color: "#f1f5f9" }}>Something Went Wrong</h1>
              <p className="mb-2" style={{ color: "#94a3b8" }}>
                An unexpected error occurred. Don&apos;t worry — your progress is saved.
              </p>

              {error.digest && (
                <p className="text-xs mb-6 font-mono px-3 py-1 rounded-lg inline-block"
                  style={{ color: "#64748b", background: "rgba(15, 23, 42, 0.6)" }}
                >
                  Error ID: {error.digest}
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
                <button
                  onClick={reset}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white" }}
                >
                  <RefreshCw className="w-4 h-4" /> Try Again
                </button>
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(100, 116, 139, 0.3)",
                    color: "#cbd5e1",
                    textDecoration: "none",
                  }}
                >
                  <Home className="w-4 h-4" /> Dashboard
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </body>
    </html>
  );
}
