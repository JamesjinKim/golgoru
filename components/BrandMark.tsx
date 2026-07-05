// 골고루 SOS 브랜드 마크 — 빨간 원 안에 SOS 텍스트. 홈 헤더의 로고와 동일한 SVG.
// (public/icons PNG 아이콘은 전체 투명이라 화면 표시 불가하여 SVG로 통일.)
export default function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r="13" fill="#c82014" />
      <text x="14" y="16.5" textAnchor="middle" fontSize="8.5" fontWeight="800"
            fontFamily="'NanumSquareNeo', 'Inter', sans-serif" fill="#fff" letterSpacing="0.3">SOS</text>
    </svg>
  );
}
