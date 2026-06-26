import sharp from 'sharp';

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function validateUpload(file: { type: string; size: number }): string | null {
  if (!ALLOWED.has(file.type)) return '지원하지 않는 형식입니다 (jpg/png/webp).';
  if (file.size > MAX_UPLOAD_BYTES) return '파일이 너무 큽니다 (최대 2MB).';
  return null;
}

// 중앙 정사각 크롭 → 256×256 → webp
export async function toSquareWebp(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .resize(256, 256, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82 })
    .toBuffer();
}
