/* global React, GolgoroTokens, SHADOW_CARD, Pill, TopBar,
   IconMic, IconSOS, IconArrowRight, IconShield */

// Screen 1 — SOS input
function ScreenSOS({ onAnalyze }) {
  const G = GolgoroTokens;
  const [text, setText] = React.useState('');
  const [recording, setRecording] = React.useState(false);
  const [tick, setTick] = React.useState(0);

  // pulse waveform when recording
  React.useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setTick(t => t + 1), 90);
    return () => clearInterval(id);
  }, [recording]);

  const examples = [
    { tag: '형사', text: '성추행 오해 받았어요' },
    { tag: '노동', text: '갑자기 해고 통보 받았어요' },
    { tag: '교통', text: '교통사고 방금 났어요' },
  ];

  const submit = () => onAnalyze(text || '성추행 오해 받았어요');
  const canSubmit = text.trim().length > 0;

  return (
    <div data-screen-label="01 SOS Input" style={{
      display: 'flex', flexDirection: 'column', minHeight: '100%',
      background: G.cream, color: G.textBlack,
    }}>
      <TopBar
        left={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <IconSOS size={26}/>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.16px', color: G.starbucksGreen }}>골고루</span>
          </div>
        }
        right={
          <button aria-label="profile" style={{
            width: 32, height: 32, borderRadius: '50%',
            border: `1px solid ${G.hairline}`, background: '#fff',
            display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
            color: G.textSoft, fontWeight: 700, fontSize: 13,
          }}>김</button>
        }
      />

      <div style={{ flex: 1, padding: '16px 20px 24px' }}>
        {/* Headline */}
        <div style={{ marginBottom: 14 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: G.greenLight, color: G.starbucksGreen,
            padding: '4px 10px', borderRadius: 50,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
            textTransform: 'uppercase', marginBottom: 12,
          }}>
            <IconShield size={12} sw={2.4}/> 24시간 응급 연결
          </div>
          <h1 style={{
            margin: 0, fontSize: 26, lineHeight: 1.25, fontWeight: 800,
            color: G.starbucksGreen, letterSpacing: '-0.4px',
          }}>지금 어떤 상황인가요?</h1>
          <p style={{
            margin: '8px 0 0', fontSize: 14, lineHeight: 1.5,
            color: G.textSoft, letterSpacing: '-0.16px',
          }}>말하거나 입력하면, 적합한 전문가를 바로 연결해 드려요.</p>
        </div>

        {/* Input card */}
        <div style={{
          background: '#fff', borderRadius: 16, boxShadow: SHADOW_CARD,
          padding: 16, marginBottom: 16,
        }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="예: 회사에서 갑자기 해고 통보를 받았는데 어떻게 해야 할지 모르겠어요…"
            rows={4}
            style={{
              width: '100%', border: 'none', outline: 'none',
              fontFamily: 'inherit', fontSize: 15, lineHeight: 1.55,
              color: G.textBlack, letterSpacing: '-0.16px',
              resize: 'none', background: 'transparent',
            }}
          />
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginTop: 8, paddingTop: 10, borderTop: `1px solid ${G.hairline}`,
          }}>
            <span style={{ fontSize: 12, color: G.textSoft, letterSpacing: '-0.16px' }}>
              {text.length === 0 ? '비공개 · 암호화 전송' : `${text.length}자`}
            </span>
            <button
              onClick={submit}
              disabled={!canSubmit}
              aria-label="분석"
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: canSubmit ? G.greenAccent : G.ceramic,
                color: canSubmit ? '#fff' : G.textSoft,
                border: 'none', cursor: canSubmit ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}>
              <IconArrowRight size={16} sw={2.4}/>
            </button>
          </div>
        </div>

        {/* Mic button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <button
            onClick={() => setRecording(r => !r)}
            style={{
              position: 'relative', width: 84, height: 84, borderRadius: '50%',
              background: recording ? G.red : G.greenAccent,
              border: 'none', cursor: 'pointer',
              boxShadow: recording
                ? '0 0 0 8px rgba(200,32,20,0.15), 0 8px 16px rgba(0,0,0,0.18)'
                : '0 0 6px rgba(0,0,0,0.24), 0 8px 12px rgba(0,98,65,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', transition: 'all 0.25s ease',
            }}>
            {recording && (
              <span aria-hidden="true" style={{
                position: 'absolute', inset: -4, borderRadius: '50%',
                border: '2px solid rgba(200,32,20,0.35)',
                animation: 'gg-pulse 1.4s ease-out infinite',
              }}/>
            )}
            <IconMic size={32} sw={2.2}/>
          </button>
        </div>
        <div style={{ textAlign: 'center', marginTop: -8, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: G.textBlack, letterSpacing: '-0.16px' }}>
            {recording ? '듣고 있어요…' : '🎤 말하기'}
          </div>
          {recording && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 8, height: 20, alignItems: 'center' }}>
              {Array.from({ length: 18 }).map((_, i) => {
                const h = 4 + Math.abs(Math.sin((tick + i) * 0.6)) * 16;
                return <span key={i} style={{
                  display: 'inline-block', width: 3, height: h,
                  background: G.greenAccent, borderRadius: 2,
                  transition: 'height 0.1s ease',
                }}/>;
              })}
            </div>
          )}
        </div>

        {/* Examples */}
        <div>
          <div style={{
            fontSize: 12, fontWeight: 700, color: G.textSoft,
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10,
          }}>예시 상황</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {examples.map(ex => (
              <button
                key={ex.text}
                onClick={() => setText(ex.text)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  background: '#fff', border: 'none', borderRadius: 12,
                  padding: '12px 14px', cursor: 'pointer',
                  boxShadow: SHADOW_CARD, textAlign: 'left',
                  fontFamily: 'inherit', color: G.textBlack,
                  transition: 'transform 0.2s ease',
                }}
                onPointerDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
                onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
                onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <span style={{
                  display:'inline-flex',alignItems:'center',justifyContent:'center',
                  minWidth: 38, height: 24, padding: '0 8px',
                  background: G.greenLight, color: G.starbucksGreen,
                  borderRadius: 6, fontSize: 11, fontWeight: 800,
                  letterSpacing: '-0.16px',
                }}>{ex.tag}</span>
                <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.16px', flex: 1 }}>
                  {ex.text}
                </span>
                <IconArrowRight size={14} stroke={G.textSoft}/>
              </button>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p style={{
          marginTop: 20, fontSize: 11, color: G.textSoft, lineHeight: 1.5,
          textAlign: 'center', letterSpacing: '-0.16px',
        }}>
          긴급 범죄·생명 위협 시에는 <span style={{ color: G.red, fontWeight: 700 }}>112</span>·<span style={{ color: G.red, fontWeight: 700 }}>119</span>로 먼저 신고해 주세요.
        </p>
      </div>

      <style>{`
        @keyframes gg-pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.45); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

window.ScreenSOS = ScreenSOS;
