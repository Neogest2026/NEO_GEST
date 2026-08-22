USE neogest;

INSERT INTO categoria (idCategoria, nombre, descripcion) VALUES
(1, 'Sala', 'Muebles principales para sala y espacios sociales'),
(2, 'Dormitorio', 'Camas y muebles para habitaciones'),
(3, 'Comedor', 'Mesas y conjuntos para comedor'),
(4, 'Iluminacion', 'Lamparas y accesorios de luz'),
(5, 'Oficina', 'Muebles funcionales para oficina'),
(6, 'Multifuncional', 'Muebles versatiles para espacios reducidos')
ON DUPLICATE KEY UPDATE
nombre = VALUES(nombre),
descripcion = VALUES(descripcion);

INSERT INTO producto (
    idProducto,
    nombre,
    descripcion,
    precio_unitario,
    stock_actual,
    dimensiones,
    peso,
    imagen_url,
    activo,
    Categoria_idCategoria
) VALUES
(1, 'Sofa Modular Milano', 'Sofa moderno de tres puestos con tapizado premium.', 2450000.00, 8, '220 x 90 x 82 cm', 58.00, '/images/sofa.png', 1, 1),
(2, 'Cama Nube Queen', 'Cama tapizada con cabecero amplio y base reforzada.', 1980000.00, 5, '160 x 200 x 110 cm', 72.00, '/images/cama.png', 1, 2),
(3, 'Comedor Roble 6 Puestos', 'Mesa de comedor con acabado en madera y lineas minimalistas.', 3200000.00, 4, '180 x 90 x 76 cm', 85.00, '/images/comedor.png', 1, 3),
(4, 'Lampara Arco Studio', 'Lampara decorativa para salas, estudios y espacios de lectura.', 690000.00, 12, '45 x 45 x 170 cm', 9.50, '/images/lamp.png', 1, 4),
(5, 'Silla Ejecutiva Oslo', 'Silla ergonomica para jornadas de trabajo prolongadas.', 780000.00, 10, '68 x 64 x 110 cm', 18.00, '/images/hero.png', 1, 5),
(6, 'Sofa Cama Compacto', 'Sofa cama funcional para apartamentos y habitaciones auxiliares.', 1750000.00, 6, '190 x 88 x 80 cm', 49.00, '/images/sofa_cama.png', 1, 6),
(7, 'Mesa Lateral Nova', 'Mesa auxiliar compacta para sala o habitacion.', 380000.00, 0, '48 x 48 x 55 cm', 7.00, '/images/hero.png', 1, 1),
(8, 'Escritorio Nordico', 'Escritorio minimalista para oficina en casa.', 1250000.00, 7, '120 x 60 x 76 cm', 32.00, '/images/comedor.png', 1, 5)
ON DUPLICATE KEY UPDATE
nombre = VALUES(nombre),
descripcion = VALUES(descripcion),
precio_unitario = VALUES(precio_unitario),
stock_actual = VALUES(stock_actual),
dimensiones = VALUES(dimensiones),
peso = VALUES(peso),
imagen_url = VALUES(imagen_url),
activo = VALUES(activo),
Categoria_idCategoria = VALUES(Categoria_idCategoria);
