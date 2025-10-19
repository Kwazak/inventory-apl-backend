-- ========================================
-- MINIMAL DATABASE FOR PROTOTYPE
-- Factory Inventory - Essential Only
-- Efisiensi Ekstrim untuk Demo/Testing
-- ========================================

CREATE DATABASE IF NOT EXISTS railway;
USE factory_inventory;

-- ========================================
-- 1. USERS (Simplified - No RBAC)
-- ========================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('admin', 'viewer', 'staff') DEFAULT 'staff',
    email VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========================================
-- 2. SUPPLIERS (Simplified)
-- ========================================
CREATE TABLE suppliers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    contact VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    status ENUM('active', 'inactive') DEFAULT 'active'
);

-- ========================================
-- 3. CUSTOMERS (Simplified)
-- ========================================
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    contact VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    address TEXT,
    type ENUM('retail', 'wholesale') DEFAULT 'retail',
    status ENUM('active', 'inactive') DEFAULT 'active'
);

-- ========================================
-- 4. RAW MATERIALS (Core Only)
-- ========================================
CREATE TABLE raw_materials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(20) NOT NULL,
    unit_price DECIMAL(15,2) DEFAULT 0,
    stock INT DEFAULT 0,
    min_stock INT DEFAULT 0,
    supplier_id INT,
    status ENUM('active', 'inactive') DEFAULT 'active',
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
);

-- ========================================
-- 5. PRODUCTS (Core Only)
-- ========================================
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sku VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100),
    type ENUM('sendal', 'boot') NOT NULL,
    size VARCHAR(20),
    color VARCHAR(50),
    unit_price DECIMAL(15,2) DEFAULT 0,
    stock INT DEFAULT 0,
    min_stock INT DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active'
);

-- ========================================
-- 6. BILL OF MATERIALS (Simplified)
-- ========================================
CREATE TABLE bom (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    material_id INT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (material_id) REFERENCES raw_materials(id)
);

-- ========================================
-- 7. PURCHASE ORDERS (Simplified)
-- ========================================
CREATE TABLE purchase_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id INT NOT NULL,
    order_date DATE NOT NULL,
    status ENUM('pending', 'approved', 'received', 'cancelled') DEFAULT 'pending',
    total DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_by INT,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE po_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    po_id INT NOT NULL,
    material_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) DEFAULT 0,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES raw_materials(id)
);

-- ========================================
-- 8. WORK ORDERS (Simplified)
-- ========================================
CREATE TABLE work_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    wo_number VARCHAR(50) UNIQUE NOT NULL,
    product_id INT NOT NULL,
    quantity_planned INT NOT NULL,
    quantity_produced INT DEFAULT 0,
    status ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
    start_date DATE,
    completion_date DATE,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ========================================
-- 9. SALES ORDERS (Simplified)
-- ========================================
CREATE TABLE sales_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    so_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    order_date DATE NOT NULL,
    status ENUM('pending', 'confirmed', 'shipped', 'completed', 'cancelled') DEFAULT 'pending',
    total DECIMAL(15,2) DEFAULT 0,
    notes TEXT,
    created_by INT,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE so_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    so_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(15,2) DEFAULT 0,
    subtotal DECIMAL(15,2) DEFAULT 0,
    FOREIGN KEY (so_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ========================================
-- 10. STOCK MOVEMENTS (Universal Log)
-- ========================================
CREATE TABLE stock_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_type ENUM('material', 'product') NOT NULL,
    item_id INT NOT NULL,
    movement_type ENUM('in', 'out', 'adjust') NOT NULL,
    quantity INT NOT NULL,
    reference_type VARCHAR(50) COMMENT 'PO, WO, SO, ADJUSTMENT',
    reference_id INT,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ========================================
-- INDEXES (Essential Only)
-- ========================================
CREATE INDEX idx_materials_sku ON raw_materials(sku);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_wo_status ON work_orders(status);
CREATE INDEX idx_so_status ON sales_orders(status);
CREATE INDEX idx_po_status ON purchase_orders(status);

-- ========================================
-- VIEWS (Helper untuk Query Cepat)
-- ========================================

-- View: Low Stock Materials
CREATE VIEW v_low_stock_materials AS
SELECT id, sku, name, stock, min_stock, (min_stock - stock) as shortage
FROM raw_materials 
WHERE stock <= min_stock AND status = 'active';

-- View: Low Stock Products
CREATE VIEW v_low_stock_products AS
SELECT id, sku, name, stock, min_stock, (min_stock - stock) as shortage
FROM products 
WHERE stock <= min_stock AND status = 'active';

-- View: Dashboard Summary
CREATE VIEW v_dashboard AS
SELECT 
    (SELECT COUNT(*) FROM work_orders WHERE status = 'in_progress') as active_work_orders,
    (SELECT COUNT(*) FROM sales_orders WHERE status = 'pending') as pending_sales,
    (SELECT COUNT(*) FROM purchase_orders WHERE status = 'pending') as pending_purchases,
    (SELECT COUNT(*) FROM v_low_stock_materials) as low_stock_materials,
    (SELECT COUNT(*) FROM v_low_stock_products) as low_stock_products;

-- ========================================
-- RBAC VIEWS & HELPERS
-- ========================================

-- View: User Permissions Summary
CREATE VIEW v_user_permissions AS
SELECT 
    u.id,
    u.username,
    u.full_name,
    u.role,
    CASE u.role
        WHEN 'admin' THEN 'Full Access: All CRUD operations on all resources'
        WHEN 'staff' THEN 'Operational Access: CRUD except delete, no user management'
        WHEN 'viewer' THEN 'Read Only: Dashboard access only'
    END as permission_description,
    CASE u.role
        WHEN 'admin' THEN TRUE
        WHEN 'staff' THEN FALSE
        WHEN 'viewer' THEN FALSE
    END as can_delete,
    CASE u.role
        WHEN 'admin' THEN TRUE
        WHEN 'staff' THEN FALSE
        WHEN 'viewer' THEN FALSE
    END as can_manage_users,
    CASE u.role
        WHEN 'admin' THEN TRUE
        WHEN 'staff' THEN TRUE
        WHEN 'viewer' THEN TRUE
    END as can_view_dashboard,
    CASE u.role
        WHEN 'admin' THEN TRUE
        WHEN 'staff' THEN TRUE
        WHEN 'viewer' THEN FALSE
    END as can_manage_inventory,
    CASE u.role
        WHEN 'admin' THEN TRUE
        WHEN 'staff' THEN TRUE
        WHEN 'viewer' THEN FALSE
    END as can_manage_orders,
    CASE u.role
        WHEN 'admin' THEN TRUE
        WHEN 'staff' THEN FALSE
        WHEN 'viewer' THEN FALSE
    END as can_export_data,
    CASE u.role
        WHEN 'admin' THEN TRUE
        WHEN 'staff' THEN FALSE
        WHEN 'viewer' THEN FALSE
    END as can_adjust_stock
FROM users u
WHERE u.is_active = TRUE;

-- View: Dashboard Statistics (Extended)
CREATE VIEW v_dashboard_stats AS
SELECT 
    -- Inventory counts
    (SELECT COUNT(*) FROM raw_materials WHERE status = 'active') as total_materials,
    (SELECT COUNT(*) FROM products WHERE status = 'active') as total_products,
    (SELECT COUNT(*) FROM v_low_stock_materials) as low_stock_materials,
    (SELECT COUNT(*) FROM v_low_stock_products) as low_stock_products,
    
    -- Order counts
    (SELECT COUNT(*) FROM purchase_orders WHERE status = 'pending') as pending_pos,
    (SELECT COUNT(*) FROM work_orders WHERE status = 'in_progress') as active_wos,
    (SELECT COUNT(*) FROM sales_orders WHERE status = 'pending') as pending_sos,
    
    -- Today's activity
    (SELECT COUNT(*) FROM purchase_orders WHERE DATE(order_date) = CURDATE()) as pos_today,
    (SELECT COUNT(*) FROM work_orders WHERE DATE(created_at) = CURDATE()) as wos_today,
    (SELECT COUNT(*) FROM sales_orders WHERE DATE(order_date) = CURDATE()) as sos_today,
    
    -- Partner counts
    (SELECT COUNT(*) FROM suppliers WHERE status = 'active') as active_suppliers,
    (SELECT COUNT(*) FROM customers WHERE status = 'active') as active_customers,
    
    -- Stock values (approximate)
    (SELECT COALESCE(SUM(stock * unit_price), 0) FROM raw_materials WHERE status = 'active') as material_stock_value,
    (SELECT COALESCE(SUM(stock * unit_price), 0) FROM products WHERE status = 'active') as product_stock_value;

-- View: Recent Activity Log (Last 50 activities)
CREATE VIEW v_recent_activities AS
SELECT 
    sl.id,
    sl.item_type,
    sl.item_id,
    CASE 
        WHEN sl.item_type = 'material' THEN rm.name
        WHEN sl.item_type = 'product' THEN p.name
    END as item_name,
    CASE 
        WHEN sl.item_type = 'material' THEN rm.sku
        WHEN sl.item_type = 'product' THEN p.sku
    END as item_sku,
    sl.movement_type,
    sl.quantity,
    sl.reference_type,
    sl.reference_id,
    sl.notes,
    u.username as created_by_username,
    u.full_name as created_by_name,
    sl.created_at
FROM stock_logs sl
LEFT JOIN raw_materials rm ON sl.item_type = 'material' AND sl.item_id = rm.id
LEFT JOIN products p ON sl.item_type = 'product' AND sl.item_id = p.id
LEFT JOIN users u ON sl.created_by = u.id
ORDER BY sl.created_at DESC
LIMIT 50;

-- View: User Activity Summary (for admin monitoring)
CREATE VIEW v_user_activity AS
SELECT 
    u.id,
    u.username,
    u.full_name,
    u.role,
    (SELECT COUNT(*) FROM stock_logs WHERE created_by = u.id) as total_stock_movements,
    (SELECT COUNT(*) FROM purchase_orders WHERE created_by = u.id) as total_pos_created,
    (SELECT COUNT(*) FROM work_orders WHERE created_by = u.id) as total_wos_created,
    (SELECT COUNT(*) FROM sales_orders WHERE created_by = u.id) as total_sos_created,
    u.created_at as user_since,
    u.is_active
FROM users u
ORDER BY total_stock_movements DESC;

-- ========================================
-- RBAC STORED PROCEDURES
-- ========================================

DELIMITER //

-- Procedure: Check User Permission
CREATE PROCEDURE sp_check_permission(
    IN p_user_id INT,
    IN p_action VARCHAR(50),
    OUT p_has_permission BOOLEAN
)
BEGIN
    DECLARE v_role VARCHAR(20);
    
    SELECT role INTO v_role FROM users WHERE id = p_user_id AND is_active = TRUE;
    
    SET p_has_permission = FALSE;
    
    CASE p_action
        WHEN 'delete' THEN
            IF v_role = 'admin' THEN SET p_has_permission = TRUE; END IF;
        WHEN 'export' THEN
            IF v_role = 'admin' THEN SET p_has_permission = TRUE; END IF;
        WHEN 'manage_users' THEN
            IF v_role = 'admin' THEN SET p_has_permission = TRUE; END IF;
        WHEN 'adjust_stock' THEN
            IF v_role = 'admin' THEN SET p_has_permission = TRUE; END IF;
        WHEN 'view_dashboard' THEN
            IF v_role IN ('admin', 'staff', 'viewer') THEN SET p_has_permission = TRUE; END IF;
        WHEN 'manage_inventory' THEN
            IF v_role IN ('admin', 'staff') THEN SET p_has_permission = TRUE; END IF;
        WHEN 'manage_orders' THEN
            IF v_role IN ('admin', 'staff') THEN SET p_has_permission = TRUE; END IF;
        WHEN 'create_po' THEN
            IF v_role = 'admin' THEN SET p_has_permission = TRUE; END IF;
        WHEN 'receive_po' THEN
            IF v_role IN ('admin', 'staff') THEN SET p_has_permission = TRUE; END IF;
        WHEN 'create_wo' THEN
            IF v_role = 'admin' THEN SET p_has_permission = TRUE; END IF;
        WHEN 'execute_wo' THEN
            IF v_role IN ('admin', 'staff') THEN SET p_has_permission = TRUE; END IF;
        ELSE
            SET p_has_permission = FALSE;
    END CASE;
END //

-- Procedure: Get Dashboard Data (Role-based)
CREATE PROCEDURE sp_get_dashboard(
    IN p_user_role VARCHAR(20)
)
BEGIN
    -- All roles can view dashboard
    IF p_user_role IN ('admin', 'staff', 'viewer') THEN
        SELECT * FROM v_dashboard_stats;
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unauthorized access to dashboard';
    END IF;
END //

-- Procedure: Log Activity with User Check
CREATE PROCEDURE sp_log_activity(
    IN p_user_id INT,
    IN p_item_type ENUM('material', 'product'),
    IN p_item_id INT,
    IN p_movement_type ENUM('in', 'out', 'adjust'),
    IN p_quantity INT,
    IN p_reference_type VARCHAR(50),
    IN p_reference_id INT,
    IN p_notes TEXT
)
BEGIN
    DECLARE v_role VARCHAR(20);
    DECLARE v_can_log BOOLEAN DEFAULT FALSE;
    
    SELECT role INTO v_role FROM users WHERE id = p_user_id AND is_active = TRUE;
    
    -- Check if user can log activities
    IF v_role IN ('admin', 'staff') THEN
        SET v_can_log = TRUE;
    END IF;
    
    IF v_can_log THEN
        INSERT INTO stock_logs (
            item_type, item_id, movement_type, quantity,
            reference_type, reference_id, notes, created_by
        ) VALUES (
            p_item_type, p_item_id, p_movement_type, p_quantity,
            p_reference_type, p_reference_id, p_notes, p_user_id
        );
        SELECT 'Activity logged successfully' as message;
    ELSE
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not authorized to log activities';
    END IF;
END //

DELIMITER ;

-- ========================================
-- SAMPLE DATA
-- ========================================

-- Admin User (password: admin123)
INSERT INTO users (username, password, full_name, role, email) VALUES
('admin', '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM02N8W0PPvF.v8dn.1m', 'Administrator', 'admin', 'admin@factory.com'),
('viewer', '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM02N8W0PPvF.v8dn.1m', 'Dashboard Viewer', 'viewer', 'viewer@factory.com'),
('operator1', '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM02N8W0PPvF.v8dn.1m', 'Operator Produksi', 'staff', 'operator@factory.com');

-- Suppliers
INSERT INTO suppliers (name, contact, phone, address) VALUES
('PT Karet Indonesia', 'Budi', '081234567890', 'Jakarta'),
('CV Foam Makmur', 'Siti', '081234567891', 'Bandung'),
('Toko Bahan Sejahtera', 'Ahmad', '081234567892', 'Surabaya');

-- Customers
INSERT INTO customers (name, contact, phone, type) VALUES
('Toko Sepatu Jaya', 'Dewi', '081234567893', 'wholesale'),
('CV Retail Maju', 'Rudi', '081234567894', 'wholesale'),
('Konsumen Umum', '-', '0000000000', 'retail');

-- Raw Materials
INSERT INTO raw_materials (sku, name, category, unit, unit_price, stock, min_stock, supplier_id) VALUES
('RM001', 'Karet Sol Hitam', 'Karet', 'kg', 25000, 500, 100, 1),
('RM002', 'EVA Foam 10mm', 'Foam', 'lembar', 15000, 200, 50, 2),
('RM003', 'Strap Nilon', 'Aksesoris', 'meter', 3000, 800, 200, 3),
('RM004', 'Lem PU', 'Kimia', 'liter', 45000, 100, 20, 2);

-- Products
INSERT INTO products (sku, name, category, type, size, color, unit_price, stock, min_stock) VALUES
('PRD001', 'Sandal Jepit Classic', 'Sandal Casual', 'sendal', '39', 'Hitam', 35000, 200, 50),
('PRD002', 'Sandal Gunung Adventure', 'Sandal Outdoor', 'sendal', '40', 'Coklat', 150000, 100, 30),
('PRD003', 'Safety Boot Steel Toe', 'Boot Safety', 'boot', '40', 'Hitam', 350000, 50, 20);

-- Bill of Materials
INSERT INTO bom (product_id, material_id, quantity) VALUES
(1, 1, 0.3),  -- Sandal Jepit butuh 0.3kg karet
(1, 3, 0.5),  -- Sandal Jepit butuh 0.5m strap
(2, 1, 0.5),  -- Sandal Gunung butuh 0.5kg karet
(2, 2, 1),    -- Sandal Gunung butuh 1 lembar foam
(2, 3, 1),    -- Sandal Gunung butuh 1m strap
(3, 1, 1),    -- Safety Boot butuh 1kg karet
(3, 2, 2);    -- Safety Boot butuh 2 lembar foam

-- ========================================
-- SUCCESS MESSAGES
-- ========================================

SELECT '✅ Minimal Database Created!' as message;
SELECT 'Total Tables: 13 (vs 40+ di full version)' as info;
SELECT 'Total Views: 7 (Dashboard, RBAC, Activity logs)' as views_info;
SELECT 'Total Procedures: 3 (Permission checks, Dashboard, Activity logs)' as procedures_info;
SELECT '' as separator;
SELECT '🔐 RBAC System Enabled:' as rbac_title;
SELECT '  - Admin: Full access (all CRUD + exports + user management)' as rbac_admin;
SELECT '  - Staff: Operational access (CRUD except delete, no user management)' as rbac_staff;
SELECT '  - Viewer: Dashboard only (read-only)' as rbac_viewer;
SELECT '' as separator2;
SELECT '👤 Test Users:' as users_title;
SELECT '  admin / admin123 (Admin role)' as user_admin;
SELECT '  viewer / admin123 (Viewer role)' as user_viewer;
SELECT '  operator1 / admin123 (Staff role)' as user_staff;
SELECT '' as separator3;
SELECT '📊 Available Views:' as views_title;
SELECT '  v_dashboard - Dashboard summary statistics' as view1;
SELECT '  v_dashboard_stats - Extended dashboard data' as view2;
SELECT '  v_user_permissions - User permission matrix' as view3;
SELECT '  v_recent_activities - Last 50 activities' as view4;
SELECT '  v_user_activity - User activity summary' as view5;
SELECT '  v_low_stock_materials - Materials below min stock' as view6;
SELECT '  v_low_stock_products - Products below min stock' as view7;
SELECT '' as separator4;
SELECT '🔧 Available Procedures:' as proc_title;
SELECT '  sp_check_permission(user_id, action) - Check user permissions' as proc1;
SELECT '  sp_get_dashboard(user_role) - Get dashboard data by role' as proc2;
SELECT '  sp_log_activity(...) - Log activity with permission check' as proc3;

