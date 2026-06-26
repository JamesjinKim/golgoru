import Link from 'next/link';
import { notFound } from 'next/navigation';
import CallButton from '@/components/CallButton';
import ExpertAvatar from '@/components/ExpertAvatar';
import { getExpertRepository } from '@/lib/experts/repository';
import { G, SHADOW_CARD } from '@/lib/tokens';
import { STATUS_LABEL, expertTitle, categoryChipLabel } from '@/lib/constants';

// 'HH:mm[:ss]' → 'HH:mm'
function hhmm(t?: string | null): string | null {
  return t ? t.slice(0, 5) : null;
}

export default async function ExpertPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; back?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const inFlow = sp.from === 'result'; // 추천 플로우 진입 vs 단독(미니홈피) 진입
  // 뒤로가기: 추천 플로우 → /result, 둘러보기 진입 → back(둘러보기 필터 보존), 그 외 → 홈
  const fromBrowse = !inFlow && !!sp.back && sp.back.startsWith('/experts');
  const backHref = inFlow ? '/result' : (sp.back && sp.back.startsWith('/') ? sp.back : '/');
  // 화살표 옆 라벨 = 돌아갈 곳 (현재 페이지명이 아니라 목적지를 표기)
  const backLabel = inFlow ? '추천 결과' : fromBrowse ? '전문가 목록' : '홈';
  const repo = getExpertRepository();
  const [expert, categories] = await Promise.all([
    repo.findById(id),
    repo.findCategoriesByExpertId(id),
  ]);
  if (!expert) notFound();

  // 전문 분야 = 등록 카테고리(추천 매칭과 동일 소스). 미등록 전문가는 specialties 폴백
  const hasCats = categories.length > 0;
  const fieldChips = hasCats ? categories.map((c) => categoryChipLabel(c.label)) : expert.specialties;
  const primaryField = fieldChips[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: G.cream }}>
      <header style={{
        paddingTop: 54, paddingBottom: 8,
        paddingLeft: 20, paddingRight: 20,
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${G.hairline}`, background: G.cream,
      }}>
        <Link href={backHref} style={{ color: G.textBlack, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: 4, margin: -4 }}>
          <ChevronLeftIcon />
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.16px' }}>{backLabel}</span>
        </Link>
        {inFlow && <span style={{ marginLeft: 'auto', fontSize: 12, color: G.textSoft, fontWeight: 600 }}>3 / 3</span>}
      </header>

      <div style={{ flex: 1, paddingBottom: 120 }}>
        {/* 히어로 카드 */}
        <div style={{ background: G.houseGreen, color: '#fff', padding: '24px 20px 28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <ExpertAvatar expert={expert} size={76} gradientTo="gold" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>
                {expert.name} {expertTitle(expert)}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, letterSpacing: '-0.16px' }}>
                {primaryField ? `${primaryField} 전문 · ` : ''}경력 {expert.experience_years}년
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.16px' }}>
                {expert.region}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' as const }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(203,162,88,0.18)', color: G.gold,
              padding: '5px 12px', borderRadius: 50,
              fontSize: 11, fontWeight: 800, letterSpacing: '-0.16px',
            }}>
              <ShieldIcon /> 골고루 인증 멤버
            </span>
            {expert.status === 'available' && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.10)', color: '#fff',
                padding: '5px 12px', borderRadius: 50,
                fontSize: 11, fontWeight: 700, letterSpacing: '-0.16px',
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'gg-blink 1.4s ease-in-out infinite' }}/>
                {STATUS_LABEL[expert.status]}
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: '20px 20px 0' }}>
          {/* 전문 분야 = 등록 카테고리(추천 매칭과 동일 소스). 미등록 시 specialties 폴백 */}
          <Section title="전문 분야">
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
              {fieldChips.map(s => (
                <span key={s} style={{
                  background: '#fff', color: G.textBlack,
                  border: `1px solid ${G.hairline}`,
                  padding: '6px 12px', borderRadius: 50,
                  fontSize: 12, fontWeight: 700, letterSpacing: '-0.16px',
                  boxShadow: SHADOW_CARD,
                }}>{s}</span>
              ))}
            </div>
          </Section>

          {/* 세부 강점 = 자유 텍스트 specialties (카테고리가 있을 때만 보조로 노출) */}
          {hasCats && expert.specialties.length > 0 && (
            <Section title="세부 강점">
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                {expert.specialties.map(s => (
                  <span key={s} style={{
                    background: 'transparent', color: G.textSoft,
                    border: `1px solid ${G.hairline}`,
                    padding: '5px 11px', borderRadius: 50,
                    fontSize: 12, fontWeight: 600, letterSpacing: '-0.16px',
                  }}>{s}</span>
                ))}
              </div>
            </Section>
          )}

          {/* 연락처 */}
          <Section title="연락처">
            <a href={`tel:${expert.phone}`} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '13px 16px', background: '#fff', borderRadius: 12,
              boxShadow: SHADOW_CARD, textDecoration: 'none', color: G.textBlack,
              fontSize: 15, fontWeight: 700, letterSpacing: '-0.16px',
            }}>
              <PhoneRawIcon />
              {expert.phone}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: G.greenAccent, fontWeight: 700 }}>탭하면 연결</span>
            </a>
          </Section>

          {/* 운영 시간 */}
          <Section title="상담 가능 시간">
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: SHADOW_CARD, padding: 4, display: 'flex', flexDirection: 'column' }}>
              {[
                ['평일', hhmm(expert.weekday_start) && hhmm(expert.weekday_end)
                  ? `${hhmm(expert.weekday_start)} ~ ${hhmm(expert.weekday_end)}`
                  : '운영시간 미등록'],
                ['주말 상담', expert.weekend_available ? '가능' : '불가'],
                ['야간 상담', expert.night_available ? '가능' : '불가'],
                ['현재 상태', STATUS_LABEL[expert.status]],
              ].map(([label, value], i, arr) => (
                <div key={label} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 14px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${G.hairline}` : 'none',
                }}>
                  <span style={{ fontSize: 13, color: G.textSoft, letterSpacing: '-0.16px' }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: G.textBlack, letterSpacing: '-0.16px' }}>{value}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* 소개 */}
          {expert.bio && (
            <Section title="소개">
              <div style={{ background: '#fff', borderRadius: 12, padding: 14, boxShadow: SHADOW_CARD }}>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: G.textBlack, letterSpacing: '-0.16px' }}>
                  {expert.bio}
                </p>
              </div>
            </Section>
          )}

          {/* 첫 통화 안내 */}
          <Section title="첫 통화에 받는 것">
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: SHADOW_CARD, padding: 4, display: 'flex', flexDirection: 'column' }}>
              {['15분 응급 진단 (무료)', '즉시 취해야 할 행동 3가지', '예상 절차 · 비용 · 기간 안내'].map((row, i, arr) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${G.hairline}` : 'none',
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: G.greenLight, color: G.starbucksGreen,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <CheckIcon />
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.16px' }}>{row}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* 유튜브 */}
          {expert.youtube_url && (
            <Section title="유튜브 인터뷰">
              <YoutubeThumbnail url={expert.youtube_url} name={expert.name} />
            </Section>
          )}
        </div>
      </div>

      {/* 고정 CTA 바 */}
      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        maxWidth: 430, margin: '0 auto',
        padding: '12px 20px 32px',
        background: `linear-gradient(180deg, rgba(242,240,235,0) 0%, ${G.cream} 30%)`,
      }}>
        <CallButton phone={expert.phone} name={expert.name} vertical={expert.vertical} license={expert.license} />
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: G.textSoft, letterSpacing: '-0.16px' }}>
          연결 후 첫 15분은 무료입니다
        </div>
      </div>
    </div>
  );
}

function getYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([^&?/\s]{11})/,
    /youtube\.com\/embed\/([^&?/\s]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

function YoutubeThumbnail({ url, name }: { url: string; name: string }) {
  const videoId = getYoutubeId(url);
  const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block', width: '100%', borderRadius: 12,
        overflow: 'hidden', boxShadow: SHADOW_CARD,
        position: 'relative', height: 160, textDecoration: 'none',
        background: `linear-gradient(135deg, ${G.greenUplift}, ${G.houseGreen})`,
      }}
    >
      {/* 실제 유튜브 썸네일 이미지 */}
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb}
          alt={`${name} 유튜브 영상`}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', display: 'block',
          }}
        />
      )}

      {/* 썸네일 없을 때 장식 패턴 */}
      {!thumb && (
        <svg width="100%" height="100%" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice"
             style={{ position: 'absolute', inset: 0, opacity: 0.18 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <circle key={i} cx={40 + i * 50} cy={80 + Math.sin(i) * 30} r={20 + i * 4}
                    fill="none" stroke="#fff" strokeWidth="1"/>
          ))}
        </svg>
      )}

      {/* 어두운 그라디언트 오버레이 (텍스트 가독성) */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)',
      }}/>

      {/* 중앙 재생 버튼 */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 52, height: 52, borderRadius: '50%',
        background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: G.red, boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <polygon points="6 4 20 12 6 20 6 4"/>
        </svg>
      </div>

      {/* 하단 텍스트 */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 14px',
      }}>
        <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, letterSpacing: '-0.16px' }}>
          {name} — 유튜브 영상 보기
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2, letterSpacing: '-0.16px' }}>
          탭하면 유튜브로 이동합니다
        </div>
      </div>
    </a>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 12, fontWeight: 800, color: G.textSoft,
        letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: 10,
      }}>{title}</div>
      {children}
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function PhoneRawIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={G.greenAccent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
