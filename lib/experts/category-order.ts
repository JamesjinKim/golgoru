// 카테고리 표시 순서 (골고루팀 지정). DB는 code순으로 조회되지만, UI(둘러보기·어드민)는
// 의미 그룹 순서로 보이는 게 자연스러워 여기서 재정렬한다. 코드·전문가 연결은 그대로.
//
// 변호사: 부동산·임대차, 세금·행정·의료를 인접 배치하고 기타를 맨 뒤로.
// 코드 기준으로 순서를 지정(라벨은 바뀔 수 있으므로 코드가 안정적).
// 여기 없는 코드(다른 vertical, 미지정 신규)는 순위 뒤로 밀되 기존 code순(안정 정렬)을 유지.

const LAWYER_CATEGORY_ORDER: string[] = [
  'LAW-01', // 형사
  'LAW-02', // 부동산
  'LAW-11', // 임대차
  'LAW-03', // 계약·손해배상
  'LAW-04', // 이혼·상속
  'LAW-05', // 노동·기업
  'LAW-06', // 세금
  'LAW-10', // 행정
  'LAW-12', // 의료
  'LAW-07', // IT·금융·지식재산
  'LAW-08', // 민사
  'LAW-09', // 기타
];

const RANK: Record<string, number> = Object.fromEntries(
  LAWYER_CATEGORY_ORDER.map((code, i) => [code, i]),
);

// level-1 카테고리 목록을 지정 순서로 정렬. 지정에 없는 코드는 뒤로(원래 순서 유지).
// 이미 code순으로 들어온 배열을 안정 정렬하므로, 미지정 코드끼리는 code순이 보존된다.
// 둘러보기 칩처럼 level-1만 있는 목록에 사용.
export function sortCategoriesForDisplay<T extends { code: string }>(cats: T[]): T[] {
  const rankOf = (code: string) => (code in RANK ? RANK[code] : LAWYER_CATEGORY_ORDER.length);
  return [...cats].sort((a, b) => rankOf(a.code) - rankOf(b.code));
}

// level-1/2가 섞인 목록(어드민)을 계층 유지하며 정렬: level-1을 지정 순서로 놓고,
// 각 level-1 바로 뒤에 그 자식(level-2)을 code순으로 붙인다. 부모-자식 묶음이 깨지지 않는다.
export function sortCategoriesHierarchical<
  T extends { code: string; parent_code: string | null; level: number },
>(cats: T[]): T[] {
  const parents = sortCategoriesForDisplay(cats.filter((c) => c.level === 1));
  const childrenOf = (code: string) =>
    cats.filter((c) => c.level === 2 && c.parent_code === code)
      .sort((a, b) => a.code.localeCompare(b.code));
  const out: T[] = [];
  for (const p of parents) {
    out.push(p);
    out.push(...childrenOf(p.code));
  }
  // 부모 없는 고아 level-2(있을 리 없지만 방어)는 맨 뒤에 code순으로
  const placed = new Set(out.map((c) => c.code));
  out.push(...cats.filter((c) => !placed.has(c.code)).sort((a, b) => a.code.localeCompare(b.code)));
  return out;
}
