import { useCallback, useEffect, useRef, useState } from 'react';

const MAX_DURATION_MS = 60_000; // 설계 §2.2: 최대 60초 캡

// MediaRecorder 출력 코덱은 브라우저별 상이(Chrome webm/opus, Safari mp4).
// 어느 쪽이든 클라이언트에서 WAV로 재인코딩하므로 여기선 지원되는 것 아무거나.
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return undefined; // 브라우저 기본값 사용
}

function isRecorderSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof MediaRecorder !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

interface UseAudioRecorder {
  isSupported: boolean;
  isRecording: boolean;
  error: string;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<Blob | null>;
}

export function useAudioRecorder(): UseAudioRecorder {
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsSupported(isRecorderSupported());
  }, []);

  const cleanup = useCallback(() => {
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    setError('');
    if (!isRecorderSupported()) {
      setError('이 브라우저는 음성 녹음을 지원하지 않습니다. 텍스트로 입력해주세요.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = pickMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);

      autoStopRef.current = setTimeout(() => {
        if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      }, MAX_DURATION_MS);
      return true;
    } catch (err: unknown) {
      cleanup();
      setIsRecording(false);
      const name = (err as { name?: string })?.name;
      setError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? '마이크 권한이 필요합니다. 텍스트로 입력해주세요.'
          : '마이크를 사용할 수 없습니다. 텍스트로 입력해주세요.',
      );
      return false;
    }
  }, [cleanup]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setIsRecording(false);
        cleanup();
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm';
        const blob = chunksRef.current.length
          ? new Blob(chunksRef.current, { type })
          : null;
        setIsRecording(false);
        cleanup();
        resolve(blob);
      };
      recorder.stop();
    });
  }, [cleanup]);

  return { isSupported, isRecording, error, startRecording, stopRecording };
}
