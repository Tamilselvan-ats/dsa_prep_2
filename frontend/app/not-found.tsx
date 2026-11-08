"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#030712" }}>
      <div className="text-center max-w-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
        >
          {/* 404 Display */}
          <div className="relative mb-8">
            <div className="text-[120px] font-black leading-none select-none"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              404
            </div>
            <div className="absolute inset-0 text-[120px] font-black leading-none select-none blur-3xl opacity-20"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              404
            </div>
          </div>

          {/* Icon */}
          <div className="text-6xl mb-4">🔍</div>

          <h1 className="text-2xl font-bold text-slate-100 mb-2">Page Not Found</h1>
          <p className="text-slate-400 mb-8 leading-relaxed">
            Looks like this page went on a stack overflow journey and never came back.
            <br />
            Let&apos;s get you back to learning!
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "white",
              }}
            >
              <Home className="w-4 h-4" /> Go to Dashboard
            </Link>
            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all border border-slate-700/50 text-slate-300 hover:border-slate-500/50"
              style={{ background: "rgba(15, 23, 42, 0.6)" }}
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
          </div>

          {/* Quick Links */}
          <div className="mt-8 p-4 rounded-xl border border-slate-700/30" style={{ background: "rgba(15, 23, 42, 0.4)" }}>
            <p className="text-xs text-slate-500 mb-3">Quick Links</p>
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { href: "/tutor", label: "DSA Buddy" },
                { href: "/visualizer", label: "Visualizers" },
                { href: "/questions", label: "Questions" },
                { href: "/exam", label: "Exam" },
                { href: "/analytics", label: "Analytics" },
              ].map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-3 py-1.5 rounded-lg text-xs text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/10 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
