import type { Expert } from '@/lib/types';

// 전문가당 유튜브 링크 최대 개수
export const MAX_YOUTUBE_LINKS = 3;

// 입력(배열/문자열/그 외)을 정제: 문자열만, trim, 빈값·중복 제거, 최대 max 개.
export function normalizeYoutubeUrls(input: unknown, max = MAX_YOUTUBE_LINKS): string[] {
  const arr = Array.isArray(input) ? input : input == null ? [] : [input];
  const out: string[] = [];
  for (const v of arr) {
    if (typeof v !== 'string') continue;
    const s = v.trim();
    if (!s || out.includes(s)) continue;
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

// 표시용 링크 목록: youtube_urls 우선, 비어있으면 레거시 youtube_url 폴백.
export function expertVideoUrls(
  expert: Pick<Expert, 'youtube_urls' | 'youtube_url'>,
  max = MAX_YOUTUBE_LINKS,
): string[] {
  const list = expert.youtube_urls?.length
    ? expert.youtube_urls
    : expert.youtube_url
      ? [expert.youtube_url]
      : [];
  return normalizeYoutubeUrls(list, max);
}
