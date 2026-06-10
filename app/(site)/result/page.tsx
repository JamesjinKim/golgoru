'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ExpertCard from '@/components/ExpertCard';
import UrgencyBadge from '@/components/UrgencyBadge';
import { ClassifyResult, Expert } from '@/lib/types';
import { G, SHADOW_CARD } from '@/lib/tokens';

const ANALYSIS_STEPS = ['키워드 추출', '관할/유형 분류', '전문가 3인 추천'];

export default function ResultPage() {
  const router = useRouter();
  const [classify, setClassify] = useState<ClassifyResult | null>(null);
  const [sosQuery, setSosQuery] = useState('');
  const [experts, setExperts] = useState<Expert[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  // 추천 조회 → state + sessionStorage 캐시에 저장 (delay: 분석 애니메이션과 동기화용)
  const loadExperts = (result: ClassifyResult, delay = 0) => {
    fetch(`/api/experts?vertical=${result.vertical}&urgency=${result.urgency}&category=${result.category_code ?? ''}`)
      .then(r => r.json())
      .then(data => {
        const list: Expert[] = data.experts ?? [];
        setTimeout(() => {
          setExperts(list);
          sessionStorage.setItem('recommendedExperts', JSON.stringify(list));
          setLoading(false);
        }, delay);
      })
      .catch(() => { setError('전문가 정보를 불러오지 못했습니다.'); setLoading(false); });
  };

  // "새로 추천 받기" — 명시적 재셔플 (뒤로가기와 구분)
  const reshuffle = () => {
    if (!classify) return;
    sessionStorage.removeItem('recommendedExperts');
    setError('');
    setLoading(true);
    setExperts([]);
    loadExperts(classify, 200);
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('classifyResult');
    const query = sessionStorage.getItem('sosQuery') ?? '';
    if (!stored) { router.replace('/'); return; }
    const result: ClassifyResult = JSON.parse(stored);
    setClassify(result);
    setSosQuery(query);

    // 캐시된 추천이 있으면 복원 → 뒤로가기 시 같은 3인 유지 (재호출·재셔플 없음)
    const cached = sessionStorage.getItem('recommendedExperts');
    if (cached) {
      try {
        setExperts(JSON.parse(cached));
        setStep(3);
        setLoading(false);
        return;
      } catch { /* 파싱 실패 시 아래로 falls through → 새로 조회 */ }
    }

    const t1 = setTimeout(() => setStep(1), 300);
    const t2 = setTimeout(() => setStep(2), 700);
    const t3 = setTimeout(() => setStep(3), 1100);
    loadExperts(result, 1300);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: G.cream }}>
      <header style={{
        paddingTop: 54, paddingBottom: 8,
        paddingLeft: 20, paddingRight: 20,
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: `1px solid ${G.hairline}`,
        background: G.cream, position: 'sticky', top: 0, zIndex: 10,
      }}>
        <Link href="/" style={{ color: G.textSoft, textDecoration: 'none', display: 'flex', alignItems: 'center', padding: 4 }}>
          <ChevronLeftIcon />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SosIconSmall />
          <span style={{ fontSize: 15, fontWeight: 800, color: G.starbucksGreen, letterSpacing: '-0.16px' }}>골고루</span>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: G.textSoft, fontWeight: 600 }}>2 / 3</span>
      </header>

      <main style={{ flex: 1, padding: '14px 20px 100px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {classify && (
          <div style={{ background: G.houseGreen, color: '#fff', borderRadius: 16, padding: 16, boxShadow: SHADOW_CARD }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase' as const,
              color: 'rgba(255,255,255,0.55)', marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <ClipboardIcon /> 상황 파악
            </div>
            {sosQuery && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', lineHeight: 1.4, marginBottom: 10, letterSpacing: '-0.16px' }}>
                &ldquo;{sosQuery}&rdquo;
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 14 }}>
              <span style={{
                background: 'rgba(255,255,255,0.12)', color: '#fff',
                padding: '5px 12px', borderRadius: 50,
                fontSize: 13, fontWeight: 700, letterSpacing: '-0.16px',
              }}>{classify.category}</span>
              <UrgencyBadge urgency={classify.urgency} />
            </div>
            <div style={{ paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {ANALYSIS_STEPS.map((label, i) => {
                const done = step > i;
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 12, letterSpacing: '-0.16px',
                    color: done ? '#fff' : 'rgba(255,255,255,0.35)',
                    transition: 'color 0.3s ease',
                  }}>
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                      background: done ? G.greenLight : 'rgba(255,255,255,0.1)',
                      color: G.starbucksGreen,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.3s ease',
                    }}>
                      {done
                        ? <CheckIcon />
                        : <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }}/>
                      }
                    </span>
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && experts.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', background: G.greenLight, borderRadius: 12,
            color: G.starbucksGreen, fontSize: 13, fontWeight: 700, letterSpacing: '-0.16px',
          }}>
            <BoltIcon /> 지금 바로 연결 가능 · 평균 응답 38초
          </div>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <span style={{
              fontSize: 12, fontWeight: 700, color: G.textSoft,
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            }}>추천 전문가</span>
            {!loading && !error && experts.length > 0 && (
              <button
                onClick={reshuffle}
                style={{
                  marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: G.greenAccent, fontSize: 12, fontWeight: 700, letterSpacing: '-0.16px', padding: 4,
                }}
              >
                <RefreshIcon /> 새로 추천
              </button>
            )}
          </div>

          {error && (
            <p style={{ color: G.red, fontSize: 13, textAlign: 'center', padding: '16px 0', letterSpacing: '-0.16px' }}>
              {error}
            </p>
          )}

          {loading && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SkeletonCard /><SkeletonCard />
            </div>
          )}

          {!loading && !error && experts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: G.textSoft }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>😔</div>
              <p style={{ fontSize: 14, letterSpacing: '-0.16px' }}>현재 연결 가능한 전문가가 없습니다.</p>
              <p style={{ fontSize: 12, marginTop: 4, letterSpacing: '-0.16px' }}>잠시 후 다시 시도해주세요.</p>
            </div>
          )}

          {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {experts.map((expert, i) => (
                <ExpertCard key={expert.id} expert={expert} highlight={i === 0} />
              ))}
            </div>
          )}
        </div>
      </main>

      <div style={{
        position: 'fixed', left: 0, right: 0, bottom: 0,
        maxWidth: 430, margin: '0 auto',
        padding: '12px 20px 28px',
        background: `linear-gradient(180deg, rgba(242,240,235,0) 0%, ${G.cream} 35%)`,
      }}>
        <Link href="/" style={{
          display: 'block', width: '100%', padding: '13px 0',
          textAlign: 'center' as const, color: G.textSoft,
          border: `1px solid ${G.hairline}`, borderRadius: 50,
          fontSize: 14, fontWeight: 600, letterSpacing: '-0.16px',
          textDecoration: 'none', boxSizing: 'border-box' as const, background: '#fff',
        }}>
          다시 검색하기
        </Link>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 16, boxShadow: SHADOW_CARD, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: G.ceramic, animation: 'gg-shimmer 1.2s linear infinite' }}/>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 14, width: '55%', borderRadius: 4, background: G.ceramic, animation: 'gg-shimmer 1.2s linear infinite' }}/>
          <div style={{ height: 10, width: '38%', borderRadius: 4, background: G.ceramic, animation: 'gg-shimmer 1.2s linear infinite' }}/>
        </div>
      </div>
      <div style={{ height: 24, width: '45%', borderRadius: 50, background: G.ceramic, animation: 'gg-shimmer 1.2s linear infinite' }}/>
      <div style={{ height: 38, borderRadius: 50, background: G.ceramic, animation: 'gg-shimmer 1.2s linear infinite' }}/>
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
function SosIconSmall() {
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="13" fill="#c82014"/>
      <text x="14" y="16.5" textAnchor="middle" fontSize="8.5" fontWeight="800" fontFamily="'NanumSquareNeo', 'Inter', sans-serif" fill="#fff" letterSpacing="0.3">SOS</text>
    </svg>
  );
}
function ClipboardIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
      <rect x="8" y="2" width="8" height="4" rx="1"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  );
}
