import { cn } from "@/lib/utils";

/** Yasal metin ve uzun içerik tipografisi */
export function Prose({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[760px] text-[15.5px] leading-[1.75] text-ink2",
        "[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:font-display [&_h2]:text-[24px] [&_h2]:font-semibold [&_h2]:tracking-[-.02em] [&_h2]:text-ink",
        "[&_h3]:mt-7 [&_h3]:mb-2 [&_h3]:font-display [&_h3]:text-[19px] [&_h3]:font-semibold [&_h3]:text-ink",
        "[&_p]:mb-4",
        "[&_ul]:mb-4 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5 [&_ul]:list-disc [&_ul]:marker:text-accent-ink",
        "[&_ol]:mb-4 [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5 [&_ol]:list-decimal [&_ol]:marker:text-accent-ink",
        "[&_a]:font-semibold [&_a]:text-accent-ink hover:[&_a]:underline",
        "[&_strong]:font-semibold [&_strong]:text-ink",
        "[&_table]:w-full [&_table]:border-collapse [&_table]:text-[14px]",
        "[&_th]:border-b [&_th]:border-line [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-ink",
        "[&_td]:border-b [&_td]:border-line2 [&_td]:py-2.5 [&_td]:align-top",
        "[&_hr]:my-8 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-line2",
        "[&_blockquote]:my-5 [&_blockquote]:border-l-[3px] [&_blockquote]:border-accent-line [&_blockquote]:pl-4 [&_blockquote]:text-ink",
        className,
      )}
    >
      {children}
    </div>
  );
}
