CREATE TABLE `auditoria_descargas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `tipo_documento` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `referencia_id` int DEFAULT NULL,
  `fecha_descarga` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `detalles` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `auditoria_descargas_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `auditoria_sesiones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `fecha_ingreso` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `auditoria_sesiones_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `catalogo_cargo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tipo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Costo o Multa',
  `descripcion` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `monto_defecto` decimal(12,2) NOT NULL DEFAULT '0.00',
  `es_activo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `catalogo_cargo_periodo` (
  `catalogo_cargo_id` int NOT NULL,
  `periodo_facturacion_id` int NOT NULL,
  PRIMARY KEY (`catalogo_cargo_id`,`periodo_facturacion_id`),
  KEY `fk_ccp_periodo` (`periodo_facturacion_id`),
  CONSTRAINT `fk_ccp_cargo` FOREIGN KEY (`catalogo_cargo_id`) REFERENCES `catalogo_cargo` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ccp_periodo` FOREIGN KEY (`periodo_facturacion_id`) REFERENCES `periodo_facturacion` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `configuracion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `monto_multa_base` decimal(10,2) DEFAULT '0.00',
  `monto_instalacion_base` decimal(10,2) DEFAULT '0.00',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `historial_estado` (
  `id` int NOT NULL AUTO_INCREMENT,
  `tabla_origen` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'RECIBO o PAGO',
  `registro_id` int NOT NULL COMMENT 'ID del registro afectado',
  `estado_anterior` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado_nuevo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cambiado_por` int NOT NULL COMMENT 'Usuario que ejecutó el cambio',
  `fecha_cambio` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_historial_origen` (`tabla_origen`,`registro_id`),
  KEY `idx_historial_usuario` (`cambiado_por`),
  CONSTRAINT `fk_historial_usuario` FOREIGN KEY (`cambiado_por`) REFERENCES `usuario` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_historial_origen` CHECK ((`tabla_origen` in (_utf8mb4'RECIBO',_utf8mb4'PAGO')))
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Auditoría inmutable de cambios de estado - NO borrar registros';

CREATE TABLE `lectura` (
  `id` int NOT NULL AUTO_INCREMENT,
  `medidor_id` int NOT NULL COMMENT 'Medidor leído',
  `operario_id` int NOT NULL COMMENT 'Operario que tomó la lectura',
  `periodo_id` int NOT NULL COMMENT 'Período al que pertenece la lectura',
  `lectura_anterior` decimal(12,2) NOT NULL COMMENT 'Valor previo en kWh',
  `lectura_actual` decimal(12,2) NOT NULL COMMENT 'Valor actual en kWh',
  `consumo_calculado` decimal(12,3) NOT NULL DEFAULT '0.000',
  `lectura_anterior_punta` decimal(12,2) DEFAULT '0.00',
  `lectura_actual_punta` decimal(12,2) DEFAULT '0.00',
  `consumo_calculado_punta` decimal(12,3) GENERATED ALWAYS AS ((`lectura_actual_punta` - `lectura_anterior_punta`)) STORED,
  `factor_potencia` decimal(10,4) DEFAULT '0.0000',
  `precio_factor_potencia` decimal(10,4) DEFAULT '0.0000' COMMENT 'Precio por unidad de energia reactiva',
  `fecha_registro` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Validado',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `justificacion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `es_cambio_medidor` tinyint(1) DEFAULT '0',
  `lectura_final_viejo` decimal(12,2) DEFAULT NULL,
  `lectura_inicial_nuevo` decimal(12,2) DEFAULT NULL,
  `lectura_final_viejo_punta` decimal(12,2) DEFAULT NULL,
  `lectura_inicial_nuevo_punta` decimal(12,2) DEFAULT NULL,
  `lectura_actual_original` decimal(12,2) DEFAULT NULL COMMENT 'Valor antes de modificación',
  `lectura_actual_punta_original` decimal(12,2) DEFAULT NULL COMMENT 'Valor antes de modificación',
  `factor_potencia_original` decimal(12,2) DEFAULT NULL COMMENT 'Valor antes de modificación',
  PRIMARY KEY (`id`),
  KEY `fk_lectura_medidor` (`medidor_id`),
  KEY `idx_lectura_periodo_medidor` (`periodo_id`,`medidor_id`),
  KEY `idx_lectura_operario` (`operario_id`,`fecha_registro`),
  CONSTRAINT `fk_lectura_medidor` FOREIGN KEY (`medidor_id`) REFERENCES `medidor` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_lectura_operario` FOREIGN KEY (`operario_id`) REFERENCES `usuario` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_lectura_periodo` FOREIGN KEY (`periodo_id`) REFERENCES `periodo_facturacion` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_lectura_estado` CHECK ((`estado` in (_utf8mb4'Validado',_utf8mb4'Observado')))
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lecturas de medidores eléctricos registradas por operarios';

CREATE TABLE `medidor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL COMMENT 'Miembro propietario del medidor',
  `num_serie` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Número de serie del equipo',
  `operativo` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `cobro_instalacion_pendiente` tinyint(1) DEFAULT '1',
  `tipo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Normal' COMMENT 'Normal o Tiempo Real',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_medidor_serie` (`num_serie`),
  KEY `idx_medidor_usuario` (`usuario_id`),
  CONSTRAINT `fk_medidor_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Medidores eléctricos asignados a miembros del parque';

CREATE TABLE `pago` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recibo_id` int NOT NULL COMMENT 'Recibo que se cancela',
  `monto_pagado` decimal(12,2) NOT NULL COMMENT 'Monto en PEN (Soles)',
  `metodo_pago` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Transferencia, Efectivo, Depósito, Cheque',
  `numero_operacion` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Código de la transacción bancaria',
  `fecha_pago` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado_validacion` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Pendiente',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_pago_recibo` (`recibo_id`),
  CONSTRAINT `fk_pago_recibo` FOREIGN KEY (`recibo_id`) REFERENCES `recibo` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_pago_estado` CHECK ((`estado_validacion` in (_utf8mb4'Pendiente',_utf8mb4'Confirmado'))),
  CONSTRAINT `chk_pago_monto` CHECK ((`monto_pagado` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Pagos realizados contra recibos de cobro';

CREATE TABLE `periodo_facturacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mes_anio` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ej. Oct 2024',
  `factor_multiplicador` decimal(6,4) NOT NULL DEFAULT '1.0000',
  `tarifa_kwh` decimal(10,4) NOT NULL COMMENT 'Precio por kWh de energía eléctrica',
  `tarifa_kwh_punta` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `tarifa_mantenimiento_normal` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Cargo mensual de mantenimiento medidor normal',
  `tarifa_mantenimiento_tiempo_real` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Cargo mensual de mantenimiento medidor tiempo real',
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `fecha_inicio_lectura` date DEFAULT NULL,
  `fecha_fin_lectura` date DEFAULT NULL,
  `fecha_emision_recibo` date DEFAULT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `fecha_corte` date DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_periodo_mes` (`mes_anio`),
  KEY `fk_periodo_created_by` (`created_by`),
  CONSTRAINT `fk_periodo_created_by` FOREIGN KEY (`created_by`) REFERENCES `usuario` (`id`),
  CONSTRAINT `chk_periodo_fechas` CHECK ((`fecha_fin` > `fecha_inicio`))
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Períodos de facturación con tarifas centralizadas';

CREATE TABLE `recibo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL COMMENT 'Miembro facturado',
  `periodo_id` int NOT NULL COMMENT 'Período de facturación',
  `lectura_id` int DEFAULT NULL COMMENT 'Lectura que originó el cargo de energía',
  `numero_comprobante` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ej. REC-2024-001',
  `cargo_energia` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'consumo × tarifa × factor',
  `cargo_energia_punta` decimal(12,2) DEFAULT '0.00',
  `cargo_factor_potencia` decimal(12,2) DEFAULT '0.00',
  `cargo_mantenimiento` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Cargo fijo del período',
  `cargo_fijo` decimal(12,2) DEFAULT '0.00',
  `cargo_corte` decimal(12,2) DEFAULT '0.00',
  `multa_manipulacion` decimal(12,2) DEFAULT '0.00',
  `multa_reconexion` decimal(12,2) DEFAULT '0.00',
  `instalacion_medidor` decimal(12,2) DEFAULT '0.00',
  `deuda_pendiente` decimal(12,2) DEFAULT '0.00',
  `deuda_consumo` decimal(12,2) DEFAULT '0.00',
  `deuda_vencida` decimal(12,2) DEFAULT '0.00',
  `subtotal` decimal(12,2) NOT NULL COMMENT 'cargo_energia + cargo_mantenimiento',
  `igv` decimal(12,2) NOT NULL COMMENT '18% sobre subtotal',
  `total` decimal(12,2) NOT NULL COMMENT 'subtotal + igv',
  `fecha_emision` date NOT NULL,
  `fecha_vencimiento` date NOT NULL,
  `estado` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Pendiente',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `descuento` decimal(10,2) DEFAULT '0.00',
  `motivo_descuento` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `motivo_anulacion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_recibo_comprobante` (`numero_comprobante`),
  KEY `fk_recibo_lectura` (`lectura_id`),
  KEY `idx_recibo_usuario_estado` (`usuario_id`,`estado`),
  KEY `idx_recibo_periodo` (`periodo_id`),
  KEY `idx_recibo_vencimiento` (`fecha_vencimiento`,`estado`),
  CONSTRAINT `fk_recibo_lectura` FOREIGN KEY (`lectura_id`) REFERENCES `lectura` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_recibo_periodo` FOREIGN KEY (`periodo_id`) REFERENCES `periodo_facturacion` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_recibo_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_recibo_estado` CHECK ((`estado` in (_utf8mb4'Pendiente',_utf8mb4'Pagado',_utf8mb4'Pago Parcial',_utf8mb4'Vencido',_utf8mb4'Anulado'))),
  CONSTRAINT `chk_recibo_fechas` CHECK ((`fecha_vencimiento` > `fecha_emision`))
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Recibos de cobro emitidos a miembros del parque';

CREATE TABLE `recibo_cargo_dinamico` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recibo_id` int NOT NULL,
  `descripcion` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `monto` decimal(12,2) NOT NULL,
  `fecha_aplicacion` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_rcd_recibo` (`recibo_id`),
  CONSTRAINT `fk_rcd_recibo` FOREIGN KEY (`recibo_id`) REFERENCES `recibo` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rol` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_rol` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `permisos_json` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `rutas_json` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rol_nombre` (`nombre_rol`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Catálogo de roles del sistema con permisos dinámicos';

CREATE TABLE `usuario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rol_id` int NOT NULL,
  `documento_identidad` varchar(11) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_razonsocial` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `clave_acceso` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Hash bcrypt del password o PIN',
  `cargo_representante` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Cargo (staff) o Representante Legal (miembro)',
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `correo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `direccion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `es_activo` tinyint(1) NOT NULL DEFAULT '1',
  `saldo_a_favor` decimal(12,2) DEFAULT '0.00',
  `ultimo_acceso` timestamp NULL DEFAULT NULL COMMENT 'Timestamp del último login exitoso',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `actividad_rubro` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_usuario_documento` (`documento_identidad`),
  UNIQUE KEY `uq_usuario_correo` (`correo`),
  KEY `idx_usuario_rol_activo` (`rol_id`,`es_activo`),
  CONSTRAINT `fk_usuario_rol` FOREIGN KEY (`rol_id`) REFERENCES `rol` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_usuario_documento` CHECK (((length(`documento_identidad`) in (8,11)) and regexp_like(`documento_identidad`,_utf8mb4'^[0-9]+$')))
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Usuarios del sistema: staff operativo y miembros/inquilinos';
