/**
 * Consolidated Instagram dataset for AI analysis.
 *
 * Reúne, num único payload, tudo o que a IA precisa para atuar como analista
 * sênior: KPIs agregados, série diária, demografia da audiência e o dataset
 * completo de posts (com legendas, hashtags, formatos e horários), além de
 * agregações derivadas (por formato, por dia da semana, por hora, hashtags).
 */
import {
  getReportMetricsImpl,
  getTopInstagramPostsImpl,
  getInstagramAudienceImpl,
  type WindsorRange,
  type TopPost,
} from "./windsor.server";

type PostRow = TopPost & { connector: string };

export type InstagramAccountSummary = {
  account_id: string;
  account_name: string | null;
  views: number | null;
  reach: number | null;
  followers_count: number | null;
  profile_views: number | null;
  accounts_engaged: number | null;
  total_interactions: number | null;
  views_previous: number | null;
  reach_previous: number | null;
  views_from_posts_fallback: boolean;
  note?: string;
};

export type InstagramFullReport = {
  report_id: string;
  range: WindsorRange;
  generated_at: string;
  accounts: unknown[];
  account_summary: InstagramAccountSummary[];
  audience: unknown[];
  posts: PostRow[];
  posts_count: number;
  analytics: ReturnType<typeof buildPostAnalytics>;
};


const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

function safeAvg(values: number[]): number {
  if (!values.length) return 0;
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

function extractHashtags(caption: string | null): string[] {
  if (!caption) return [];
  const found = caption.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  return found.map((h) => h.toLowerCase());
}

function extractMentions(caption: string | null): string[] {
  if (!caption) return [];
  const found = caption.match(/@[\p{L}\p{N}_.]+/gu) ?? [];
  return found.map((h) => h.toLowerCase());
}

export function buildPostAnalytics(posts: PostRow[]) {
  const totals = posts.reduce(
    (acc, p) => {
      acc.likes += p.likes;
      acc.comments += p.comments;
      acc.shares += p.shares;
      acc.saved += p.saved;
      acc.reach += p.reach;
      acc.views += p.views;
      acc.engagement += p.engagement;
      return acc;
    },
    { likes: 0, comments: 0, shares: 0, saved: 0, reach: 0, views: 0, engagement: 0 },
  );

  const engagementRates = posts
    .filter((p) => p.reach > 0)
    .map((p) => (p.engagement / p.reach) * 100);

  // Por formato (IMAGE / VIDEO / REEL / CAROUSEL_ALBUM …)
  const byFormatMap = new Map<string, PostRow[]>();
  for (const p of posts) {
    const key = (p.media_type ?? "UNKNOWN").toUpperCase();
    byFormatMap.set(key, [...(byFormatMap.get(key) ?? []), p]);
  }
  const by_format = Array.from(byFormatMap.entries()).map(([media_type, list]) => ({
    media_type,
    posts: list.length,
    avg_engagement: safeAvg(list.map((p) => p.engagement)),
    avg_reach: safeAvg(list.map((p) => p.reach)),
    avg_views: safeAvg(list.map((p) => p.views)),
    avg_saved: safeAvg(list.map((p) => p.saved)),
    avg_engagement_rate: safeAvg(
      list.filter((p) => p.reach > 0).map((p) => (p.engagement / p.reach) * 100),
    ),
  }));

  // Por dia da semana e por hora (UTC do timestamp retornado pela API)
  const byWeekday = new Map<number, PostRow[]>();
  const byHour = new Map<number, PostRow[]>();
  for (const p of posts) {
    if (!p.timestamp) continue;
    const d = new Date(p.timestamp);
    if (Number.isNaN(d.getTime())) continue;
    const wd = d.getUTCDay();
    const hr = d.getUTCHours();
    byWeekday.set(wd, [...(byWeekday.get(wd) ?? []), p]);
    byHour.set(hr, [...(byHour.get(hr) ?? []), p]);
  }
  const by_weekday = Array.from(byWeekday.entries())
    .sort(([a], [b]) => a - b)
    .map(([wd, list]) => ({
      weekday: WEEKDAYS[wd],
      posts: list.length,
      avg_engagement: safeAvg(list.map((p) => p.engagement)),
      avg_reach: safeAvg(list.map((p) => p.reach)),
    }));
  const by_hour_utc = Array.from(byHour.entries())
    .sort(([a], [b]) => a - b)
    .map(([hr, list]) => ({
      hour_utc: hr,
      posts: list.length,
      avg_engagement: safeAvg(list.map((p) => p.engagement)),
      avg_reach: safeAvg(list.map((p) => p.reach)),
    }));

  // Hashtags e menções
  const hashtagMap = new Map<string, { uses: number; engagement: number }>();
  const mentionMap = new Map<string, number>();
  for (const p of posts) {
    for (const h of new Set(extractHashtags(p.caption))) {
      const cur = hashtagMap.get(h) ?? { uses: 0, engagement: 0 };
      hashtagMap.set(h, { uses: cur.uses + 1, engagement: cur.engagement + p.engagement });
    }
    for (const m of new Set(extractMentions(p.caption))) {
      mentionMap.set(m, (mentionMap.get(m) ?? 0) + 1);
    }
  }
  const top_hashtags = Array.from(hashtagMap.entries())
    .map(([hashtag, v]) => ({
      hashtag,
      uses: v.uses,
      avg_engagement: Number((v.engagement / v.uses).toFixed(2)),
    }))
    .sort((a, b) => b.avg_engagement - a.avg_engagement)
    .slice(0, 40);
  const top_mentions = Array.from(mentionMap.entries())
    .map(([mention, uses]) => ({ mention, uses }))
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 20);

  const captionLengths = posts
    .filter((p) => p.caption)
    .map((p) => (p.caption as string).length);

  return {
    totals,
    averages: {
      likes: safeAvg(posts.map((p) => p.likes)),
      comments: safeAvg(posts.map((p) => p.comments)),
      shares: safeAvg(posts.map((p) => p.shares)),
      saved: safeAvg(posts.map((p) => p.saved)),
      reach: safeAvg(posts.map((p) => p.reach)),
      views: safeAvg(posts.map((p) => p.views)),
      engagement: safeAvg(posts.map((p) => p.engagement)),
      engagement_rate_pct: safeAvg(engagementRates),
      caption_length: safeAvg(captionLengths),
    },
    by_format,
    by_weekday,
    by_hour_utc,
    top_hashtags,
    top_mentions,
  };
}

export async function getInstagramFullReportImpl(
  callerId: string,
  reportId: string,
  range: WindsorRange = { datePreset: "last_30d" },
  postLimit = 200,
  includeMetrics = true,
  includeAudience = true,
): Promise<InstagramFullReport> {
  const [metrics, audience, posts] = await Promise.all([
    includeMetrics
      ? getReportMetricsImpl(callerId, reportId, range).catch(() => [])
      : Promise.resolve([]),
    includeAudience
      ? getInstagramAudienceImpl(callerId, reportId).catch(() => [])
      : Promise.resolve([]),
    getTopInstagramPostsImpl(callerId, reportId, range, postLimit, "engagement").catch(
      () => [] as PostRow[],
    ),
  ]);

  const igAccounts = (metrics as Array<{ connector: string }>).filter(
    (g) => g.connector === "instagram" || g.connector === "instagram_business",
  );

  return {
    report_id: reportId,
    range,
    generated_at: new Date().toISOString(),
    accounts: igAccounts,
    audience: audience as unknown[],
    posts,
    posts_count: posts.length,
    analytics: buildPostAnalytics(posts),
  };
}
