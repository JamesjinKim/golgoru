// 브라우저 녹음 Blob(webm/opus, mp4/aac 등 코덱 무관) → 16kHz mono 16-bit PCM WAV.
// Gemini는 webm을 보장 지원하지 않으므로 클라이언트에서 WAV로 통일한다. (설계 §2.4)

const TARGET_SAMPLE_RATE = 16000;

type AudioCtor = typeof AudioContext;

function getAudioContextCtor(): AudioCtor {
  const w = window as unknown as {
    AudioContext?: AudioCtor;
    webkitAudioContext?: AudioCtor;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) throw new Error('이 브라우저는 오디오 처리를 지원하지 않습니다.');
  return Ctor;
}

async function decode(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const Ctor = getAudioContextCtor();
  const ctx = new Ctor();
  try {
    // Safari는 Promise 미지원 시그니처가 있어 Promise로 래핑
    return await new Promise<AudioBuffer>((resolve, reject) => {
      ctx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
    });
  } finally {
    void ctx.close();
  }
}

// 임의 샘플레이트/채널 → 16kHz mono 다운믹스+리샘플
async function resampleToMono16k(buffer: AudioBuffer): Promise<Float32Array> {
  const frameCount = Math.ceil(buffer.duration * TARGET_SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, frameCount, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0);
}

function floatToWav(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2; // 16-bit
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM fmt chunk size
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, 1, true); // channels = mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
  view.setUint16(32, bytesPerSample, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += bytesPerSample;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export async function encodeWav(blob: Blob): Promise<Blob> {
  const decoded = await decode(blob);
  const mono16k = await resampleToMono16k(decoded);
  return floatToWav(mono16k, TARGET_SAMPLE_RATE);
}
