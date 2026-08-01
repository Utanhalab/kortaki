import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type StepRequirement = {
  /** Stable key of the step, e.g. "service" */
  key: string;
  /** Message shown when the step is missing, e.g. "Selecciona um serviço" */
  message: string;
  /** Whether the step is fulfilled */
  done: boolean;
};

/** Returns the first unfulfilled requirement, or null when everything is done. */
export function firstMissing(reqs: StepRequirement[]): StepRequirement | null {
  return reqs.find((r) => !r.done) ?? null;
}

/** Inline warning shown next to (or above) a blocked action. */
export function StepHint({
  message,
  className,
}: {
  message?: string | null;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-xs font-semibold text-primary",
        className,
      )}
    >
      <AlertCircle className="h-4 w-4 shrink-0 text-gold" />
      {message}
    </p>
  );
}

/** Section heading that highlights itself when it is the blocking step. */
export function StepHeading({
  index,
  title,
  active,
  done,
  className,
}: {
  index?: number;
  title: string;
  active?: boolean;
  done?: boolean;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider transition-colors",
        active ? "text-primary" : done ? "text-muted-foreground" : "text-muted-foreground",
        className,
      )}
    >
      {index != null && (
        <span
          className={cn(
            "grid h-5 w-5 place-items-center rounded-full text-[11px]",
            active
              ? "bg-gold text-primary"
              : done
                ? "bg-primary text-gold"
                : "bg-muted text-muted-foreground",
          )}
        >
          {index}
        </span>
      )}
      {title}
      {active && <AlertCircle className="h-4 w-4 text-gold" />}
    </h2>
  );
}

/** Wrapper that draws attention to the section that is currently blocking. */
export function StepSection({
  active,
  children,
  className,
}: {
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "scroll-mt-24 rounded-2xl transition-all",
        active && "-mx-2 bg-gold/5 px-2 py-2 ring-2 ring-gold/40",
        className,
      )}
    >
      {children}
    </section>
  );
}
