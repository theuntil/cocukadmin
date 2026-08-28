"use client";

import * as React from "react";
import { useActionState } from "react";
import { Alert, Button, Card, H3, Input } from "@/components/ui";
import { Icon } from "@/components/ui/icon";
import { IconImage, IconCheck, IconTicket } from "@/components/ui/icons";
import { MediaPicker } from "@/components/admin/media-picker";
import { VideoUpload } from "@/components/admin/video-upload";
import { updateSetting } from "@/lib/actions/content";
import { IDLE } from "@/lib/actions/types";
import { publicStorageUrl } from "@/lib/utils";

interface Row {
  key: string; value: unknown; label: string; description: string | null;
}

/**
 * Ana sayfa düzenleyici.
 *
 * Solda alanlar, sağda CANLI ÖNİZLEME. Yazdığınız her şey anında hero
 * görünümünde belirir; kaydetmeden önce sonucu görürsünüz.
 *
 * Video bağlantı yapıştırılarak değil, medya kütüphanesinden seçilerek
 * eklenir.
 */
export function HeroEditor({ settings }: { settings: Row[] }) {
  const [state, action, pending] = useActionState(saveAll, IDLE);

  /* Ayarlar tek tek kaydedilir (updateSetting bir anahtar alır).
     Bu sarmalayıcı hepsini sırayla gönderir. */
  async function saveAll(_prev: typeof IDLE, fd: FormData) {
    const items: [string, string, string][] = [
      ["hero.video_enabled", fd.get("hero.video_enabled") as string, "boolean"],
      ["hero.video_url", fd.get("hero.video_url") as string, "text"],
      ["hero.video_poster", fd.get("hero.video_poster") as string, "text"],
      ["hero.video_button", fd.get("hero.video_button") as string, "text"],
      ["hero.video_title", fd.get("hero.video_title") as string, "text"],
      ["hero.video_description", fd.get("hero.video_description") as string, "text"],
      ["hero.overlay_opacity", fd.get("hero.overlay_opacity") as string, "number"],
      ["home.featured_supporter", fd.get("home.featured_supporter") as string, "text"],
      ["home.featured_doc_label", fd.get("home.featured_doc_label") as string, "text"],
    ];

    for (const [key, value, kind] of items) {
      const one = new FormData();
      one.set("key", key);
      one.set("value", value ?? "");
      one.set("kind", kind);

      const res = await updateSetting(IDLE, one);
      if (!res.ok) return res;
    }

    return { ok: true, message: "Ayarlar kaydedildi." };
  }

  const get = (k: string) => {
    const v = settings.find((s) => s.key === k)?.value;
    return typeof v === "string" ? v : "";
  };
  const getBool = (k: string) => settings.find((s) => s.key === k)?.value === true;
  const getNum = (k: string, d: number) => {
    const v = settings.find((s) => s.key === k)?.value;
    return typeof v === "number" ? v : d;
  };

  const [enabled, setEnabled] = React.useState(getBool("hero.video_enabled"));
  const [video, setVideo] = React.useState(get("hero.video_url"));
  const [poster, setPoster] = React.useState(get("hero.video_poster"));
  const [title, setTitle] = React.useState(get("hero.video_title"));
  const [desc, setDesc] = React.useState(get("hero.video_description"));
  const [button, setButton] = React.useState(
    get("hero.video_button") || "Tanıtım videosunu izle");
  const [overlay, setOverlay] = React.useState(getNum("hero.overlay_opacity", 55));
  const [featured, setFeatured] = React.useState(get("home.featured_supporter"));
  const [docLabel, setDocLabel] = React.useState(
    get("home.featured_doc_label") || "Destek belgesi");

  // Medya seçicisi yol döndürür; önizleme için tam adrese çevrilir
  const videoSrc = video.startsWith("http")
    ? video : publicStorageUrl("site-video", video || null);
  const posterSrc = poster.startsWith("http")
    ? poster : publicStorageUrl("site-media", poster || null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[24px] font-semibold tracking-[-.03em] sm:text-[28px]">
          Ana sayfa
        </h1>
        <span className="text-[13.5px] text-muted sm:text-[14px]">
          Hero bölümündeki video, metinler ve öne çıkan destekçi.
        </span>
      </div>

      {state.message && (
        <Alert tone={state.ok ? "green" : "danger"}>{state.message}</Alert>
      )}

      <form action={action} className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-start lg:gap-6">
        {/* ── Alanlar ── */}
        <div className="order-2 flex min-w-0 flex-col gap-5 lg:order-1">
          <Card className="flex min-w-0 flex-col gap-5 p-5 sm:p-6">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <Icon icon={IconTicket} size={18} className="text-muted" />
                <H3 className="text-[17px]">Arka plan videosu</H3>
              </div>
              <button type="button" role="switch" aria-checked={enabled}
                aria-label="Videoyu göster"
                onClick={() => setEnabled((v) => !v)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  enabled ? "bg-green" : "bg-line2"}`}>
                <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all ${
                  enabled ? "left-[26px]" : "left-[3px]"}`} />
              </button>
              <input type="hidden" name="hero.video_enabled" value={String(enabled)} />
            </div>

            <p className="text-[13px] leading-[1.6] text-muted">
              Video ana sayfada sessizce ve sonsuz döngüde oynar. Ziyaretçi
              düğmeye bastığında tam ekran açılır ve sesi açılır.
            </p>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink2">Video dosyası</span>
              <VideoUpload value={video} onChange={setVideo} />
              <input type="hidden" name="hero.video_url" value={video} />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-ink2">Kapak görseli</span>
              <MediaPicker value={poster} onChange={setPoster} bucket="site-media" />
              <input type="hidden" name="hero.video_poster" value={poster} />
              <span className="text-[12px] text-muted">
                Video yüklenene kadar ve hareket azaltma açıkken gösterilir.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-ink2">
                Karartma: %{overlay}
              </label>
              <input type="range" min={0} max={90} value={overlay}
                onChange={(e) => setOverlay(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-chip
                           [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                           [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                           [&::-webkit-slider-thumb]:bg-ink" />
              <input type="hidden" name="hero.overlay_opacity" value={overlay} />
              <span className="text-[12px] text-muted">
                Yüksek değer yazıları okunaklı kılar, videoyu soluklaştırır.
              </span>
            </div>
          </Card>

          <Card className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
            <H3 className="text-[17px]">Video metinleri</H3>

            <Field label="Düğme metni">
              <Input name="hero.video_button" value={button}
                onChange={(e) => setButton(e.target.value)} maxLength={60} />
            </Field>

            <Field label="Video başlığı">
              <Input name="hero.video_title" value={title}
                onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </Field>

            <Field label="Video açıklaması">
              <textarea name="hero.video_description" value={desc}
                onChange={(e) => setDesc(e.target.value)} rows={3} maxLength={300}
                className="rounded-[12px] border border-line bg-field px-3.5 py-2.5 text-[14px] outline-none focus:border-solid" />
            </Field>
          </Card>

          <Card className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
            <H3 className="text-[17px]">Öne çıkan destekçi</H3>

            <Field label="Destekçi adı">
              <Input name="home.featured_supporter" value={featured}
                onChange={(e) => setFeatured(e.target.value)}
                placeholder="Ankara Üniversitesi" maxLength={120} />
            </Field>

            <Field label="Belge düğmesi metni">
              <Input name="home.featured_doc_label" value={docLabel}
                onChange={(e) => setDocLabel(e.target.value)} maxLength={60} />
            </Field>

            <span className="text-[12px] leading-[1.55] text-muted">
              Destekçi şeridinin altında tek satır olarak gösterilir. Boş
              bırakılırsa bölüm hiç görünmez.
            </span>
          </Card>

          <Button type="submit" size="lg" loading={pending} className="w-full sm:w-auto sm:self-start">
            <Icon icon={IconCheck} size={17} /> Değişiklikleri kaydet
          </Button>
        </div>

        {/* ── Canlı önizleme ── */}
        <div className="order-1 min-w-0 lg:sticky lg:top-6 lg:order-2">
          <Card className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
            <span className="flex items-center gap-2 text-[13px] font-semibold text-muted">
              <Icon icon={IconImage} size={15} /> Canlı önizleme
            </span>

            <div className="relative aspect-[16/10] overflow-hidden rounded-[16px] bg-page sm:aspect-[4/5]">
              {/* Arka plan */}
              {enabled && videoSrc ? (
                <video key={videoSrc} src={videoSrc} poster={posterSrc ?? undefined}
                  autoPlay muted loop playsInline
                  className="absolute inset-0 h-full w-full object-cover" />
              ) : posterSrc ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={posterSrc} alt=""
                  className="absolute inset-0 h-full w-full object-cover" />
              ) : null}

              {enabled && (
                <span className="absolute inset-0 bg-page"
                  style={{ opacity: overlay / 100 }} />
              )}

              {/* İçerik */}
              <div className="relative flex h-full flex-col justify-center gap-3 p-5">
                <span className="font-display text-[22px] font-semibold leading-[1.05] tracking-[-.03em]">
                  Her çocuğun<br />bir tribünü olsun.
                </span>
                <span className="text-[11.5px] leading-[1.5] text-ink2">
                  Stadyumlarda çocuklara ayrılmış, güvenli bir tribün.
                </span>

                <div className="mt-1 flex flex-col gap-2">
                  <span className="inline-flex h-8 w-fit items-center rounded-full bg-ink px-3.5 text-[11.5px] font-semibold text-white">
                    Kombine kartı incele
                  </span>

                  {enabled && videoSrc && (
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-surface/85 py-1 pl-1 pr-3 backdrop-blur">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white">
                        <Icon icon={IconTicket} size={10} className="ml-[1px]" />
                      </span>
                      <span className="text-[11px] font-semibold">{button}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!enabled && (
              <span className="text-[12px] text-muted">
                Video kapalı. Açtığınızda burada oynamaya başlar.
              </span>
            )}
          </Card>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-ink2">{label}</span>
      {children}
    </label>
  );
}
