import type { Metadata } from 'next';
import Link from 'next/link';
import { getExpertRepository } from '@/lib/experts/repository';
import { getExpertDataSource } from '@/lib/experts/data-source';
import { supabaseAdmin } from '@/lib/supabase';
import { VERTICAL_LABEL, VISIBLE_VERTICALS } from '@/lib/constants';
import { G } from '@/lib/tokens';
import type { Category, Vertical } from '@/lib/types';
import ExpertBrowseList from '@/components/ExpertBrowseList';

export const metadata: Metadata = {
  title: '전문가 둘러보기 · 골고루',
  description: '분야별 전문가를 둘러보고 미니홈피로 바로 추천받으세요.',
};

// UI 노출 직역만 (감정평가사 등 숨김 제외). 칩 목록·URL 검증 모두 이 배열 기준.
const VERTICALS: Vertical[] = VISIBLE_VERTICALS;

// 선택한 직역의 중분류(level 1) 카테고리 — 둘러보기 2차 필터용. mock 모드/오류 시 빈 배열
async function loadCategories(vertical: Vertical | null): Promise<Category[]> {
  if (!vertical || getExpertDataSource() !== 'supabase') return [];
  try {
    const { data } = await supabaseAdmin
      .from('categories')
      .select('code,parent_code,vertical,level,label,is_active')
      .eq('vertical', vertical)
      .eq('is_active', true)
      .eq('level', 1)
      .order('code', { ascending: true });
    return (data ?? []) as Category[];
  } catch {
    return [];
  }
}

export default async function ExpertsBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ vertical?: string; category?: string; all?: string }>;
}) {
  const sp = await searchParams;
  const vertical = (VERTICALS.includes(sp.vertical as Vertical) ? sp.vertical : null) as Vertical | null;
  const category = vertical && sp.category ? sp.category : null; // 카테고리는 직역 선택 시에만 유효
  // 선택 전(쿼리 없이 진입)에는 리스트를 조회하지 않음. '전체'(all=1) 또는 직역 선택 시에만 조회
  const selected = !!vertical || sp.all === '1';

  const categories = await loadCategories(vertical);
  const { experts, nextCursor } = selected
    ? await getExpertRepository().listBrowse({ vertical, categoryCode: category })
    : { experts: [], nextCursor: null };

  // 미니홈피에서 '뒤로가기' 시 돌아올 현재 둘러보기 URL (필터 보존)
  const backParams = new URLSearchParams();
  if (vertical) {
    backParams.set('vertical', vertical);
    if (category) backParams.set('category', category);
  } else {
    backParams.set('all', '1');
  }
  const backHref = `/experts?${backParams.toString()}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: G.cream }}>
      <header style={{
        paddingTop: 54, paddingBottom: 12, paddingLeft: 20, paddingRight: 20,
        borderBottom: `1px solid ${G.hairline}`, background: G.cream,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Link href="/" aria-label="홈으로" style={{ display: 'flex', color: G.textSoft, textDecoration: 'none' }}>
            <BackIcon />
          </Link>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px', color: G.starbucksGreen }}>
            전문가 둘러보기
          </h1>
        </div>

        {/* 직역 필터 (전체 + 노출 직역) */}
        <ChipRow>
          <Chip href="/experts?all=1" label="전체" active={!vertical && sp.all === '1'} />
          {VERTICALS.map((v) => (
            <Chip key={v} href={`/experts?vertical=${v}`} label={VERTICAL_LABEL[v]} active={vertical === v} />
          ))}
        </ChipRow>

        {/* 카테고리 필터 (직역 선택 시 중분류) */}
        {vertical && categories.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <ChipRow>
              <Chip href={`/experts?vertical=${vertical}`} label="전체 분야" active={!category} small />
              {categories.map((c) => (
                <Chip
                  key={c.code}
                  href={`/experts?vertical=${vertical}&category=${c.code}`}
                  label={c.label}
                  active={category === c.code}
                  small
                />
              ))}
            </ChipRow>
          </div>
        )}
      </header>

      <main style={{ flex: 1, padding: '16px 20px 32px' }}>
        {/* 전문가 입점 모집 CTA — 상단 노출(스크롤 없이 바로 보이게) */}
        <Link href="/expert-apply" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', marginBottom: 16,
          padding: '14px 16px', borderRadius: 12,
          background: '#fff', border: `1.5px solid ${G.red}`,
          color: G.red, fontSize: 16, fontWeight: 800,
          letterSpacing: '-0.16px', cursor: 'pointer', fontFamily: 'inherit',
          textDecoration: 'none', boxSizing: 'border-box',
        }}>
          전문가이신가요? 골고루 입점 신청 →
        </Link>
        {selected ? (
          <ExpertBrowseList
            key={`${vertical ?? 'all'}|${category ?? 'all'}`}
            initialExperts={experts}
            initialCursor={nextCursor}
            vertical={vertical}
            category={category}
            backHref={backHref}
          />
        ) : (
          <div style={{
            textAlign: 'center', padding: '72px 24px', color: G.textSoft,
            fontSize: 14, lineHeight: 1.6, letterSpacing: '-0.16px',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👆</div>
            위에서 분야를 선택하면<br />전문가 목록을 보여드려요.
          </div>
        )}
      </main>
    </div>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {children}
    </div>
  );
}

function Chip({ href, label, active, small }: { href: string; label: string; active: boolean; small?: boolean }) {
  return (
    <Link
      href={href}
      style={{
        flexShrink: 0, textDecoration: 'none', whiteSpace: 'nowrap',
        padding: small ? '5px 12px' : '7px 14px',
        borderRadius: 50,
        fontSize: small ? 12 : 13, fontWeight: 700, letterSpacing: '-0.16px',
        background: active ? G.greenAccent : '#fff',
        color: active ? '#fff' : G.textSoft,
        border: `1px solid ${active ? G.greenAccent : G.hairline}`,
      }}
    >
      {label}
    </Link>
  );
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
