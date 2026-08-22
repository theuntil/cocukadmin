"use client";

import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { IconGirl, IconBoy } from "@/components/ui/icons";

/**
 * Cinsiyet seçimi.
 *
 * Etkinliklerde grup ayrımı için gerekli olduğundan seçim zorunludur.
 * Radyo düğmesi yerine iki büyük kutu kullanılır: dokunmatikte hedef alan geniş.
 * Hem kurulum sihirbazında hem çocuk yönetiminde aynı bileşen kullanılır ki
 * iki ekran birbirinden ayrışmasın.
 */
export function GenderPicker({
  defaultValue, error, name = "gender",
}: { defaultValue?: string | null; error?: string; name?: string }) {
  const initial = defaultValue === "female" || defaultValue === "male" ? defaultValue : "";
  const [value, setValue] = React.useState(initial);

  React.useEffect(() => { setValue(initial); }, [initial]);

  const options = [
    { value: "female", label: "Kız", icon: IconGirl },
    { value: "male", label: "Erkek", icon: IconBoy },
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-ink2">Cinsiyet</span>

      <input type="hidden" name={name} value={value} />

      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setValue(o.value)}
              aria-pressed={active}
              className={`flex flex-col items-center gap-2.5 rounded-[18px] border-2 p-5 transition-all ${
                active
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface hover:border-accent-line"
              }`}
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                active ? "bg-accent text-white" : "bg-chip text-muted"}`}>
                <Icon icon={o.icon} size={22} />
              </span>
              <span className="text-[14.5px] font-semibold">{o.label}</span>
            </button>
          );
        })}
      </div>

      {error && <span className="text-[12.5px] font-medium text-danger">{error}</span>}
    </div>
  );
}
