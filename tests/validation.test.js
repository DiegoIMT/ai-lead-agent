/**
 * Basic unit tests for validation and scoring services
 * Run with: npm test
 */

const validationService = require('../services/validationService');
const scoringService = require('../services/scoringService');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗  ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ── Validation Tests ──────────────────────────────────────────────────────────
console.log('\n📋 Validation Service\n');

test('accepts valid lead data', () => {
  const { data, errors } = validationService.validateAndNormalize({
    fullName: 'John Doe',
    email: 'john@company.com',
    company: 'Acme Corp',
  });
  assert(errors.length === 0, 'Should have no errors');
  assert(data.fullName === 'John Doe', 'Name should be normalized');
});

test('rejects missing required fields', () => {
  const { errors } = validationService.validateAndNormalize({ fullName: 'Jane' });
  assert(errors.length > 0, 'Should have errors');
  assert(errors.some((e) => e.includes('email')), 'Should flag email as required');
});

test('normalizes email to lowercase', () => {
  const { data } = validationService.validateAndNormalize({
    fullName: 'Jane Smith',
    email: 'JANE@COMPANY.COM',
    company: 'Test',
  });
  assert(data.email === 'jane@company.com', 'Email should be lowercase');
});

test('detects corporate email correctly', () => {
  const { data: corp } = validationService.validateAndNormalize({
    fullName: 'A B', email: 'a@mycompany.com', company: 'X',
  });
  assert(corp.isCorporateEmail === true, 'mycompany.com should be corporate');

  const { data: generic } = validationService.validateAndNormalize({
    fullName: 'A B', email: 'a@gmail.com', company: 'X',
  });
  assert(generic.isCorporateEmail === false, 'gmail.com should not be corporate');
});

test('rejects invalid email format', () => {
  const { errors } = validationService.validateAndNormalize({
    fullName: 'A B', email: 'not-an-email', company: 'X',
  });
  assert(errors.some((e) => e.toLowerCase().includes('email')), 'Should flag invalid email');
});

test('title-cases the full name', () => {
  const { data } = validationService.validateAndNormalize({
    fullName: 'john michael doe', email: 'j@corp.com', company: 'X',
  });
  assert(data.fullName === 'John Michael Doe', 'Name should be title-cased');
});

test('trims whitespace from fields', () => {
  const { data } = validationService.validateAndNormalize({
    fullName: '  Alice  ', email: 'alice@corp.com', company: '  Acme  ',
  });
  assert(data.fullName === 'Alice', 'Name should be trimmed');
  assert(data.company === 'Acme', 'Company should be trimmed');
});

test('extracts first name from full name', () => {
  const { data } = validationService.validateAndNormalize({
    fullName: 'Carlos Mendoza', email: 'c@co.com', company: 'X',
  });
  assert(data.firstName === 'Carlos', 'Should extract first name');
});

// ── Scoring Tests ─────────────────────────────────────────────────────────────
console.log('\n📊 Scoring Service\n');

function mockLead(overrides = {}) {
  return {
    fullName: 'Test User',
    email: 'test@corp.com',
    emailDomain: 'corp.com',
    isCorporateEmail: true,
    company: 'TestCo',
    jobTitle: '',
    companySize: '1-10',
    country: 'Other',
    website: '',
    industry: 'Other',
    comments: '',
    ...overrides,
  };
}

function mockEnrichment(overrides = {}) {
  return {
    isB2B: false,
    companyTier: 'startup',
    leadTemperature: 'cold',
    seniority: 'Individual Contributor',
    seniorityScore: 10,
    isDecisionMaker: false,
    hasDetailedComments: false,
    tags: [],
    ...overrides,
  };
}

test('scores higher for enterprise company', () => {
  const enterprise = scoringService.score(
    mockLead({ companySize: '5000+' }),
    mockEnrichment()
  );
  const small = scoringService.score(
    mockLead({ companySize: '1-10' }),
    mockEnrichment()
  );
  assert(enterprise.score > small.score, 'Enterprise should score higher than small company');
});

test('scores higher for C-level vs individual contributor', () => {
  const ceo = scoringService.score(mockLead(), mockEnrichment({ seniority: 'C-Level' }));
  const ic = scoringService.score(mockLead(), mockEnrichment({ seniority: 'Individual Contributor' }));
  assert(ceo.score > ic.score, 'C-Level should score higher');
});

test('hot lead scores higher than cold lead', () => {
  const hot = scoringService.score(mockLead(), mockEnrichment({ leadTemperature: 'hot' }));
  const cold = scoringService.score(mockLead(), mockEnrichment({ leadTemperature: 'cold' }));
  assert(hot.score > cold.score, 'Hot lead should score higher');
});

test('assigns High category for score >= 75', () => {
  const result = scoringService.score(
    mockLead({ companySize: '5000+', country: 'United States', isCorporateEmail: true }),
    mockEnrichment({
      seniority: 'C-Level',
      isB2B: true,
      leadTemperature: 'hot',
      hasDetailedComments: true,
      isDecisionMaker: true,
    })
  );
  assert(result.category === 'High', `Expected High, got ${result.category} (score: ${result.score})`);
});

test('assigns Low category for minimal lead', () => {
  const result = scoringService.score(
    mockLead({ isCorporateEmail: false }),
    mockEnrichment()
  );
  assert(result.category === 'Low', `Expected Low, got ${result.category} (score: ${result.score})`);
});

test('score never exceeds 100', () => {
  const result = scoringService.score(
    mockLead({ companySize: '5000+', country: 'United States', isCorporateEmail: true, website: 'https://co.com' }),
    mockEnrichment({
      seniority: 'C-Level',
      isB2B: true,
      leadTemperature: 'hot',
      hasDetailedComments: true,
      isDecisionMaker: true,
    })
  );
  assert(result.score <= 100, `Score ${result.score} exceeds 100`);
});

test('returns reasons array with at least one entry for qualified lead', () => {
  const result = scoringService.score(
    mockLead({ companySize: '51-200', isCorporateEmail: true }),
    mockEnrichment({ seniority: 'Director/VP', isB2B: true })
  );
  assert(result.reasons.length > 0, 'Should have scoring reasons');
});

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.log('❌ Some tests failed\n');
  process.exit(1);
} else {
  console.log('✅ All tests passed\n');
}
