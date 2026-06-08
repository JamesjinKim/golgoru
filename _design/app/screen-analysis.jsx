/* global React, GolgoroTokens, SHADOW_CARD, Pill, TopBar,
   IconClipboard, IconBolt, IconCheck, IconPhone, IconArrowRight, IconStar */

// Screen 2 — AI analysis + recommended experts
function ScreenAnalysis({ situation, onBack, onSelectExpert }) {
  const G = GolgoroTokens;
  const [analyzing, setAnalyzing] = React.useState(true);
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    const steps = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 1100),
      setTimeout(() => { setStep(3); setAnalyzing(false); }, 1700),
    ];
    return () => steps.forEach(clearTimeout);
  }, []);

  // Simple keyword routing demo
  const route = React.useMemo(() => {
    const s = situation || '';
    if (/해고|회사|노동|월급|임금/.test(s)) return { area: '노동 사건', subtype: '부당해고', key: 'labor' };
    if (/사고|교통|차|충돌/.test(s)) return { area: '교통 사건', subtype: '교통사고 (가해/피해)', key: 'traffic' };
    if (/이혼|가족|양육/.test(s)) return { area: '가사 사건', subtype: '협의이혼', key: 'family' };
    return { area: '형사 사건', subtype: '성추행 무고', key: 'criminal' };
  }, [situation]);

  const experts = [
    { id: 'kim', name: '김도윤', initial: '김', specialty: '형사 전문', region: '서울 강남', years: 12, rating: 4.9, cases: 312, phone: '010-2456-7821', live: true,  badge: '지금 통화 가능', color: G.greenAccent },
    { id: 'park', name: '박서영', initial: '박', specialty: '형사 전문', region: '경기 성남', years: 9,  rating: 4.8, cases: 218, phone: '010-3781-2245', live: false, badge: '15분 내 회신', color: G.gold },
    { id: 'lee', name: '이지훈', initial: '이', specialty: '형사·민사', region: '서울 마포', years: 15, rating: 4.7, cases: 487, phone: '010-9012-3344', live: true,  badge: '지금 통화 가능', color: G.greenAccent },
  ];

  return (
    <div data-screen-label="02 Analysis" style={{
      display: 'flex', flexDirection: 'column', minHeight: '100%',
      background: G.cream, color: G.textBlack,
    }}>
      <TopBar
        title="전문가 매칭"
        onBack={onBack}
        right={<span style={{ fontSize: 12, color: G.textSoft, fontWeight: 600 }}>2 / 3</span>}
      />

      <div style={{ flex: 1, padding: '14px 20px 24px' }}>
        {/* Situation summary card */}
        <div style={{
          background: G.houseGreen, color: '#fff',
          borderRadius: 16, padding: 16, marginBottom: 16,
          boxShadow: SHADOW_CARD,
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
          }}>
            <IconClipboard size={12} sw={2.4}/> 상황 파악
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 10, fontStyle: 'italic', lineHeight: 1.4 }}>
            "{situation}"
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              background: 'rgba(255,255,255,0.12)', color: '#fff',
              padding: '6px 12px', borderRadius: 50,
              fontSize: 13, fontWeight: 700, letterSpacing: '-0.16px',
            }}>{route.area}</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.16px' }}>
              · {route.subtype}
            </span>
          </div>

          {/* Mini analysis steps */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { ok: step >= 1, label: '키워드 추출' },
              { ok: step >= 2, label: '관할/유형 분류' },
              { ok: step >= 3, label: '전문가 3인 매칭' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: s.ok ? '#fff' : 'rgba(255,255,255,0.45)' }}>
                <span style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: s.ok ? G.greenLight : 'rgba(255,255,255,0.12)',
                  color: G.starbucksGreen, display: 'inline-flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}>
                  {s.ok ? <IconCheck size={10} sw={3}/> : <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }}/>}
                </span>
                <span style={{ letterSpacing: '-0.16px' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', marginBottom: 12,
          background: G.greenLight, borderRadius: 12,
          color: G.starbucksGreen, fontSize: 13, fontWeight: 700,
          letterSpacing: '-0.16px',
        }}>
          <IconBolt size={14} sw={2.2}/>
          지금 바로 연결 가능 · 평균 응답 38초
        </div>

        {/* Experts list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {analyzing
            ? Array.from({ length: 2 }).map((_, i) => <ExpertSkeleton key={i}/>)
            : experts.map((e, i) => (
              <ExpertCard key={e.id} expert={e} highlight={i === 0} onSelect={() => onSelectExpert(e)}/>
            ))
          }
        </div>

        {!analyzing && (
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              color: G.greenAccent, letterSpacing: '-0.16px',
              textDecoration: 'underline', textUnderlineOffset: 3,
            }}>다른 전문가 더 보기</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ExpertSkeleton() {
  const G = GolgoroTokens;
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: 16,
      boxShadow: SHADOW_CARD, display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: G.ceramic, animation: 'gg-shimmer 1.2s linear infinite' }}/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 14, width: '60%', borderRadius: 4, background: G.ceramic, animation: 'gg-shimmer 1.2s linear infinite' }}/>
        <div style={{ height: 10, width: '40%', borderRadius: 4, background: G.ceramic, animation: 'gg-shimmer 1.2s linear infinite' }}/>
      </div>
      <style>{`
        @keyframes gg-shimmer {
          0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

function ExpertCard({ expert, highlight, onSelect }) {
  const G = GolgoroTokens;
  return (
    <div style={{
      background: '#fff', borderRadius: 16,
      boxShadow: highlight
        ? '0 0 0 1.5px ' + G.greenAccent + ', 0 0 0.5px 0 rgba(0,0,0,0.14), 0 4px 8px 0 rgba(0,0,0,0.08)'
        : SHADOW_CARD,
      overflow: 'hidden',
      animation: 'gg-fade 0.4s ease',
    }}>
      <button onClick={onSelect} style={{
        all: 'unset', cursor: 'pointer', width: '100%', boxSizing: 'border-box',
        padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: `linear-gradient(135deg, ${G.greenAccent}, ${G.starbucksGreen})`,
            color: '#fff', fontSize: 18, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            letterSpacing: '-0.16px', flex: '0 0 auto',
          }}>{expert.initial}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: G.textBlack, letterSpacing: '-0.16px' }}>
                {expert.name} 변호사
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, color: G.gold, fontWeight: 700 }}>
                <IconStar size={11}/> {expert.rating}
              </span>
            </div>
            <div style={{ fontSize: 12, color: G.textSoft, marginTop: 2, letterSpacing: '-0.16px' }}>
              {expert.specialty} · {expert.region} · 경력 {expert.years}년
            </div>
          </div>
        </div>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: expert.live ? G.greenLight : 'rgba(203,162,88,0.15)',
            color: expert.live ? G.starbucksGreen : '#7a5a1a',
            padding: '5px 10px', borderRadius: 50,
            fontSize: 11, fontWeight: 800, letterSpacing: '-0.16px',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: expert.live ? G.greenAccent : G.gold,
              boxShadow: expert.live ? '0 0 0 3px rgba(0,117,74,0.18)' : 'none',
              animation: expert.live ? 'gg-blink 1.4s ease-in-out infinite' : 'none',
            }}/>
            {expert.badge}
          </span>
          <span style={{ fontSize: 11, color: G.textSoft, letterSpacing: '-0.16px' }}>
            상담 {expert.cases}건
          </span>
        </div>

        {/* CTA row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
          <div style={{ flex: 1, fontSize: 13, color: G.textBlack, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '-0.16px' }}>
            📞 {expert.phone}
          </div>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: expert.live ? G.greenAccent : '#fff',
            color: expert.live ? '#fff' : G.greenAccent,
            border: `1.5px solid ${G.greenAccent}`,
            padding: '8px 14px', borderRadius: 50,
            fontSize: 12, fontWeight: 800, letterSpacing: '-0.16px',
          }}>
            <IconPhone size={12} sw={2.4}/> 전화 연결
          </span>
        </div>
      </button>

      <style>{`
        @keyframes gg-fade {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gg-blink {
          0%, 100% { opacity: 1; } 50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

window.ScreenAnalysis = ScreenAnalysis;
