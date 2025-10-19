const validators = require('../../../src/utils/validators');

describe('validators', () => {
  test('isValidEmail returns true for valid email', () => {
    expect(validators.isValidEmail('test@example.com')).toBe(true);
  });

  test('isValidEmail returns false for invalid email', () => {
    expect(validators.isValidEmail('bad-email')).toBe(false);
  });

  test('isValidPhone accepts numeric phone', () => {
    expect(validators.isValidPhone('+62 812-3456-789')).toBe(true);
  });

  test('isValidSKU accepts valid SKU', () => {
    expect(validators.isValidSKU('ABC123')).toBe(true);
  });

  test('isValidSKU rejects invalid SKU', () => {
    expect(validators.isValidSKU('ab')).toBe(false);
  });

  test('isValidDate accepts valid date', () => {
    expect(validators.isValidDate('2025-10-18')).toBe(true);
  });

  test('isValidRole validates roles', () => {
    expect(validators.isValidRole('admin')).toBe(true);
    expect(validators.isValidRole('unknown')).toBe(false);
  });

  test('isValidStatus validates known types', () => {
    expect(validators.isValidStatus('pending', 'wo')).toBe(true);
    expect(validators.isValidStatus('unknown', 'wo')).toBe(false);
  });
});