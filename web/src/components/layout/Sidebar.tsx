"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/home",     label: "Home",                    icon: "◈" },
  { href: "/nlp",      label: "NLP Water Report",         icon: "◉" },
  { href: "/insights", label: "Quick Insights",           icon: "◎" },
  { href: "/map",      label: "Risk Map",                 icon: "◈" },
  { href: "/sensor",   label: "Sensor Detection",         icon: "◉" },
  { href: "/analysis", label: "Data Analysis",            icon: "◎" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = (
    <nav className="flex-1 py-6 space-y-1">
      {NAV_ITEMS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`
              flex items-center gap-3 px-5 py-3 text-sm font-medium rounded-r-full mr-4
              transition-all duration-150
              ${active
                ? "bg-forest-700 text-white shadow-warm"
                : "text-parchment-200 hover:bg-forest-800 hover:text-white"
              }
            `}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-earth-400" : "bg-forest-600"}`}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* ── Desktop sidebar ───────────────────────────────────────────────── */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col bg-forest-900 z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-forest-800">
          <div className="w-8 h-8 rounded-lg bg-earth-400 flex items-center justify-center flex-shrink-0">
            <span className="text-forest-900 font-bold text-base leading-none">M</span>
          </div>
          <div>
            <p className="text-white font-display font-bold text-lg leading-none">MajiCast</p>
            <p className="text-earth-300 text-xs mt-0.5">Water Intelligence</p>
          </div>
        </div>

        {navLinks}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-forest-800">
          <p className="text-earth-300 text-xs leading-relaxed">
            Kenya water quality monitoring powered by ML.
          </p>
          <p className="text-forest-600 text-xs mt-2">MajiCast 2025</p>
        </div>
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-50 bg-forest-900 flex items-center justify-between px-4 py-3 shadow-warm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-earth-400 flex items-center justify-center">
            <span className="text-forest-900 font-bold text-sm">M</span>
          </div>
          <span className="text-white font-display font-bold text-base">MajiCast</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-parchment-200 p-1.5 rounded-md hover:bg-forest-800 transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile drawer ─────────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-forest-900 flex flex-col pt-14 shadow-warm-lg">
            {navLinks}
          </aside>
        </div>
      )}

      {/* Mobile top-bar spacer */}
      <div className="md:hidden h-14" />
    </>
  );
}
