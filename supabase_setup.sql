-- ====================================================
-- ESQUEMA Y DATOS INICIALES PARA SISTEMA MACOLLA
-- Finca Juriepe - Vichada en Supabase (PostgreSQL)
-- ====================================================

-- 1. CREACIÓN DE TABLAS

CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  usuario TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'CAJERO',
  estado TEXT NOT NULL DEFAULT 'ACTIVO',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS productos (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  unidad TEXT DEFAULT 'Unidades',
  grupo TEXT DEFAULT 'General',
  stock_min INTEGER DEFAULT 0,
  precio_costo NUMERIC DEFAULT 0,
  precio_venta NUMERIC DEFAULT 0,
  estado TEXT DEFAULT 'ACTIVO',
  tipo TEXT DEFAULT 'INVENTARIO',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS movimientos (
  id BIGSERIAL PRIMARY KEY,
  codigo TEXT NOT NULL,
  fecha DATE NOT NULL,
  tipo TEXT NOT NULL,
  cantidad NUMERIC NOT NULL,
  usuario TEXT DEFAULT 'Sistema',
  observaciones TEXT,
  stock_resultante NUMERIC DEFAULT 0,
  precio_costo NUMERIC DEFAULT 0,
  precio_venta NUMERIC DEFAULT 0,
  ganancia NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS facturas (
  id BIGSERIAL PRIMARY KEY,
  numero_factura TEXT UNIQUE NOT NULL,
  cliente TEXT NOT NULL,
  nit TEXT NOT NULL,
  fecha TIMESTAMPTZ DEFAULT NOW(),
  total NUMERIC NOT NULL,
  items JSONB,
  usuario TEXT DEFAULT 'Sistema'
);

-- 2. PERMISOS DE SEGURIDAD (Permitir lectura y escritura desde la App Web)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acceso publico usuarios" ON usuarios;
CREATE POLICY "Acceso publico usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso publico productos" ON productos;
CREATE POLICY "Acceso publico productos" ON productos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso publico movimientos" ON movimientos;
CREATE POLICY "Acceso publico movimientos" ON movimientos FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Acceso publico facturas" ON facturas;
CREATE POLICY "Acceso publico facturas" ON facturas FOR ALL USING (true) WITH CHECK (true);

-- 3. USUARIOS INICIALES
INSERT INTO usuarios (usuario, password, nombre, rol, estado) VALUES
  ('admin', 'admin123', 'Administrador Juriepe', 'ADMIN', 'ACTIVO'),
  ('caja', '1234', 'Cajero Turno', 'CAJERO', 'ACTIVO')
ON CONFLICT (usuario) DO NOTHING;

-- 4. MIGRACIÓN DE PRODUCTOS DESDE TU EXCEL
INSERT INTO productos (codigo, nombre, unidad, grupo, stock_min, precio_costo, precio_venta, estado, tipo) VALUES
  ('1', 'Canoa 01', 'Unidades', 'Equipos', 0, 0.0, 20000.0, 'ACTIVO', 'ALQUILER'),
  ('2', 'Canoa 2', 'Unidades', 'Equipos', 0, 0.0, 20000.0, 'ACTIVO', 'ALQUILER'),
  ('3', 'Canoa 3', 'Unidades', 'Equipos', 0, 0.0, 20000.0, 'ACTIVO', 'ALQUILER'),
  ('4', 'Canoa 4', 'Unidades', 'Equipos', 0, 0.0, 40000.0, 'ACTIVO', 'ALQUILER'),
  ('5', 'Canoa 5', 'Unidades', 'Equipos', 0, 0.0, 40000.0, 'ACTIVO', 'ALQUILER'),
  ('6', 'Canoa 6', 'Unidades', 'Equipos', 0, 0.0, 40000.0, 'ACTIVO', 'ALQUILER'),
  ('7', 'Canoa 7', 'Unidades', 'Equipos', 0, 0.0, 40000.0, 'ACTIVO', 'ALQUILER'),
  ('8', 'Canoa 8', 'Unidades', 'Equipos', 0, 0.0, 40000.0, 'ACTIVO', 'ALQUILER'),
  ('9', 'Canoa 9', 'Unidades', 'Equipos', 0, 0.0, 40000.0, 'ACTIVO', 'ALQUILER'),
  ('10', 'Canoa 10', 'Unidades', 'Equipos', 0, 0.0, 40000.0, 'ACTIVO', 'ALQUILER'),
  ('11', 'Cerveza Aguila', 'Unidades', 'Bebidas', 12, 3125.0, 4500.0, 'ACTIVO', 'INVENTARIO'),
  ('12', 'Gaseosa ', 'Unidades', 'Bebidas', 10, 4583.0, 10000.0, 'ACTIVO', 'INVENTARIO'),
  ('13', 'Entrada Carro Paso', 'Unidades', 'General', 0, 0.0, 30000.0, 'ACTIVO', 'SERVICIO'),
  ('14', 'Paso Turista', 'Unidades', 'General', 0, 0.0, 20000.0, 'ACTIVO', 'SERVICIO'),
  ('15', 'Desayuno', 'Unidades', 'General', 0, 0.0, 25000.0, 'ACTIVO', 'SERVICIO'),
  ('16', 'Almuerzo ', 'Unidades', 'General', 0, 0.0, 25000.0, 'ACTIVO', 'SERVICIO'),
  ('17', 'Comida', 'Unidades', 'General', 0, 0.0, 25000.0, 'ACTIVO', 'SERVICIO'),
  ('18', 'Paso particulares', 'Unidades', 'General', 0, 0.0, 10000.0, 'ACTIVO', 'SERVICIO')
ON CONFLICT (codigo) DO NOTHING;

-- 5. MIGRACIÓN DE MOVIMIENTOS DESDE TU EXCEL
INSERT INTO movimientos (codigo, fecha, tipo, cantidad, usuario, observaciones, stock_resultante, precio_costo, precio_venta, ganancia) VALUES
  ('1', '2026-11-04', 'INGRESO', 30.0, 'gutierrezsanabria@gmail.com', 'Canoa Pequeña', 30.0, 0.0, 20000.0, 0.0),
  ('2', '2026-11-04', 'INGRESO', 30.0, 'gutierrezsanabria@gmail.com', 'Canoa Pequeña', 30.0, 0.0, 20000.0, 0.0),
  ('3', '2026-11-04', 'INGRESO', 30.0, 'gutierrezsanabria@gmail.com', 'Canoa Pequeña', 30.0, 0.0, 20000.0, 0.0),
  ('4', '2026-11-04', 'INGRESO', 30.0, 'gutierrezsanabria@gmail.com', 'Canoa Grande', 30.0, 0.0, 40000.0, 0.0),
  ('5', '2026-11-04', 'INGRESO', 30.0, 'gutierrezsanabria@gmail.com', 'Canoa Grande', 30.0, 0.0, 40000.0, 0.0),
  ('6', '2026-11-04', 'INGRESO', 30.0, 'gutierrezsanabria@gmail.com', 'Canoa Grande', 30.0, 0.0, 40000.0, 0.0),
  ('7', '2026-11-04', 'INGRESO', 30.0, 'gutierrezsanabria@gmail.com', 'Canoa Grande', 30.0, 0.0, 40000.0, 0.0),
  ('8', '2026-11-04', 'INGRESO', 30.0, 'gutierrezsanabria@gmail.com', 'Canoa Grande', 30.0, 0.0, 40000.0, 0.0),
  ('9', '2026-11-04', 'INGRESO', 30.0, 'gutierrezsanabria@gmail.com', 'Canoa Grande', 30.0, 0.0, 40000.0, 0.0),
  ('10', '2026-11-04', 'INGRESO', 30.0, 'gutierrezsanabria@gmail.com', 'Canoa Grande', 30.0, 0.0, 40000.0, 0.0),
  ('11', '2026-11-04', 'INGRESO', 48.0, 'gutierrezsanabria@gmail.com', 'Cerveza Aguila', 48.0, 3125.0, 4500.0, 0.0),
  ('11', '2026-11-04', 'SALIDA', 5.0, 'gutierrezsanabria@gmail.com', 'venta realizada 03 de noviembre', 43.0, 3125.0, 4500.0, 6875.0),
  ('12', '2026-11-04', 'INGRESO', 24.0, 'gutierrezsanabria@gmail.com', 'gaseosa de varios tipos', 24.0, 4583.0, 10000.0, 0.0),
  ('12', '2026-11-04', 'INGRESO', 7.0, 'gutierrezsanabria@gmail.com', 'compra de gaseosa', 31.0, 4583.0, 10000.0, 0.0),
  ('12', '2026-11-04', 'SALIDA', 3.0, 'gutierrezsanabria@gmail.com', 'venta de gaseosa', 28.0, 4583.0, 10000.0, 16251.0),
  ('13', '2026-11-04', 'INGRESO', 30.0, 'gutierrezsanabria@gmail.com', '', 30.0, 0.0, 30000.0, 0.0),
  ('14', '2026-11-04', 'INGRESO', 30.0, 'gutierrezsanabria@gmail.com', '', 30.0, 0.0, 20000.0, 0.0),
  ('1', '2026-11-04', 'SALIDA', 1.0, 'gutierrezsanabria@gmail.com', '', 29.0, 0.0, 20000.0, 20000.0),
  ('1', '2026-11-05', 'SALIDA', 1.0, 'gutierrezsanabria@gmail.com', 'Se alquilo a JUan Perez', 0.0, 0.0, 20000.0, 20000.0),
  ('13', '2026-11-05', 'SALIDA', 3.0, 'gutierrezsanabria@gmail.com', 'Taquilla Carros', 0.0, 0.0, 30000.0, 90000.0),
  ('14', '2026-11-04', 'SALIDA', 5.0, 'gutierrezsanabria@gmail.com', 'Taquilla Turistas', 0.0, 0.0, 20000.0, 100000.0),
  ('14', '2026-11-05', 'SALIDA', 2.0, 'gutierrezsanabria@gmail.com', 'Taquilla Turistas', 0.0, 0.0, 20000.0, 40000.0),
  ('3', '2026-11-05', 'SALIDA', 1.0, 'gutierrezsanabria@gmail.com', 'Se alquilo a Allisson', 0.0, 0.0, 20000.0, 20000.0),
  ('4', '2026-11-05', 'SALIDA', 1.0, 'gutierrezsanabria@gmail.com', 'Aura', 0.0, 0.0, 40000.0, 40000.0),
  ('7', '2026-11-05', 'SALIDA', 2.0, 'gutierrezsanabria@gmail.com', 'Aura', 0.0, 0.0, 40000.0, 80000.0),
  ('13', '2026-11-05', 'SALIDA', 1.0, 'gutierrezsanabria@gmail.com', 'Taquilla Carros', 0.0, 0.0, 30000.0, 30000.0),
  ('14', '2026-11-05', 'SALIDA', 3.0, 'gutierrezsanabria@gmail.com', 'Taquilla Turistas', 0.0, 0.0, 20000.0, 60000.0),
  ('13', '2026-11-05', 'SALIDA', 2.0, 'gutierrezsanabria@gmail.com', 'Taquilla Carros', 0.0, 0.0, 30000.0, 60000.0),
  ('14', '2026-11-05', 'SALIDA', 6.0, 'gutierrezsanabria@gmail.com', 'Taquilla Turistas', 0.0, 0.0, 20000.0, 120000.0),
  ('11', '2026-11-05', 'SALIDA', 2.0, 'gutierrezsanabria@gmail.com', 'para el gordo pago nequi', 41.0, 3125.0, 4500.0, 2750.0),
  ('4', '2026-11-06', 'SALIDA', 1.0, 'gutierrezsanabria@gmail.com', '', 0.0, 0.0, 40000.0, 40000.0),
  ('1', '2026-11-06', 'SALIDA', 1.0, 'gutierrezsanabria@gmail.com', '', 0.0, 0.0, 20000.0, 20000.0),
  ('13', '2026-11-06', 'SALIDA', 5.0, 'gutierrezsanabria@gmail.com', 'Taquilla Carros', 0.0, 0.0, 30000.0, 150000.0),
  ('13', '2026-11-06', 'SALIDA', 2.0, 'gutierrezsanabria@gmail.com', 'Taquilla Carros', 0.0, 0.0, 30000.0, 60000.0),
  ('14', '2026-11-06', 'SALIDA', 6.0, 'gutierrezsanabria@gmail.com', 'Taquilla Turistas', 0.0, 0.0, 20000.0, 120000.0),
  ('11', '2026-11-06', 'SALIDA', 10.0, 'gutierrezsanabria@gmail.com', '', 31.0, 3125.0, 4500.0, 13750.0),
  ('12', '2026-11-06', 'SALIDA', 4.0, 'gutierrezsanabria@gmail.com', 'sevenden para la Armada', 24.0, 4583.0, 10000.0, 21668.0),
  ('15', '2026-11-06', 'SALIDA', 1.0, 'gutierrezsanabria@gmail.com', 'Restaurante', 0.0, 0.0, 25000.0, 25000.0),
  ('16', '2026-11-06', 'SALIDA', 1.0, 'gutierrezsanabria@gmail.com', 'Restaurante', 0.0, 0.0, 25000.0, 25000.0),
  ('17', '2026-11-06', 'SALIDA', 1.0, 'gutierrezsanabria@gmail.com', 'Restaurante', 0.0, 0.0, 25000.0, 25000.0),
  ('15', '2026-11-06', 'SALIDA', 2.0, 'gutierrezsanabria@gmail.com', 'Restaurante', 0.0, 0.0, 25000.0, 50000.0),
  ('16', '2026-11-06', 'SALIDA', 2.0, 'gutierrezsanabria@gmail.com', 'Restaurante', 0.0, 0.0, 25000.0, 50000.0),
  ('18', '2026-11-06', 'SALIDA', 2.0, 'gutierrezsanabria@gmail.com', 'Paso Particulares', 0.0, 0.0, 10000.0, 20000.0);
