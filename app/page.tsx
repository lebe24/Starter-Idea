import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Starter Idea",
  description:
    "Discover, validate, and track micro-SaaS ideas with live signals and a calm workspace.",
};

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[oklch(0.985_0.004_85)] text-[oklch(0.22_0.02_265)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_0%_0%,oklch(0.92_0.04_85/0.22),transparent_65%),radial-gradient(ellipse_50%_40%_at_100%_100%,oklch(0.88_0.06_250/0.12),transparent_60%)]"
      />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[min(92vw,42rem)] flex-col px-6 pb-16 pt-14 md:px-10 md:pb-24 md:pt-20">
        <header className="flex items-baseline justify-between gap-6">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.28em] text-[oklch(0.45_0.02_265)]">
            Starter Idea
          </span>
          <span className="hidden text-right font-mono text-[11px] text-[oklch(0.5_0.02_265)] sm:block">
            Micro-SaaS workspace
          </span>
        </header>

        <main className="mt-[min(18vh,9rem)] flex flex-1 flex-col md:mt-[min(22vh,11rem)]">
          <div className="border-l border-[oklch(0.78_0.14_75)] pl-6 md:pl-8">
            <h1 className="font-serif max-w-[15ch] text-[clamp(2.25rem,6vw,3.75rem)] font-normal leading-[1.08] tracking-[-0.02em] motion-safe:animate-[landing-enter_0.9s_ease-out_both]">
              Your idea worthless until you build it.
            </h1>
            <p className="mt-8 max-w-md text-lg font-normal leading-relaxed text-[oklch(0.38_0.02_265)] motion-safe:animate-[landing-enter_0.9s_ease-out_0.12s_both]">
              Live signals, validation context, and a dashboard that stays out of your way—so
              you can choose the next small bet with clarity.
            </p>
            <nav
              className="mt-12 flex flex-wrap items-center gap-x-10 gap-y-4 motion-safe:animate-[landing-enter_0.9s_ease-out_0.24s_both]"
              aria-label="Primary"
            >
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 text-base font-medium text-[oklch(0.18_0.02_265)] underline decoration-[oklch(0.78_0.14_75)] decoration-1 underline-offset-[6px] transition hover:decoration-[oklch(0.55_0.12_75)]"
              >
                Enter workspace
                <span
                  aria-hidden
                  className="inline-block translate-x-0 transition-transform duration-300 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
              <Link
                href="/explore"
                className="text-base font-normal text-[oklch(0.42_0.02_265)] underline decoration-[oklch(0.88_0.02_265)] decoration-1 underline-offset-[6px] transition hover:text-[oklch(0.28_0.02_265)] hover:decoration-[oklch(0.55_0.02_265)]"
              >
                Explore one idea in depth
              </Link>
            </nav>
          </div>
        </main>

        <footer className="mt-auto pt-16 font-mono text-[10px] uppercase tracking-[0.2em] text-[oklch(0.55_0.02_265)]">
          Signals · validation · quiet craft
        </footer>
      </div>
      <style>{`
        @keyframes landing-enter {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
