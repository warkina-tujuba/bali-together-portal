import { ReactNode } from "react";
import { ArrowLeft, ArrowRight, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";
import { Link } from "@tanstack/react-router";

export type WizardStep = {
  key: string;
  label: string;
};

export function WizardShell({
  steps, currentIndex, onBack, onNext, onSkip,
  nextLabel = "Next", nextDisabled, skippable, busy, children, eyebrow, title, subtitle, icon,
}: {
  steps: WizardStep[];
  currentIndex: number;
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  skippable?: boolean;
  busy?: boolean;
  children: ReactNode;
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg">
            <img src={logo} alt="" className="h-7 w-7" />
            <span>Travel Link</span>
          </Link>
          <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            {currentIndex + 1} / {steps.length}
          </span>
        </div>
        {/* Segmented progress */}
        <div className="mx-auto flex max-w-2xl items-center gap-1 px-4 pb-3">
          {steps.map((s, i) => (
            <div
              key={s.key}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                i < currentIndex ? "bg-primary" : i === currentIndex ? "bg-primary" : "bg-border",
              )}
            />
          ))}
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto w-full max-w-2xl flex-1 px-5 pb-32 pt-6">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          {icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              {icon}
            </span>
          )}
          {eyebrow}
        </div>
        <h1 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300" key={currentIndex}>
          {children}
        </div>
      </div>

      {/* Bottom CTA bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-3">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={!onBack || busy}
            className="rounded-xl"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="flex items-center gap-2">
            {skippable && onSkip && (
              <Button variant="ghost" onClick={onSkip} disabled={busy} className="rounded-xl text-muted-foreground">
                <SkipForward className="mr-1 h-4 w-4" /> Skip
              </Button>
            )}
            <Button onClick={onNext} disabled={nextDisabled || busy} className="h-11 rounded-xl px-6">
              {busy ? "…" : nextLabel} <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
