'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClassifyResult, Expert } from '@/lib/types';
import { useAudioRecorder } from '@/lib/audio/useAudioRecorder';
import { encodeWav } from '@/lib/audio/encodeWav';

const G = {
  starbucksGreen: '#006241',
  greenAccent:    '#00754A',
  greenLight:     '#d4e9e2',
  ceramic:        '#edebe9',
  red:            '#c82014',
  textBlack:      'rgba(0,0,0,0.87)',
  textSoft:       'rgba(0,0,0,0.58)',
  hairline:       '#e7e7e7',
};
const SHADOW_CARD = '0 0 0.5px 0 rgba(0,0,0,0.14), 0 1px 1px 0 rgba(0,0,0,0.24)';
const SHADOW_FRAP = '0 0 6px rgba(0,0,0,0.24), 0 8px 12px rgba(0,0,0,0.14)';

const EXAMPLES = [
  { tag: '형사', text: '성추행 오해 받았어요' },
  { tag: '노동', text: '갑자기 해고 통보 받았어요' },
  { tag: '교통', text: '교통사고 방금 났어요' },
  { tag: '의료', text: '갑자기 가슴통증이 있어요' },
  { tag: '세무', text: '갑자기 세무조사가 나왔어요' },
  { tag: '특허', text: '특허를 경쟁사가 무단 도용했어요' },
];

interface SosInputProps {
  signedIn: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export default function SosInput({ signedIn }: SosInputProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);      // 텍스트 분류 제출 중
  const [processing, setProcessing] = useState(false); // iOS 폴백: 받아쓰기 처리 중
  const [listening, setListening] = useState(false);   // Web Speech 실시간 인식 중
  const [tick, setTick] = useState(0);
  const [error, setError] = useState('');
  const [submitPressed, setSubmitPressed] = useState(false);
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const baseRef = useRef('');   // 인식 시작 시점의 기존 텍스트
  const finalRef = useRef('');  // 누적 확정 텍스트
  const cachedVoiceResultRef = useRef<{ query: string; result: ClassifyResult } | null>(null);

  const {
    isSupported: recorderSupported,
    isRecording,
    error: recError,
    startRecording,
    stopRecording,
  } = useAudioRecorder();

  const speechSupported = !!getSpeechRecognition();

  // 파형 애니메이션 타이머
  useEffect(() => {
    if (!listening && !isRecording) return;
    const id = setInterval(() => setTick(t => t + 1), 90);
    return () => clearInterval(id);
  }, [listening, isRecording]);

  useEffect(() => {
    return () => { try { recognitionRef.current?.stop(); } catch {} };
  }, []);

  const showLoginRequired = () => {
    setError('로그인 후 사용할 수 있습니다.');
  };

  const handleSubmit = async () => {
    const text = query.trim();
    if (!text || loading) return;
    if (!signedIn) {
      showLoginRequired();
      return;
    }
    setLoading(true);
    setError('');

    // 음성 인식 시 이미 계산된 분류 결과가 있고 사용자가 텍스트를 수정하지 않은 경우: 0초 즉시 이동
    if (cachedVoiceResultRef.current && cachedVoiceResultRef.current.query === text) {
      const result = cachedVoiceResultRef.current.result;
      sessionStorage.setItem('classifyResult', JSON.stringify(result));
      sessionStorage.setItem('sosQuery', text);
      router.push(`/result?q=${encodeURIComponent(text)}`);
      return;
    }

    try {
      const res = await fetch('/api/classify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: text }),
      });
      if (!res.ok) throw new Error('분류 실패');
      const data: ClassifyResult & { experts?: Expert[] } = await res.json();
      sessionStorage.setItem('classifyResult', JSON.stringify(data));
      sessionStorage.setItem('sosQuery', text);
      if (data.experts && data.experts.length > 0) {
        sessionStorage.setItem('recommendedExperts', JSON.stringify(data.experts));
      } else {
        sessionStorage.removeItem('recommendedExperts');
      }
      router.push(`/result?q=${encodeURIComponent(text)}`);
    } catch {
      setError('잠시 후 다시 시도해주세요.');
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── Web Speech: 실시간 받아쓰기 (지원 브라우저) ───────────────────
  const startSpeech = () => {
    const SR = getSpeechRecognition();
    if (!SR) return false;
    const rec = new SR();
    rec.lang = 'ko-KR';
    rec.interimResults = true;
    rec.continuous = true;
    rec.maxAlternatives = 1;
    baseRef.current = query ? query.trimEnd() + ' ' : '';
    finalRef.current = '';

    rec.onstart = () => { setListening(true); setError(''); };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = 0; i < e.results.length; i++) {
        const item = e.results[i];
        const t = (item[0]?.transcript || '').trim();
        if (!t) continue;
        if (item.isFinal) {
          if (!finalTranscript) {
            finalTranscript = t;
          } else if (t.startsWith(finalTranscript)) {
            // 안드로이드 크롬 버그: 새 final에 이전 final 문장이 통째로 포함되어 오는 경우
            finalTranscript = t;
          } else if (!finalTranscript.includes(t)) {
            finalTranscript = `${finalTranscript} ${t}`;
          }
        } else {
          // 안드로이드 크롬: interim에 이미 확정된 final 문장이 포함되어 오는 경우 제외
          if (finalTranscript && t.startsWith(finalTranscript)) {
            const rest = t.slice(finalTranscript.length).trim();
            if (rest) interimTranscript = rest;
          } else if (!finalTranscript.includes(t)) {
            interimTranscript = t;
          }
        }
      }
      finalRef.current = finalTranscript ? finalTranscript + ' ' : '';
      const combined = (baseRef.current + (finalTranscript ? finalTranscript + ' ' : '') + interimTranscript).trim();
      setQuery(combined);
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (e: any) => {
      if (e?.error === 'no-speech' || e?.error === 'aborted') return;
      setListening(false);
      setError('음성이 인식되지 않았습니다. 주변이 시끄러우면 텍스트로 입력해 주세요.');
    };
    rec.onend = () => {
      setListening(false);
      setQuery((baseRef.current + finalRef.current).trim());
      textareaRef.current?.focus();
    };

    recognitionRef.current = rec;
    try { rec.start(); return true; } catch { setListening(false); return false; }
  };

  // ── Gemini 고속 음성 분석 & 원스톱 즉시 전문가 매칭 ──────────────
  const stopAndTranscribe = async () => {
    setProcessing(true);
    const blob = await stopRecording();
    if (!blob) {
      setProcessing(false);
      setError('녹음이 저장되지 않았습니다. 다시 시도해주세요.');
      return;
    }
    try {
      const wav = await encodeWav(blob);
      const fd = new FormData();
      fd.append('audio', wav, 'voice.wav');
      const res = await fetch('/api/classify', { method: 'POST', body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || '음성 분석에 실패했습니다.');
      }
      const data: ClassifyResult & { experts?: Expert[] } = await res.json();
      const text = (data.transcript ?? '').trim();
      if (!text) {
        throw new Error('음성이 인식되지 않았습니다. 주변이 시끄러우면 텍스트로 입력해 주세요.');
      }

      // 텍스트창에 인식된 텍스트 즉시 표시
      setQuery(text);
      cachedVoiceResultRef.current = { query: text, result: data };

      // 세션 스토리지에 즉시 캐싱
      sessionStorage.setItem('classifyResult', JSON.stringify(data));
      sessionStorage.setItem('sosQuery', text);
      if (data.experts && data.experts.length > 0) {
        sessionStorage.setItem('recommendedExperts', JSON.stringify(data.experts));
      } else {
        sessionStorage.removeItem('recommendedExperts');
      }

      // 사용자가 텍스트창에서 변환된 내용을 확인한 후 부드럽게 결과 화면 이동
      setTimeout(() => {
        router.push(`/result?q=${encodeURIComponent(text)}`);
      }, 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : '음성 분석에 실패했습니다. 텍스트로 입력해주세요.');
      setProcessing(false);
    }
  };

  const handleVoice = async () => {
    if (!signedIn) {
      showLoginRequired();
      return;
    }
    setError('');
    if (listening) { try { recognitionRef.current?.stop(); } catch {} return; }
    if (isRecording) { await stopAndTranscribe(); return; }
    if (processing) return;

    // 모바일(안드로이드/iOS)에서는 브라우저 Web Speech API의 중복 누적 버그(crbug.com/862142)를 방지하고
    // 최고 품질의 한국어 인식을 위해 Gemini AI 음성 파이프라인(MediaRecorder)을 우선 사용
    const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile && recorderSupported) {
      await startRecording();
      return;
    }

    if (speechSupported) { startSpeech(); return; }
    if (recorderSupported) { await startRecording(); return; }
    setError('이 브라우저는 음성 입력을 지원하지 않습니다. 텍스트로 입력해주세요.');
  };

  const canSubmit = query.trim().length > 0;
  const busy = listening || isRecording || processing;
  const displayError = error || recError;
  const statusText = listening
    ? '🎤 실시간 받아쓰는 중…'
    : isRecording
      ? '🎤 듣는 중… (말씀 후 탭)'
      : processing
        ? '⚡ AI 분석 및 전문가 추천 중…'
        : query.length === 0
          ? '비공개 · 암호화 전송'
          : `${query.length}자`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Textarea 카드 */}
      <div style={{
        background: '#fff',
        borderRadius: 16,
        boxShadow: SHADOW_CARD,
        padding: 16,
        marginBottom: 16,
      }}>
        <textarea
          ref={textareaRef}
          value={query}
          onChange={e => { if (!busy) setQuery(e.target.value); }}
          onKeyDown={handleKeyDown}
          placeholder="상황을 말하거나 입력하세요"
          rows={4}
          maxLength={300}
          readOnly={busy}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            fontFamily: 'inherit',
            fontSize: 15,
            lineHeight: 1.55,
            color: G.textBlack,
            letterSpacing: '-0.16px',
            resize: 'none',
            background: 'transparent',
            boxSizing: 'border-box',
          }}
        />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 8,
          paddingTop: 10,
          borderTop: `1px solid ${G.hairline}`,
        }}>
          <span style={{ fontSize: 12, color: G.textSoft, letterSpacing: '-0.16px' }}>
            {statusText}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading || busy}
            aria-label="전문가 찾기"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: canSubmit && !loading && !busy ? G.greenAccent : G.ceramic,
              color: canSubmit && !loading && !busy ? '#fff' : G.textSoft,
              border: 'none',
              cursor: canSubmit && !loading && !busy ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            {loading ? <SpinnerIcon /> : <ArrowRightIcon />}
          </button>
        </div>
      </div>

      {displayError && (
        <p style={{ color: G.red, fontSize: 13, textAlign: 'center', marginBottom: 12, letterSpacing: '-0.16px' }}>
          {displayError}
        </p>
      )}

      {/* 마이크 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <button
          onClick={handleVoice}
          disabled={processing}
          aria-label={listening || isRecording ? '음성 입력 완료' : '탭하고 말하기'}
          style={{
            position: 'relative',
            width: 84,
            height: 84,
            borderRadius: '50%',
            background: listening || isRecording ? G.red : G.greenAccent,
            border: 'none',
            cursor: processing ? 'default' : 'pointer',
            opacity: processing ? 0.6 : 1,
            boxShadow: listening || isRecording
              ? '0 0 0 8px rgba(200,32,20,0.15), 0 8px 16px rgba(0,0,0,0.18)'
              : SHADOW_FRAP,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            transition: 'all 0.25s ease',
          }}
        >
          {(listening || isRecording) && (
            <span style={{
              position: 'absolute',
              inset: -4,
              borderRadius: '50%',
              border: '2px solid rgba(200,32,20,0.35)',
              animation: 'gg-pulse 1.4s ease-out infinite',
            }}/>
          )}
          {processing ? <SpinnerIcon /> : <MicIcon />}
        </button>
      </div>

      {/* 마이크 라벨 + 파형 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: G.textBlack, letterSpacing: '-0.16px' }}>
          {listening || isRecording ? '탭해서 완료' : processing ? '⚡ 추천 중…' : '🎤 탭하고 말하기'}
        </div>
        {(listening || isRecording) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginTop: 8, height: 20, alignItems: 'center' }}>
            {Array.from({ length: 18 }).map((_, i) => {
              const h = 4 + Math.abs(Math.sin((tick + i) * 0.6)) * 16;
              return (
                <span key={i} style={{
                  display: 'inline-block',
                  width: 3,
                  height: h,
                  background: G.greenAccent,
                  borderRadius: 2,
                  transition: 'height 0.1s ease',
                }}/>
              );
            })}
          </div>
        )}
      </div>

      {/* 예시 상황 칩 */}
      <div aria-hidden="true" style={{ display: 'none' }}>
        <div style={{
          fontSize: 12,
          fontWeight: 700,
          color: G.textSoft,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          marginBottom: 10,
        }}>예시 상황</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {EXAMPLES.map(ex => (
            <button
              key={ex.text}
              onClick={() => { setQuery(ex.text); textareaRef.current?.focus(); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '12px 14px',
                cursor: 'pointer',
                boxShadow: SHADOW_CARD,
                textAlign: 'left' as const,
                fontFamily: 'inherit',
                color: G.textBlack,
                transition: 'transform 0.2s ease',
              }}
              onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
              onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
              onPointerLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 38,
                height: 24,
                padding: '0 8px',
                background: G.greenLight,
                color: G.starbucksGreen,
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '-0.16px',
              }}>{ex.tag}</span>
              <span style={{ fontSize: 14, fontWeight: 500, letterSpacing: '-0.16px', flex: 1 }}>
                {ex.text}
              </span>
              <ArrowRightIcon size={14} color={G.textSoft} />
            </button>
          ))}
        </div>
      </div>

      {/* 하단 전송 버튼 (pill) */}
      <button
        aria-hidden="true"
        data-testid="bottom-submit-hidden"
        onClick={handleSubmit}
        disabled={!canSubmit || loading || busy}
        onPointerDown={() => setSubmitPressed(true)}
        onPointerUp={() => setSubmitPressed(false)}
        onPointerLeave={() => setSubmitPressed(false)}
        style={{
          marginTop: 24,
          width: '100%',
          background: canSubmit && !busy ? G.greenAccent : G.ceramic,
          color: canSubmit && !busy ? '#fff' : G.textSoft,
          border: 'none',
          borderRadius: 50,
          padding: '16px 20px',
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: '-0.16px',
          fontFamily: 'inherit',
          cursor: canSubmit && !busy ? 'pointer' : 'default',
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          boxShadow: canSubmit && !busy ? SHADOW_FRAP : 'none',
          transform: submitPressed && canSubmit ? 'scale(0.97)' : 'scale(1)',
          transition: 'all 0.2s ease',
        }}
      >
        {loading ? '전문가 찾는 중…' : '전문가 찾기'}
        {!loading && <ArrowRightIcon />}
      </button>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3"/>
      <path d="M5 10v2a7 7 0 0 0 14 0v-2"/>
      <line x1="12" y1="21" x2="12" y2="19"/>
    </svg>
  );
}

function ArrowRightIcon({ size = 16, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
            style={{ animation: 'spin 1s linear infinite', transformOrigin: 'center' }}/>
    </svg>
  );
}
