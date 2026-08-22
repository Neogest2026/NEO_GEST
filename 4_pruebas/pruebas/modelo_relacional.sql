CREATE TABLE `ROL` (
  `id_rol` int PRIMARY KEY COMMENT '1=Master, 2=Empleado, 3=Cliente',
  `nombre` varchar(255),
  `permisos` varchar(255)
);

CREATE TABLE `USUARIO` (
  `id_usuario` int PRIMARY KEY,
  `id_rol` int,
  `email` varchar(255) COMMENT 'Login',
  `password_hash` varchar(255) COMMENT 'Hash bcrypt',
  `fecha_registro` datetime,
  `estado` boolean COMMENT 'Activo/Inactivo'
);

CREATE TABLE `CLIENTE` (
  `id_cliente` int PRIMARY KEY,
  `id_usuario` int,
  `nombre_completo` varchar(255),
  `telefono` varchar(255),
  `direccion_envio` varchar(255),
  `direccion_facturacion` varchar(255)
);

CREATE TABLE `EMPLEADO` (
  `id_empleado` int PRIMARY KEY,
  `id_usuario` int,
  `nombre` varchar(255),
  `cargo` varchar(255) COMMENT 'Logística/Ventas',
  `id_jefe_o_master` int COMMENT 'Quién lo registró'
);

CREATE TABLE `CATEGORIA` (
  `id_categoria` int PRIMARY KEY,
  `nombre` varchar(255) COMMENT 'Salas, Alcobas, etc',
  `descripcion` varchar(255)
);

CREATE TABLE `PRODUCTO` (
  `id_producto` int PRIMARY KEY,
  `id_categoria` int,
  `nombre` varchar(255),
  `descripcion` varchar(255),
  `precio_unitario` decimal,
  `stock_actual` int,
  `dimensiones` varchar(255),
  `imagen_url` varchar(255),
  `activo` boolean
);

CREATE TABLE `MOVIMIENTO_INVENTARIO` (
  `id_movimiento` int PRIMARY KEY,
  `id_producto` int,
  `id_empleado` int COMMENT 'Empleado responsable del ajuste',
  `tipo` varchar(255) COMMENT 'Entrada/Salida/Devolucion',
  `cantidad` int,
  `fecha` datetime,
  `observacion` varchar(255),
  `stock_anterior` int,
  `stock_nuevo` int
);

CREATE TABLE `CARRITO` (
  `id_carrito` int PRIMARY KEY,
  `id_cliente` int,
  `fecha_actualizacion` datetime
);

CREATE TABLE `ITEM_CARRITO` (
  `id_item` int PRIMARY KEY,
  `id_carrito` int,
  `id_producto` int,
  `cantidad` int
);

CREATE TABLE `PEDIDO` (
  `id_pedido` int PRIMARY KEY,
  `id_cliente` int,
  `fecha_creacion` datetime,
  `estado` varchar(255) COMMENT 'Pendiente, Pagado, Enviado, Entregado',
  `total_compra` decimal
);

CREATE TABLE `DETALLE_PEDIDO` (
  `id_detalle` int PRIMARY KEY,
  `id_pedido` int,
  `id_producto` int,
  `cantidad` int,
  `precio_al_momento` decimal COMMENT 'Precio congelado'
);

CREATE TABLE `PAGO` (
  `id_pago` int PRIMARY KEY,
  `id_pedido` int,
  `metodo` varchar(255) COMMENT 'Tarjeta, PSE, etc',
  `monto` decimal,
  `fecha_pago` datetime,
  `estado_transaccion` varchar(255) COMMENT 'Aprobado/Rechazado'
);

CREATE TABLE `FACTURA` (
  `id_factura` int PRIMARY KEY,
  `id_pedido` int,
  `numero_factura` varchar(255),
  `ruc_nit_cliente` varchar(255),
  `url_pdf` varchar(255),
  `fecha_emision` datetime
);

CREATE TABLE `ENVIO` (
  `id_envio` int PRIMARY KEY,
  `id_pedido` int,
  `id_empleado` int COMMENT 'Encargado logística',
  `empresa_transporte` varchar(255),
  `codigo_seguimiento` varchar(255) COMMENT 'Tracking ID',
  `fecha_despacho` datetime,
  `fecha_entrega_estimada` datetime,
  `estado` varchar(255) COMMENT 'En bodega, En ruta, Entregado'
);

CREATE TABLE `DEVOLUCION` (
  `id_devolucion` int PRIMARY KEY,
  `id_pedido` int,
  `id_empleado` int COMMENT 'Quién aprueba',
  `fecha_solicitud` datetime,
  `motivo` varchar(255),
  `estado` varchar(255) COMMENT 'Solicitada, Aprobada, Rechazada',
  `monto_reembolso` decimal
);

ALTER TABLE `USUARIO` ADD FOREIGN KEY (`id_rol`) REFERENCES `ROL` (`id_rol`);

ALTER TABLE `CLIENTE` ADD FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO` (`id_usuario`);

ALTER TABLE `EMPLEADO` ADD FOREIGN KEY (`id_usuario`) REFERENCES `USUARIO` (`id_usuario`);

ALTER TABLE `PRODUCTO` ADD FOREIGN KEY (`id_categoria`) REFERENCES `CATEGORIA` (`id_categoria`);

ALTER TABLE `DETALLE_PEDIDO` ADD FOREIGN KEY (`id_producto`) REFERENCES `PRODUCTO` (`id_producto`);

ALTER TABLE `ITEM_CARRITO` ADD FOREIGN KEY (`id_producto`) REFERENCES `PRODUCTO` (`id_producto`);

ALTER TABLE `MOVIMIENTO_INVENTARIO` ADD FOREIGN KEY (`id_producto`) REFERENCES `PRODUCTO` (`id_producto`);

ALTER TABLE `CARRITO` ADD FOREIGN KEY (`id_cliente`) REFERENCES `CLIENTE` (`id_cliente`);

ALTER TABLE `ITEM_CARRITO` ADD FOREIGN KEY (`id_carrito`) REFERENCES `CARRITO` (`id_carrito`);

ALTER TABLE `PEDIDO` ADD FOREIGN KEY (`id_cliente`) REFERENCES `CLIENTE` (`id_cliente`);

ALTER TABLE `DETALLE_PEDIDO` ADD FOREIGN KEY (`id_pedido`) REFERENCES `PEDIDO` (`id_pedido`);

ALTER TABLE `PAGO` ADD FOREIGN KEY (`id_pedido`) REFERENCES `PEDIDO` (`id_pedido`);

ALTER TABLE `FACTURA` ADD FOREIGN KEY (`id_pedido`) REFERENCES `PEDIDO` (`id_pedido`);

ALTER TABLE `ENVIO` ADD FOREIGN KEY (`id_pedido`) REFERENCES `PEDIDO` (`id_pedido`);

ALTER TABLE `DEVOLUCION` ADD FOREIGN KEY (`id_pedido`) REFERENCES `PEDIDO` (`id_pedido`);

ALTER TABLE `ENVIO` ADD FOREIGN KEY (`id_empleado`) REFERENCES `EMPLEADO` (`id_empleado`);

ALTER TABLE `DEVOLUCION` ADD FOREIGN KEY (`id_empleado`) REFERENCES `EMPLEADO` (`id_empleado`);

ALTER TABLE `MOVIMIENTO_INVENTARIO` ADD FOREIGN KEY (`id_empleado`) REFERENCES `EMPLEADO` (`id_empleado`);
