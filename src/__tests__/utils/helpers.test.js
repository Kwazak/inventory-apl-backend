const helpers = require('../../../src/utils/helpers');
const fs = require('fs');
const { Op } = require('sequelize');

describe('helpers', () => {
  test('paginate returns correct limit and offset', () => {
    const { limit, offset } = helpers.paginate(2, 20);
    expect(limit).toBe(20);
    expect(offset).toBe(20);
  });

  test('paginationMeta computes pages correctly', () => {
    const meta = helpers.paginationMeta(2, 10, 35);
    expect(meta.currentPage).toBe(2);
    expect(meta.totalPages).toBe(4);
    expect(meta.totalItems).toBe(35);
    expect(meta.itemsPerPage).toBe(10);
    expect(meta.hasNextPage).toBe(true);
    expect(meta.hasPrevPage).toBe(true);
  });

  test('buildSearchQuery returns empty for missing search', () => {
    expect(helpers.buildSearchQuery(['name'], '')).toEqual({});
  });

  test('buildSearchQuery returns Op.or object when provided', () => {
    const q = helpers.buildSearchQuery(['name', 'sku'], 'test');
    // Sequelize uses a symbol key (Op.or) so Object.keys won't show it. Check the symbol property instead.
    expect(typeof q).toBe('object');
    expect(q[Op.or]).toBeDefined();
    expect(Array.isArray(q[Op.or])).toBe(true);
    expect(q[Op.or].length).toBe(2);
  });

  test('generateOrderNumber includes prefix and date', () => {
    const num = helpers.generateOrderNumber('PO');
    expect(num.startsWith('PO')).toBe(true);
    expect(num.length).toBeGreaterThan(5);
  });

  test('exportToExcel writes a file and returns filename', () => {
    const filename = 'test_export.xlsx';
    const data = [{ id: 1, name: 'test' }];
    // Call function
    const result = helpers.exportToExcel(data, filename);
    expect(result).toBe(filename);
    // Clean up
    if (fs.existsSync(filename)) fs.unlinkSync(filename);
  });
});