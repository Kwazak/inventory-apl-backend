const { Op } = require('sequelize');

// Custom validation functions
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone) => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone);
};

const isValidSKU = (sku) => {
  // SKU should be alphanumeric, no spaces, length 3-20
  const skuRegex = /^[A-Za-z0-9]{3,20}$/;
  return skuRegex.test(sku);
};

const isPositiveNumber = (value) => {
  return typeof value === 'number' && value > 0;
};

const isNonNegativeNumber = (value) => {
  return typeof value === 'number' && value >= 0;
};

const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

const isValidRole = (role) => {
  const validRoles = ['admin', 'manager', 'staff'];
  return validRoles.includes(role);
};

const isValidStatus = (status, type) => {
  const statusMaps = {
    po: ['pending', 'approved', 'received', 'cancelled'],
    wo: ['pending', 'in_progress', 'completed', 'cancelled'],
    so: ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'],
    stock: ['in', 'out', 'adjust']
  };
  return statusMaps[type] && statusMaps[type].includes(status);
};

const isValidProductType = (type) => {
  const validTypes = ['sendal', 'boot'];
  return validTypes.includes(type);
};

const isValidCustomerType = (type) => {
  const validTypes = ['retail', 'wholesale'];
  return validTypes.includes(type);
};

const isValidItemType = (type) => {
  const validTypes = ['material', 'product'];
  return validTypes.includes(type);
};

// Async validation for uniqueness
const isUnique = async (model, field, value, excludeId = null) => {
  const whereClause = { [field]: value };
  if (excludeId) {
    whereClause.id = { [Op.ne]: excludeId };
  }
  const existing = await model.findOne({ where: whereClause });
  return !existing;
};

const isStockAvailable = async (materialId, requiredQuantity) => {
  const Material = require('../models/material');
  const material = await Material.findByPk(materialId);
  return material && material.stock >= requiredQuantity;
};

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidSKU,
  isPositiveNumber,
  isNonNegativeNumber,
  isValidDate,
  isValidRole,
  isValidStatus,
  isValidProductType,
  isValidCustomerType,
  isValidItemType,
  isUnique,
  isStockAvailable
};