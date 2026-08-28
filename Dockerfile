# ── Bağımlılıklar ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ── Derleme ──────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# public/ boş olabilir (Git boş klasör tutmaz); COPY aşamasının
# çökmemesi için burada garantiye alıyoruz.
RUN mkdir -p public

# Derleme sırasında gereken public değişkenler
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
# Takım panelinin adresi — davet bağlantıları buradan üretilir.
# EKSİKTİ: derleme anında verilmediği için tarayıcıya boş gidiyor,
# davet bağlantıları çalışmayan bir adrese çıkıyordu.
ARG NEXT_PUBLIC_TEAM_URL
# R2 açık adresi derleme anında gömülüyor: `publicStorageUrl`
# tarayıcıda çalışıyor ve bu değeri orada okuyor.
ARG NEXT_PUBLIC_R2_PUBLIC_URL
# Okuma kaynağı tarayıcıda da bilinmeli: görsel adreslerini
# `publicStorageUrl` üretiyor ve o fonksiyon tarayıcıda çalışıyor.
ARG NEXT_PUBLIC_STORAGE_READ_FROM
ENV NEXT_PUBLIC_R2_PUBLIC_URL=$NEXT_PUBLIC_R2_PUBLIC_URL
ENV NEXT_PUBLIC_STORAGE_READ_FROM=$NEXT_PUBLIC_STORAGE_READ_FROM
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_TEAM_URL=$NEXT_PUBLIC_TEAM_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ── Çalıştırma ───────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache tini && \
    addgroup -g 1001 -S nodejs && \
    adduser -u 1001 -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/giris').then(r=>{if(r.status>=500)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
