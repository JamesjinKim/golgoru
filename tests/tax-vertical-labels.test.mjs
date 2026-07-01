import assert from 'node:assert/strict';

const {
  VERTICAL_CALL_LABEL,
  VERTICAL_LABEL,
  expertCallLabel,
  expertTitle,
} = await import('../lib/constants.ts');
const {
  buildTemplateCsv,
  parseExpertsCsv,
} = await import('../lib/admin/csv.ts');

assert.equal(VERTICAL_LABEL.tax, '세무사');
assert.equal(VERTICAL_CALL_LABEL.tax, '세무사에게 전화하기');
assert.equal(expertTitle({ vertical: 'tax' }), '세무사');
assert.equal(expertCallLabel({ vertical: 'tax' }), '세무사에게 전화하기');

const validTaxCsv = `이름,직업,자격,전문분야,지역,전화번호,경력,소개,유튜브URL,평일시작,평일종료,주말상담,야간상담,상담상태,카테고리코드,노출
박세무,세무,세무사,기장|세무조사,서울 영등포,02-2345-6789,9,세무 상담 9년,,09:00,18:00,N,N,가능,TAX-01|TAX-03,Y
`;
const validResult = parseExpertsCsv(validTaxCsv);
assert.equal(validResult.errors.length, 0);
assert.equal(validResult.valid[0].vertical, 'tax');
assert.equal(validResult.valid[0].license, '세무사');

const accountantCsv = validTaxCsv.replace('박세무,세무,세무사', '박회계,회계사,회계사');
const accountantResult = parseExpertsCsv(accountantCsv);
assert.equal(accountantResult.valid.length, 0);
assert.equal(accountantResult.errors.length, 1);
assert.equal(accountantResult.errors[0].field, '직업');

const legacyTaxAccountingCsv = validTaxCsv.replace('박세무,세무,세무사', '박세무,세무·회계,세무사');
const legacyTaxAccountingResult = parseExpertsCsv(legacyTaxAccountingCsv);
assert.equal(legacyTaxAccountingResult.valid.length, 0);
assert.equal(legacyTaxAccountingResult.errors.length, 1);
assert.equal(legacyTaxAccountingResult.errors[0].field, '직업');

const template = buildTemplateCsv();
assert.match(template, /박세무,세무,세무사/);
assert.doesNotMatch(template, /세무·회계|회계사|회계감사/);
