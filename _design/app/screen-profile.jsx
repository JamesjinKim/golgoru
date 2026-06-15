/* global React, GolgoroTokens, SHADOW_CARD, SHADOW_FRAP, Pill, TopBar,
   IconPhone, IconPlay, IconStar, IconCheck, IconShield */

// Screen 3 — Expert profile detail
function ScreenProfile({ expert, onBack }) {
  const G = GolgoroTokens;
  const [calling, setCalling] = React.useState(false);
  const [seconds, setSeconds] = React.useState(0);

  React.useEffect(() => {
    if (!calling) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [calling]);

  const e = expert || {
    name: '김도윤', initial: '김', specialty: '형사 전문',
    region: '서울 강남', years: 12, rating: 4.9, cases: 312,
    phone: '010-2456-7821', live: true,
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  return (
    <div data-screen-label="03 Expert Profile" style={{
      display: 'flex', flexDirection: 'column', minHeight: '100%',
      background: G.cream, color: G.textBlack, position: 'relative',
    }}>
      <TopBar
        title="전문가 프로필"
        onBack={onBack}
        right={
          <button aria-label="공유" style={{
            background:'none',border:'none',cursor:'pointer',color:G.textSoft,
            fontSize:13, fontWeight:700, letterSpacing:'-0.16px',
          }}>공유</button>
        }
      />

      <div style={{ flex: 1, paddingBottom: 120 }}>
        {/* Hero card — dark green like Starbucks PDP */}
        <div style={{
          background: G.houseGreen, color: '#fff',
          padding: '24px 20px 28px', position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%',
              background: `linear-gradient(135deg, ${G.greenAccent}, ${G.gold})`,
              color: '#fff', fontSize: 30, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              letterSpacing: '-0.16px',
              boxShadow: '0 8px 16px rgba(0,0,0,0.25), inset 0 0 0 3px rgba(255,255,255,0.15)',
              flex: '0 0 auto',
            }}>{e.initial}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.4px' }}>
                {e.name} 변호사
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 4, letterSpacing: '-0.16px' }}>
                {e.specialty} · 경력 {e.years}년
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: '-0.16px' }}>
                {e.region}
              </div>
            </div>
          </div>

          {/* Membership pill */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(203,162,88,0.18)', color: G.gold,
              padding: '5px 12px', borderRadius: 50,
              fontSize: 11, fontWeight: 800, letterSpacing: '-0.16px',
            }}>
              <IconShield size={11} sw={2.4}/> 골고루 인증 멤버
            </span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(255,255,255,0.10)', color: '#fff',
              padding: '5px 12px', borderRadius: 50,
              fontSize: 11, fontWeight: 700, letterSpacing: '-0.16px',
            }}>
              <IconStar size={10}/> {e.rating} · 상담 {e.cases}건
            </span>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12, marginTop: 14, paddingTop: 12,
            borderTop: '1px solid rgba(255,255,255,0.12)',
          }}>
            {[
              { v: '38초', l: '평균 응답' },
              { v: '92%', l: '승소율' },
              { v: '24h', l: '대응 시간' },
            ].map(s => (
              <div key={s.l}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-0.16px' }}>{s.v}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {/* Specialties */}
          <Section title="전문 분야">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {['성범죄', '사기', '폭행', '명예훼손', '무고'].map(t => (
                <span key={t} style={{
                  background: '#fff', color: G.textBlack,
                  border: `1px solid ${G.hairline}`,
                  padding: '6px 12px', borderRadius: 50,
                  fontSize: 12, fontWeight: 700, letterSpacing: '-0.16px',
                  boxShadow: SHADOW_CARD,
                }}>{t}</span>
              ))}
            </div>
          </Section>

          {/* YouTube preview */}
          <Section title="유튜브 인터뷰">
            <button style={{
              all: 'unset', cursor: 'pointer', display: 'block', width: '100%',
              borderRadius: 12, overflow: 'hidden',
              background: `linear-gradient(135deg, ${G.greenUplift}, ${G.houseGreen})`,
              boxShadow: SHADOW_CARD, position: 'relative', height: 160,
            }}>
              {/* Decorative chevron pattern */}
              <svg width="100%" height="100%" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice"
                   style={{ position: 'absolute', inset: 0, opacity: 0.18 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <circle key={i} cx={40 + i * 50} cy={80 + Math.sin(i) * 30} r={20 + i * 4} fill="none" stroke="#fff" strokeWidth="1"/>
                ))}
              </svg>
              <div style={{
                position:'absolute', inset: 0, display:'flex', flexDirection:'column',
                justifyContent: 'flex-end', padding: 16,
              }}>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 800, letterSpacing: '-0.16px' }}>
                  성추행 무고, 첫 24시간이 가장 중요한 이유
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4, letterSpacing: '-0.16px' }}>
                  김도윤 변호사 · 4분 12초 · 조회 18.4만회
                </div>
              </div>
              <div style={{
                position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)',
                width:56, height:56, borderRadius:'50%', background:'#fff',
                display:'flex', alignItems:'center', justifyContent:'center',
                color: G.red, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              }}>
                <IconPlay size={22}/>
              </div>
            </button>
          </Section>

          {/* What you get */}
          <Section title="첫 통화에 받는 것">
            <div style={{
              background: '#fff', borderRadius: 12, boxShadow: SHADOW_CARD,
              padding: 4, display: 'flex', flexDirection: 'column',
            }}>
              {[
                '15분 응급 진단 (무료)',
                '즉시 취해야 할 행동 3가지',
                '예상 절차 · 비용 · 기간 안내',
              ].map((row, i, arr) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px',
                  borderBottom: i < arr.length - 1 ? `1px solid ${G.hairline}` : 'none',
                }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: G.greenLight, color: G.starbucksGreen,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flex: '0 0 auto',
                  }}>
                    <IconCheck size={12} sw={3}/>
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.16px' }}>{row}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* Review snippet — compact */}
          <Section title="최근 후기">
            <div style={{ background:'#fff', borderRadius: 12, padding: 14, boxShadow: SHADOW_CARD }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ display: 'flex', gap: 2, color: G.gold }}>
                  {Array.from({length:5}).map((_,i)=> <IconStar key={i} size={11}/>)}
                </div>
                <span style={{ fontSize: 11, color: G.textSoft, letterSpacing: '-0.16px' }}>익명 · 2주 전</span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: G.textBlack, letterSpacing: '-0.16px' }}>
                "새벽 2시 통화에도 침착하게 첫 단계를 알려주셔서 큰 도움이 됐어요."
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* Sticky CTA bar */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '12px 20px 28px',
        background: `linear-gradient(180deg, rgba(242,240,235,0) 0%, ${G.cream} 30%)`,
      }}>
        <button
          onClick={() => setCalling(c => !c)}
          style={{
            width: '100%',
            background: calling ? G.red : G.greenAccent,
            color: '#fff', border: 'none',
            borderRadius: 50, padding: '16px 20px',
            fontSize: 16, fontWeight: 800, letterSpacing: '-0.16px',
            fontFamily: 'inherit', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            boxShadow: SHADOW_FRAP,
            transition: 'all 0.2s ease',
          }}
          onPointerDown={ev => ev.currentTarget.style.transform = 'scale(0.97)'}
          onPointerUp={ev => ev.currentTarget.style.transform = 'scale(1)'}
          onPointerLeave={ev => ev.currentTarget.style.transform = 'scale(1)'}
        >
          {calling
            ? <><span style={{ width:8,height:8,borderRadius:2,background:'#fff' }}/> 통화 종료 · {fmt(seconds)}</>
            : <><IconPhone size={18} sw={2.4}/> 📞 지금 전화하기 · 무료</>
          }
        </button>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: G.textSoft, letterSpacing: '-0.16px' }}>
          {calling ? '안전하게 암호화된 통화입니다' : '연결 후 첫 15분은 무료입니다'}
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  const G = GolgoroTokens;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 12, fontWeight: 800, color: G.textSoft,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
      }}>{title}</div>
      {children}
    </div>
  );
}

window.ScreenProfile = ScreenProfile;
