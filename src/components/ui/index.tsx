import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ToneName } from "@/lib/utils";

/* ══════════════════════ BUTTON ══════════════════════ */

type ButtonVariant = "solid" | "ink" | "green" | "lime" | "outline" | "ghost" | "orange" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const BTN_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap " +
  "transition-[transform,background-color,color,border-color,opacity] duration-200 ease-out " +
  "active:scale-[.97] disabled:opacity-50 disabled:pointer-events-none select-none";

const BTN_VARIANT: Record<ButtonVariant, string> = {
  // Birincil eylem: sarı vurgu rengi
  solid: "bg-solid text-on-solid hover:brightness-[.96] shadow-[0_2px_0_0_var(--accent-line)]",
  /* Nötr birincil eylem: açık temada SİYAH, koyu temada AÇIK.
     Sarı vurgu her yerde kullanılınca ekran yoruyor; mail modülü
     gibi yoğun ekranlarda ana eylem bunu kullanır. */
  ink: "bg-solid text-on-solid hover:opacity-90 active:scale-[.975]",
  // "green" geriye dönük uyumluluk için sarıya yönlendirildi
  green: "bg-solid text-on-solid hover:brightness-[.96] shadow-[0_2px_0_0_var(--accent-line)]",
  lime: "bg-solid text-on-solid hover:brightness-[.96]",
  orange: "bg-orange text-white hover:opacity-90",
  outline: "border border-line bg-surface text-ink hover:border-ink/25 hover:bg-chip",
  ghost: "text-ink2 hover:bg-chip hover:text-ink",
  danger: "bg-danger text-white hover:opacity-90",
};

/* Wise düğmeleri dolgun: yükseklik güven veriyor ve dokunma alanı
   mobilde rahat oluyor. */
const BTN_SIZE: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-[13.5px]",
  md: "px-5 py-[12px] text-[14.5px]",
  lg: "px-7 py-[15px] text-[15.5px]",
};

export function buttonClass(variant: ButtonVariant = "solid", size: ButtonSize = "md", extra?: string) {
  return cn(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], extra);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export function Button({ variant = "solid", size = "md", loading, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function ButtonLink({
  href, variant = "solid", size = "md", className, children, ...rest
}: { href: string; variant?: ButtonVariant; size?: ButtonSize; className?: string; children: React.ReactNode } &
  Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("ct-spin inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent", className)}
    />
  );
}

/* ══════════════════════ CARD / SURFACE ══════════════════════ */

export function Card({ className, children, as: As = "div" }: { className?: string; children: React.ReactNode; as?: React.ElementType }) {
  return <As className={cn("rounded-[20px] border border-line bg-surface", className)}>{children}</As>;
}

export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-[26px] border border-line bg-page overflow-hidden", className)} style={{ boxShadow: "var(--shadow)" }}>
      {children}
    </div>
  );
}

export function Section({ className, children, id }: { className?: string; children: React.ReactNode; id?: string }) {
  return <section id={id} className={cn("px-5 py-14 sm:px-8 lg:px-12 lg:py-20", className)}>{children}</section>;
}

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1240px]", className)}>{children}</div>;
}

/* ══════════════════════ TİPOGRAFİ ══════════════════════ */

/*
 * ┌─ ÖLÇEK TEK YERDEN ⚠️ ─────────────────────────────────────────┐
 * │ Başlık boyutları burada elle yazılıydı; ana sayfa ise `ct-h1`  │
 * │ sınıflarını kullanıyordu. İki ayrı ölçek, iki farklı görünüm:  │
 * │ ana sayfa Wise'a benziyor, iç sayfalar eskisi gibi kalıyordu.  │
 * │                                                                 │
 * │ Artık ikisi de aynı sınıflara bakıyor. Ölçek değişirse tüm     │
 * │ site birlikte değişiyor.                                        │
 * └─────────────────────────────────────────────────────────────────┘
 */
export function H1({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h1 className={cn("ct-h1", className)}>{children}</h1>;
}

export function H2({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h2 className={cn("ct-h2", className)}>{children}</h2>;
}

export function H3({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h3 className={cn("ct-h3", className)}>{children}</h3>;
}

export function Eyebrow({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn("ct-eyebrow", className)}>{children}</span>;
}

export function Lead({ className, children }: { className?: string; children: React.ReactNode }) {
  return <p className={cn("text-[16px] leading-[1.65] text-ink2 sm:text-[17.5px]", className)}>{children}</p>;
}

/* ══════════════════════ BADGE / PILL ══════════════════════ */

const TONE: Record<ToneName, string> = {
  green: "bg-chip text-ink border-ink/25",
  orange: "bg-orange-soft text-orange-ink border-orange-line",
  danger: "bg-danger-soft text-danger border-transparent",
  lime: "bg-solid text-on-solid border-transparent",
  muted: "bg-chip text-ink2 border-transparent",
};

export function Badge({ tone = "muted", className, children }: { tone?: ToneName; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-semibold", TONE[tone], className)}>
      {children}
    </span>
  );
}

export function Dot({ tone = "orange" }: { tone?: ToneName }) {
  const bg = tone === "green" ? "bg-green" : tone === "danger" ? "bg-danger" : tone === "lime" ? "bg-lime" : "bg-orange";
  return <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", bg)} />;
}

export function Pill({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("inline-flex items-center gap-2.5 self-start rounded-full border border-line bg-surface px-3.5 py-[7px] text-[13px] font-semibold text-ink2", className)}>
      {children}
    </div>
  );
}

/* ══════════════════════ FORM ══════════════════════ */

const FIELD =
  "w-full rounded-[12px] border border-line bg-field px-4 py-3 text-[14.5px] text-ink " +
  "placeholder:text-muted2 transition-colors duration-150 " +
  "focus:border-green focus:outline-none disabled:opacity-60";

export function Label({ htmlFor, children, hint }: { htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-2 text-[13px] font-semibold text-ink2">
      <span>{children}</span>
      {hint && <span className="text-[12px] font-normal text-muted2">{hint}</span>}
    </label>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cn(FIELD, className)} {...rest} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return <textarea ref={ref} className={cn(FIELD, "min-h-[120px] resize-y leading-[1.6]", className)} {...rest} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...rest }, ref) {
    return (
      <select ref={ref} className={cn(FIELD, "cursor-pointer appearance-none bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10", className)}
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%236c7b73' stroke-width='2'%3E%3Cpath d='M4 6l4 4 4-4'/%3E%3C/svg%3E\")" }}
        {...rest}>
        {children}
      </select>
    );
  },
);

export function Field({ label, hint, error, htmlFor, children }: {
  label: string; hint?: string; error?: string | null; htmlFor?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} hint={hint}>{label}</Label>
      {children}
      {error && <span className="text-[12.5px] font-medium text-danger">{error}</span>}
    </div>
  );
}

export function Checkbox({ id, label, ...rest }: { id: string; label: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-[1.55] text-ink2">
      <input
        id={id} type="checkbox"
        className="mt-[2px] h-[18px] w-[18px] shrink-0 cursor-pointer appearance-none rounded-[6px] border border-line bg-field transition-colors checked:border-green checked:bg-green
                   checked:bg-[length:12px] checked:bg-center checked:bg-no-repeat"
        style={{ backgroundImage: "var(--tick)" }}
        {...rest}
      />
      <span>{label}</span>
    </label>
  );
}

/* ══════════════════════ DURUM GÖSTERGELERİ ══════════════════════ */

export function Alert({ tone = "orange", title, children }: { tone?: ToneName; title?: string; children: React.ReactNode }) {
  return (
    <div className={cn("ct-fade rounded-[16px] border px-4 py-3.5 text-[13.5px] leading-[1.6]", TONE[tone])} role="status">
      {title && <div className="mb-1 font-bold">{title}</div>}
      {children}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="ct-fade flex flex-col items-center gap-4 rounded-[20px] border border-dashed border-line bg-surface/60 px-6 py-16 text-center">
      {icon && <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-chip text-muted">{icon}</div>}
      <div className="flex flex-col gap-1.5">
        <span className="font-display text-[19px] font-semibold">{title}</span>
        {description && <span className="max-w-[420px] text-[14px] leading-[1.6] text-muted">{description}</span>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("ct-skeleton rounded-[12px]", className)} />;
}

export function ProgressBar({ value, tone = "green", className }: { value: number; tone?: "green" | "orange" | "lime"; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const bg = tone === "orange" ? "bg-orange" : tone === "lime" ? "bg-lime" : "bg-green";
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-chip", className)}
      role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", bg)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-line2", className)} />;
}

export function StatBlock({ value, label, tone }: { value: React.ReactNode; label: string; tone?: "green" | "orange" }) {
  const color = tone === "green" ? "text-ink" : tone === "orange" ? "text-orange" : "text-ink";
  return (
    <div className="flex flex-col gap-1">
      <span className={cn("font-display text-[30px] leading-none font-semibold tracking-[-.03em] sm:text-[34px]", color)}>{value}</span>
      <span className="text-[13px] text-muted">{label}</span>
    </div>
  );
}
