-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:        9.6.0 - MySQL Community Server - GPL
-- SO del servidor:              macos15
-- HeidiSQL Versión:            12.18.1.1
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


-- Volcando estructura de base de datos para parque_industrial_jicamarca
DROP DATABASE IF EXISTS `parque_industrial_jicamarca`;
CREATE DATABASE IF NOT EXISTS `parque_industrial_jicamarca` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `parque_industrial_jicamarca`;

-- Volcando estructura para tabla parque_industrial_jicamarca.auditoria_descargas
DROP TABLE IF EXISTS `auditoria_descargas`;
CREATE TABLE IF NOT EXISTS `auditoria_descargas` (
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

-- Volcando datos para la tabla parque_industrial_jicamarca.auditoria_descargas: ~20 rows (aproximadamente)
DELETE FROM `auditoria_descargas`;
INSERT INTO `auditoria_descargas` (`id`, `usuario_id`, `tipo_documento`, `referencia_id`, `fecha_descarga`, `detalles`) VALUES
	(16, 1, 'Recibo PDF V3', 37, '2026-06-13 07:37:29', 'Descarga de recibo individual REC-2026-0002'),
	(17, 1, 'Recibo PDF V3', 37, '2026-06-13 07:39:00', 'Descarga de recibo individual REC-2026-0002'),
	(18, 1, 'Recibo PDF V3', 37, '2026-06-13 07:39:32', 'Descarga de recibo individual REC-2026-0002'),
	(19, 1, 'Recibo PDF V3', 37, '2026-06-13 07:49:31', 'Descarga de recibo individual REC-2026-0002'),
	(20, 1, 'Recibo PDF V3', 36, '2026-06-13 21:20:12', 'Descarga de recibo individual REC-2026-0001'),
	(21, 1, 'Recibo PDF V3', 36, '2026-06-13 21:20:43', 'Descarga de recibo individual REC-2026-0001'),
	(22, 1, 'Recibo PDF V3', 36, '2026-06-13 21:20:58', 'Descarga de recibo individual REC-2026-0001'),
	(23, 1, 'Recibo PDF V3', 36, '2026-06-13 23:46:45', 'Descarga de recibo individual REC-2026-0001'),
	(24, 1, 'Recibo PDF V3', 37, '2026-06-13 23:47:15', 'Descarga de recibo individual REC-2026-0002'),
	(25, 1, 'Recibo PDF V3', 36, '2026-06-13 23:47:52', 'Descarga de recibo individual REC-2026-0001'),
	(26, 1, 'Recibo PDF V3', 36, '2026-06-13 23:48:01', 'Descarga de recibo individual REC-2026-0001'),
	(27, 29, 'Reporte Deudas Excel', NULL, '2026-06-14 22:18:27', 'Descarga de reporte de deudas general (0 recibos impagos)'),
	(28, 29, 'Recibo PDF V3', 38, '2026-06-15 03:35:24', 'Descarga de recibo individual REC-2026-0003'),
	(29, 29, 'Recibo PDF V3', 38, '2026-06-15 03:39:32', 'Descarga de recibo individual REC-2026-0003'),
	(30, 1, 'Recibo PDF V3', 40, '2026-06-16 08:28:38', 'Descarga de recibo individual REC-2026-0005'),
	(31, 1, 'Recibo PDF V3', 40, '2026-06-16 08:28:49', 'Descarga de recibo individual REC-2026-0005'),
	(32, 1, 'Recibo PDF V3', 40, '2026-06-16 08:28:57', 'Descarga de recibo individual REC-2026-0005'),
	(33, 1, 'Recibo PDF V3', 40, '2026-06-16 17:20:04', 'Descarga de recibo individual REC-2026-0005'),
	(34, 1, 'Recibo PDF V3', 40, '2026-06-16 17:34:59', 'Descarga de recibo individual REC-2026-0005'),
	(35, 1, 'Recibo PDF V3', 41, '2026-06-17 06:39:58', 'Descarga de recibo individual REC-2026-0006');

-- Volcando estructura para tabla parque_industrial_jicamarca.auditoria_sesiones
DROP TABLE IF EXISTS `auditoria_sesiones`;
CREATE TABLE IF NOT EXISTS `auditoria_sesiones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `fecha_ingreso` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `auditoria_sesiones_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuario` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla parque_industrial_jicamarca.auditoria_sesiones: ~15 rows (aproximadamente)
DELETE FROM `auditoria_sesiones`;
INSERT INTO `auditoria_sesiones` (`id`, `usuario_id`, `ip_address`, `user_agent`, `fecha_ingreso`) VALUES
	(1, 29, '38.19.229.24', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-14 22:00:20'),
	(2, 1, '38.250.159.176', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-14 22:17:57'),
	(3, 1, '38.250.159.176', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-14 22:18:22'),
	(4, 1, '38.250.159.176', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15', '2026-06-14 22:25:34'),
	(5, 1, '38.250.159.176', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-15 06:09:41'),
	(6, 1, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-15 15:38:02'),
	(7, 1, '38.250.159.176', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-15 15:40:15'),
	(8, 1, '38.250.159.176', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-15 15:40:39'),
	(9, 1, '38.250.159.176', 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1', '2026-06-15 20:26:40'),
	(10, 1, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15', '2026-06-16 02:19:07'),
	(11, 1, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15', '2026-06-16 08:24:08'),
	(12, 1, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15', '2026-06-16 17:42:50'),
	(13, 1, '::1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-17 06:37:19'),
	(14, 1, '38.250.159.176', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36', '2026-06-17 17:01:35'),
	(15, 1, '38.250.159.176', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.0 Safari/605.1.15', '2026-06-17 17:02:16');

-- Volcando estructura para tabla parque_industrial_jicamarca.catalogo_cargo
DROP TABLE IF EXISTS `catalogo_cargo`;
CREATE TABLE IF NOT EXISTS `catalogo_cargo` (
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

-- Volcando datos para la tabla parque_industrial_jicamarca.catalogo_cargo: ~2 rows (aproximadamente)
DELETE FROM `catalogo_cargo`;
INSERT INTO `catalogo_cargo` (`id`, `tipo`, `descripcion`, `monto_defecto`, `es_activo`, `created_at`, `updated_at`, `deleted_at`) VALUES
	(3, 'Costo', 'Mantenimiento', 10.00, 1, '2026-06-13 21:19:57', '2026-06-14 01:26:09', '2026-06-14 01:26:09'),
	(4, 'Costo', 'Cargo Fijo', 10.00, 1, '2026-06-14 01:26:02', '2026-06-14 01:26:02', NULL);

-- Volcando estructura para tabla parque_industrial_jicamarca.catalogo_cargo_periodo
DROP TABLE IF EXISTS `catalogo_cargo_periodo`;
CREATE TABLE IF NOT EXISTS `catalogo_cargo_periodo` (
  `catalogo_cargo_id` int NOT NULL,
  `periodo_facturacion_id` int NOT NULL,
  PRIMARY KEY (`catalogo_cargo_id`,`periodo_facturacion_id`),
  KEY `fk_ccp_periodo` (`periodo_facturacion_id`),
  CONSTRAINT `fk_ccp_cargo` FOREIGN KEY (`catalogo_cargo_id`) REFERENCES `catalogo_cargo` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ccp_periodo` FOREIGN KEY (`periodo_facturacion_id`) REFERENCES `periodo_facturacion` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla parque_industrial_jicamarca.catalogo_cargo_periodo: ~2 rows (aproximadamente)
DELETE FROM `catalogo_cargo_periodo`;
INSERT INTO `catalogo_cargo_periodo` (`catalogo_cargo_id`, `periodo_facturacion_id`) VALUES
	(3, 14),
	(3, 15);

-- Volcando estructura para tabla parque_industrial_jicamarca.configuracion
DROP TABLE IF EXISTS `configuracion`;
CREATE TABLE IF NOT EXISTS `configuracion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `monto_multa_base` decimal(10,2) DEFAULT '0.00',
  `monto_instalacion_base` decimal(10,2) DEFAULT '0.00',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Volcando datos para la tabla parque_industrial_jicamarca.configuracion: ~0 rows (aproximadamente)
DELETE FROM `configuracion`;

-- Volcando estructura para evento parque_industrial_jicamarca.evt_marcar_recibos_vencidos
DROP EVENT IF EXISTS `evt_marcar_recibos_vencidos`;
DELIMITER //
CREATE EVENT `evt_marcar_recibos_vencidos` ON SCHEDULE EVERY 1 DAY STARTS '2026-05-26 17:57:05' ON COMPLETION NOT PRESERVE ENABLE DO BEGIN
  -- Setear usuario del sistema para auditoría
  SET @current_user_id = 1;
  UPDATE `recibo`
  SET `estado` = 'Vencido'
  WHERE `estado` = 'Pendiente'
    AND `fecha_vencimiento` < CURDATE()
    AND `deleted_at` IS NULL;
END//
DELIMITER ;

-- Volcando estructura para tabla parque_industrial_jicamarca.historial_estado
DROP TABLE IF EXISTS `historial_estado`;
CREATE TABLE IF NOT EXISTS `historial_estado` (
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

-- Volcando datos para la tabla parque_industrial_jicamarca.historial_estado: ~3 rows (aproximadamente)
DELETE FROM `historial_estado`;
INSERT INTO `historial_estado` (`id`, `tabla_origen`, `registro_id`, `estado_anterior`, `estado_nuevo`, `cambiado_por`, `fecha_cambio`) VALUES
	(38, 'RECIBO', 36, 'Pendiente', 'Pagado', 1, '2026-06-13 07:15:26'),
	(39, 'RECIBO', 37, 'Pendiente', 'Vencido', 1, '2026-06-16 08:28:26'),
	(40, 'RECIBO', 41, 'Pendiente', 'Pagado', 1, '2026-06-17 06:40:24');

-- Volcando estructura para tabla parque_industrial_jicamarca.lectura
DROP TABLE IF EXISTS `lectura`;
CREATE TABLE IF NOT EXISTS `lectura` (
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
  PRIMARY KEY (`id`),
  KEY `fk_lectura_medidor` (`medidor_id`),
  KEY `idx_lectura_periodo_medidor` (`periodo_id`,`medidor_id`),
  KEY `idx_lectura_operario` (`operario_id`,`fecha_registro`),
  CONSTRAINT `fk_lectura_medidor` FOREIGN KEY (`medidor_id`) REFERENCES `medidor` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_lectura_operario` FOREIGN KEY (`operario_id`) REFERENCES `usuario` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_lectura_periodo` FOREIGN KEY (`periodo_id`) REFERENCES `periodo_facturacion` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_lectura_estado` CHECK ((`estado` in (_utf8mb4'Validado',_utf8mb4'Observado')))
) ENGINE=InnoDB AUTO_INCREMENT=45 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Lecturas de medidores eléctricos registradas por operarios';

-- Volcando datos para la tabla parque_industrial_jicamarca.lectura: ~5 rows (aproximadamente)
DELETE FROM `lectura`;
INSERT INTO `lectura` (`id`, `medidor_id`, `operario_id`, `periodo_id`, `lectura_anterior`, `lectura_actual`, `consumo_calculado`, `lectura_anterior_punta`, `lectura_actual_punta`, `factor_potencia`, `precio_factor_potencia`, `fecha_registro`, `estado`, `created_at`, `updated_at`, `deleted_at`, `justificacion`, `es_cambio_medidor`, `lectura_final_viejo`, `lectura_inicial_nuevo`, `lectura_final_viejo_punta`, `lectura_inicial_nuevo_punta`) VALUES
	(40, 10, 1, 14, 0.00, 25.00, 0.000, 0.00, 0.00, 0.0000, 0.0000, '2026-06-13 07:12:22', 'Validado', '2026-06-13 07:12:22', '2026-06-13 07:12:22', NULL, NULL, 0, NULL, NULL, NULL, NULL),
	(41, 11, 1, 14, 0.00, 50.05, 0.000, 0.00, 30.50, 50.0000, 1.5000, '2026-06-13 07:36:15', 'Validado', '2026-06-13 07:36:15', '2026-06-13 07:36:15', NULL, NULL, 0, NULL, NULL, NULL, NULL),
	(42, 10, 1, 15, 25.00, 80.00, 105.000, 0.00, 0.00, 0.0000, 0.0000, '2026-06-13 23:12:18', 'Validado', '2026-06-13 23:12:18', '2026-06-13 23:12:18', NULL, NULL, 1, 50.00, NULL, NULL, NULL),
	(43, 11, 1, 15, 50.05, 30.00, 39.950, 30.50, 40.00, 1.0000, 9.0000, '2026-06-13 23:21:47', 'Validado', '2026-06-13 23:21:47', '2026-06-13 23:21:47', NULL, NULL, 1, 60.00, NULL, NULL, NULL),
	(44, 10, 1, 17, 80.00, 100.00, 20.000, 0.00, 0.00, 0.0000, 0.0000, '2026-06-17 06:39:12', 'Validado', '2026-06-17 06:39:12', '2026-06-17 06:49:13', NULL, 'mala lectura ok', 0, NULL, NULL, NULL, NULL);

-- Volcando estructura para tabla parque_industrial_jicamarca.medidor
DROP TABLE IF EXISTS `medidor`;
CREATE TABLE IF NOT EXISTS `medidor` (
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

-- Volcando datos para la tabla parque_industrial_jicamarca.medidor: ~2 rows (aproximadamente)
DELETE FROM `medidor`;
INSERT INTO `medidor` (`id`, `usuario_id`, `num_serie`, `operativo`, `created_at`, `updated_at`, `deleted_at`, `cobro_instalacion_pendiente`, `tipo`) VALUES
	(10, 26, 'MED-000001', 1, '2026-06-13 07:07:48', '2026-06-13 07:13:12', NULL, 0, 'Normal'),
	(11, 27, '0000002', 1, '2026-06-13 07:18:20', '2026-06-13 07:36:54', NULL, 0, 'Tiempo Real');

-- Volcando estructura para tabla parque_industrial_jicamarca.pago
DROP TABLE IF EXISTS `pago`;
CREATE TABLE IF NOT EXISTS `pago` (
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

-- Volcando datos para la tabla parque_industrial_jicamarca.pago: ~2 rows (aproximadamente)
DELETE FROM `pago`;
INSERT INTO `pago` (`id`, `recibo_id`, `monto_pagado`, `metodo_pago`, `numero_operacion`, `fecha_pago`, `estado_validacion`, `created_at`, `updated_at`, `deleted_at`) VALUES
	(10, 36, 24.00, 'Transferencia', '0001', '2026-06-13 07:15:26', 'Confirmado', '2026-06-13 07:15:26', '2026-06-13 07:15:26', NULL),
	(11, 41, 21.02, 'Transferencia', NULL, '2026-06-17 06:40:24', 'Confirmado', '2026-06-17 06:40:24', '2026-06-17 06:40:24', NULL);

-- Volcando estructura para tabla parque_industrial_jicamarca.periodo_facturacion
DROP TABLE IF EXISTS `periodo_facturacion`;
CREATE TABLE IF NOT EXISTS `periodo_facturacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mes_anio` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ej. Oct 2024',
  `factor_multiplicador` decimal(6,4) NOT NULL DEFAULT '1.0000',
  `tarifa_kwh` decimal(10,4) NOT NULL COMMENT 'Precio por kWh de energía eléctrica',
  `tarifa_kwh_punta` decimal(10,4) NOT NULL DEFAULT '0.0000',
  `tarifa_mantenimiento_normal` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Cargo mensual de mantenimiento medidor normal',
  `tarifa_mantenimiento_tiempo_real` decimal(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Cargo mensual de mantenimiento medidor tiempo real',
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_periodo_mes` (`mes_anio`),
  CONSTRAINT `chk_periodo_fechas` CHECK ((`fecha_fin` > `fecha_inicio`))
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Períodos de facturación con tarifas centralizadas';

-- Volcando datos para la tabla parque_industrial_jicamarca.periodo_facturacion: ~4 rows (aproximadamente)
DELETE FROM `periodo_facturacion`;
INSERT INTO `periodo_facturacion` (`id`, `mes_anio`, `factor_multiplicador`, `tarifa_kwh`, `tarifa_kwh_punta`, `tarifa_mantenimiento_normal`, `tarifa_mantenimiento_tiempo_real`, `fecha_inicio`, `fecha_fin`, `created_at`, `updated_at`, `deleted_at`) VALUES
	(14, '2026-05', 1.0000, 0.5600, 0.5800, 10.00, 5.00, '2026-05-01', '2026-05-31', '2026-06-13 07:11:58', '2026-06-13 07:11:58', NULL),
	(15, '2026-06', 1.0000, 0.6000, 0.4300, 4.00, 3.00, '2026-06-01', '2026-06-30', '2026-06-13 07:52:32', '2026-06-13 07:52:32', NULL),
	(16, '2026-01', 1.0000, 0.5300, 28.9700, 10.00, 10.00, '2026-06-14', '2026-06-22', '2026-06-15 03:34:34', '2026-06-15 03:34:34', NULL),
	(17, '2026-07', 1.0000, 0.5800, 0.6000, 10.00, 10.00, '2026-07-01', '2026-07-31', '2026-06-17 06:38:54', '2026-06-17 06:38:54', NULL);

-- Volcando estructura para tabla parque_industrial_jicamarca.recibo
DROP TABLE IF EXISTS `recibo`;
CREATE TABLE IF NOT EXISTS `recibo` (
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

-- Volcando datos para la tabla parque_industrial_jicamarca.recibo: ~6 rows (aproximadamente)
DELETE FROM `recibo`;
INSERT INTO `recibo` (`id`, `usuario_id`, `periodo_id`, `lectura_id`, `numero_comprobante`, `cargo_energia`, `cargo_energia_punta`, `cargo_factor_potencia`, `cargo_mantenimiento`, `cargo_fijo`, `cargo_corte`, `multa_manipulacion`, `multa_reconexion`, `instalacion_medidor`, `deuda_pendiente`, `deuda_consumo`, `deuda_vencida`, `subtotal`, `igv`, `total`, `fecha_emision`, `fecha_vencimiento`, `estado`, `created_at`, `updated_at`, `deleted_at`, `descuento`, `motivo_descuento`, `motivo_anulacion`) VALUES
	(36, 26, 14, 40, 'REC-2026-0001', 14.00, 0.00, 0.00, 10.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 24.00, 0.00, 24.00, '2026-06-13', '2026-06-20', 'Pagado', '2026-06-13 07:13:12', '2026-06-13 07:15:26', NULL, 0.00, NULL, NULL),
	(37, 27, 14, 41, 'REC-2026-0002', 28.03, 17.69, 75.00, 5.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 125.72, 0.00, 125.72, '2026-06-13', '2026-06-20', 'Vencido', '2026-06-13 07:36:54', '2026-06-16 08:28:26', NULL, 0.00, NULL, NULL),
	(38, 28, 14, NULL, 'REC-2026-0003', 0.00, 0.00, 0.00, 0.00, 10.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 10.00, 0.00, 10.00, '2026-06-13', '2026-06-20', 'Pendiente', '2026-06-13 07:36:54', '2026-06-13 07:36:54', NULL, 0.00, NULL, NULL),
	(39, 28, 15, NULL, 'REC-2026-0004', 0.00, 0.00, 0.00, 0.00, 10.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 10.00, 20.00, 0.00, 20.00, '2026-06-13', '2026-06-20', 'Pendiente', '2026-06-13 23:35:42', '2026-06-13 23:35:42', NULL, 0.00, NULL, NULL),
	(40, 27, 15, 43, 'REC-2026-0005', 23.97, 4.09, 9.00, 3.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 125.72, 165.78, 0.00, 165.78, '2026-06-16', '2026-06-23', 'Pendiente', '2026-06-16 08:28:26', '2026-06-16 08:28:26', NULL, 0.00, NULL, NULL),
	(41, 26, 17, 44, 'REC-2026-0006', 11.02, 0.00, 0.00, 10.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 21.02, 0.00, 21.02, '2026-06-17', '2026-06-24', 'Pagado', '2026-06-17 06:39:52', '2026-06-17 06:40:24', NULL, 0.00, NULL, NULL);

-- Volcando estructura para tabla parque_industrial_jicamarca.recibo_cargo_dinamico
DROP TABLE IF EXISTS `recibo_cargo_dinamico`;
CREATE TABLE IF NOT EXISTS `recibo_cargo_dinamico` (
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

-- Volcando datos para la tabla parque_industrial_jicamarca.recibo_cargo_dinamico: ~0 rows (aproximadamente)
DELETE FROM `recibo_cargo_dinamico`;

-- Volcando estructura para tabla parque_industrial_jicamarca.rol
DROP TABLE IF EXISTS `rol`;
CREATE TABLE IF NOT EXISTS `rol` (
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

-- Volcando datos para la tabla parque_industrial_jicamarca.rol: ~3 rows (aproximadamente)
DELETE FROM `rol`;
INSERT INTO `rol` (`id`, `nombre_rol`, `permisos_json`, `created_at`, `updated_at`, `deleted_at`, `rutas_json`) VALUES
	(1, 'Admin', '{"pagos": "CRUD", "recibos": "CRUD", "lecturas": "CRUD", "periodos": "CRUD", "reportes": "R", "usuarios": "CRUD", "medidores": "CRUD", "configuracion": "CRUD"}', '2026-05-26 22:57:05', '2026-05-30 22:29:53', NULL, '["dashboard", "tenants", "billing", "payments", "reports", "manual_billing", "users", "settings"]'),
	(2, 'Operario', '{"recibos": "R", "lecturas": "CR", "usuarios": "CR", "medidores": "R"}', '2026-05-26 22:57:05', '2026-05-30 22:29:53', NULL, '["dashboard", "tenants", "billing", "reports", "manual_billing"]'),
	(3, 'Socio', '{"pagos": "CR", "recibos": "R", "lecturas": "R"}', '2026-05-26 22:57:05', '2026-06-04 20:57:45', NULL, '["dashboard", "billing", "payments"]');

-- Volcando estructura para procedimiento parque_industrial_jicamarca.sp_generar_recibos
DROP PROCEDURE IF EXISTS `sp_generar_recibos`;
DELIMITER //
CREATE PROCEDURE `sp_generar_recibos`(
  IN p_periodo_id INT,
  IN p_admin_id   INT
)
BEGIN
  DECLARE v_tarifa_kwh DECIMAL(10,4);
  DECLARE v_factor     DECIMAL(6,4);
  DECLARE v_tarifa_mant DECIMAL(10,2);
  DECLARE v_fecha_fin  DATE;
  DECLARE v_mes_anio   VARCHAR(20);
  -- Obtener datos del período
  SELECT `tarifa_kwh`, `factor_multiplicador`, `tarifa_mantenimiento`,
         `fecha_fin`, `mes_anio`
  INTO v_tarifa_kwh, v_factor, v_tarifa_mant, v_fecha_fin, v_mes_anio
  FROM `periodo_facturacion`
  WHERE `id` = p_periodo_id AND `deleted_at` IS NULL;
  -- Generar recibos para cada miembro con lectura en el período
  INSERT INTO `recibo` (
    `usuario_id`, `periodo_id`, `lectura_id`,
    `numero_comprobante`,
    `cargo_energia`, `cargo_mantenimiento`,
    `subtotal`, `igv`, `total`,
    `fecha_emision`, `fecha_vencimiento`, `estado`
  )
  SELECT
    m.`usuario_id`,
    p_periodo_id,
    l.`id`,
    CONCAT('REC-', DATE_FORMAT(v_fecha_fin, '%Y'), '-', LPAD(ROW_NUMBER() OVER (ORDER BY m.`usuario_id`), 4, '0')),
    ROUND(l.`consumo_calculado` * v_tarifa_kwh * v_factor, 2),
    v_tarifa_mant,
    ROUND(l.`consumo_calculado` * v_tarifa_kwh * v_factor + v_tarifa_mant, 2),
    ROUND((l.`consumo_calculado` * v_tarifa_kwh * v_factor + v_tarifa_mant) * 0.18, 2),
    ROUND((l.`consumo_calculado` * v_tarifa_kwh * v_factor + v_tarifa_mant) * 1.18, 2),
    CURDATE(),
    DATE_ADD(CURDATE(), INTERVAL 15 DAY),
    'Pendiente'
  FROM `lectura` l
  INNER JOIN `medidor` m ON m.`id` = l.`medidor_id`
  WHERE l.`periodo_id` = p_periodo_id
    AND l.`estado` = 'Validado'
    AND l.`deleted_at` IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM `recibo` r
      WHERE r.`usuario_id` = m.`usuario_id`
        AND r.`periodo_id` = p_periodo_id
        AND r.`deleted_at` IS NULL
    );
  -- Setear usuario para los triggers
  SET @current_user_id = p_admin_id;
  SELECT CONCAT('Recibos generados para el período: ', v_mes_anio) AS resultado;
END//
DELIMITER ;

-- Volcando estructura para tabla parque_industrial_jicamarca.usuario
DROP TABLE IF EXISTS `usuario`;
CREATE TABLE IF NOT EXISTS `usuario` (
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

-- Volcando datos para la tabla parque_industrial_jicamarca.usuario: ~6 rows (aproximadamente)
DELETE FROM `usuario`;
INSERT INTO `usuario` (`id`, `rol_id`, `documento_identidad`, `nombre_razonsocial`, `clave_acceso`, `cargo_representante`, `telefono`, `correo`, `direccion`, `es_activo`, `saldo_a_favor`, `ultimo_acceso`, `created_at`, `updated_at`, `deleted_at`, `actividad_rubro`) VALUES
	(1, 1, '04015514', 'Erick', '$2a$10$eYRgT.CF5Ka1fbLOMThvvekHWv.OYXgRJ6IIcME/zt0kkoUBZObRe', '', '', '', 'Direccion de ejemplo', 1, 0.00, '2026-06-17 17:02:16', '2026-05-26 22:57:05', '2026-06-17 17:02:16', NULL, NULL),
	(25, 1, '73028967', 'Sheyla Rojas M', '$2b$10$K55.7P3sn4PpTu91/WUOY.ixqq2hRt9lDHIPaFQluTtvp6pf8qEcu', 'Gerente', '999888777', 'smheylas@gmail.com', 'Calle lima', 1, 0.00, NULL, '2026-06-13 07:05:38', '2026-06-17 06:50:12', NULL, NULL),
	(26, 3, '10000000000', 'Empresa A', '$2b$10$kHPLKkX6hbBwanIrE9laLu27xjqyX5Rrs2uXwmlbu5eGaBJZPEv9S', 'Representante 1', '999999999', 'representante@gmail.com', 'Parque industrial ', 1, 0.00, NULL, '2026-06-13 07:07:48', '2026-06-14 22:17:36', NULL, 'Manufactura'),
	(27, 3, '20000000000', 'Empresa B', '$2b$10$COi/BTvcIJI88PpxueGJcujNIH1yb2peJAqkBj4GAglARavAw/Xv6', 'Representante B', '920370271', 'repre@gnail.con', 'Dirección 2', 1, 0.00, NULL, '2026-06-13 07:18:20', '2026-06-14 22:17:33', NULL, 'Químicos'),
	(28, 3, '00000000', 'nmre', '$2b$10$MPJ.0/RJ8X9DhnxE2DQhhe2uyP5kGWa88/Nu5d2HVXRNX7W2SdwNC', 'Adrián Lázaro, Manuel', '999999955', 'repre3@gmail.com', 'Taller Vivinda ', 1, 0.00, NULL, '2026-06-13 07:19:40', '2026-06-15 03:44:52', NULL, 'General'),
	(29, 1, '10050400', 'Bernardino Chaico Ventura', '$2b$10$v1xs61ay1KqNEg5H2G5WkuPhwL.uKb71Zxzt8SfsKnpAVZ1F4bj8.', 'Encargados', '988676688', 'chaico@gmail.com', 'Parque Industrial Jicamarca', 1, 0.00, '2026-06-14 22:00:20', '2026-06-13 22:38:56', '2026-06-14 22:00:20', NULL, NULL);

-- Volcando estructura para vista parque_industrial_jicamarca.v_consumo_por_periodo
DROP VIEW IF EXISTS `v_consumo_por_periodo`;
-- Creando tabla temporal para superar errores de dependencia de VIEW
CREATE TABLE `v_consumo_por_periodo` (
	`periodo` VARCHAR(1) NOT NULL COMMENT 'Ej. Oct 2024' COLLATE 'utf8mb4_unicode_ci',
	`miembro` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`medidor` VARCHAR(1) NOT NULL COMMENT 'Número de serie del equipo' COLLATE 'utf8mb4_unicode_ci',
	`lectura_anterior` DECIMAL(12,2) NOT NULL COMMENT 'Valor previo en kWh',
	`lectura_actual` DECIMAL(12,2) NOT NULL COMMENT 'Valor actual en kWh',
	`consumo_kwh` DECIMAL(12,3) NOT NULL,
	`estado_lectura` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`operario` VARCHAR(1) NOT NULL COLLATE 'utf8mb4_unicode_ci',
	`fecha_registro` TIMESTAMP NOT NULL
);

-- Volcando estructura para vista parque_industrial_jicamarca.v_dashboard_cobranza
DROP VIEW IF EXISTS `v_dashboard_cobranza`;
-- Creando tabla temporal para superar errores de dependencia de VIEW
CREATE TABLE `v_dashboard_cobranza` (
	`periodo` VARCHAR(1) NOT NULL COMMENT 'Ej. Oct 2024' COLLATE 'utf8mb4_unicode_ci',
	`total_recibos` BIGINT NOT NULL,
	`pagados` DECIMAL(23,0) NULL,
	`pendientes` DECIMAL(23,0) NULL,
	`vencidos` DECIMAL(23,0) NULL,
	`monto_total` DECIMAL(34,2) NULL,
	`monto_cobrado` DECIMAL(34,2) NULL,
	`monto_pendiente` DECIMAL(34,2) NULL
);

-- Volcando estructura para vista parque_industrial_jicamarca.v_recibos_pendientes
DROP VIEW IF EXISTS `v_recibos_pendientes`;
-- Creando tabla temporal para superar errores de dependencia de VIEW
CREATE TABLE `v_recibos_pendientes` 
);

-- Volcando estructura para vista parque_industrial_jicamarca.v_usuarios_activos
DROP VIEW IF EXISTS `v_usuarios_activos`;
-- Creando tabla temporal para superar errores de dependencia de VIEW
CREATE TABLE `v_usuarios_activos` 
);

-- Volcando estructura para disparador parque_industrial_jicamarca.trg_pago_estado_update
DROP TRIGGER IF EXISTS `trg_pago_estado_update`;
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `trg_pago_estado_update` BEFORE UPDATE ON `pago` FOR EACH ROW BEGIN
  IF OLD.`estado_validacion` <> NEW.`estado_validacion` THEN
    INSERT INTO `historial_estado` (
      `tabla_origen`, `registro_id`,
      `estado_anterior`, `estado_nuevo`,
      `cambiado_por`
    ) VALUES (
      'PAGO', OLD.`id`,
      OLD.`estado_validacion`, NEW.`estado_validacion`,
      @current_user_id
    );
  END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Volcando estructura para disparador parque_industrial_jicamarca.trg_recibo_estado_update
DROP TRIGGER IF EXISTS `trg_recibo_estado_update`;
SET @OLDTMP_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';
DELIMITER //
CREATE TRIGGER `trg_recibo_estado_update` BEFORE UPDATE ON `recibo` FOR EACH ROW BEGIN
  IF OLD.`estado` <> NEW.`estado` THEN
    INSERT INTO `historial_estado` (
      `tabla_origen`, `registro_id`,
      `estado_anterior`, `estado_nuevo`,
      `cambiado_por`
    ) VALUES (
      'RECIBO', OLD.`id`,
      OLD.`estado`, NEW.`estado`,
      @current_user_id
    );
  END IF;
END//
DELIMITER ;
SET SQL_MODE=@OLDTMP_SQL_MODE;

-- Eliminando tabla temporal y crear estructura final de VIEW
DROP TABLE IF EXISTS `v_consumo_por_periodo`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_consumo_por_periodo` AS select `pf`.`mes_anio` AS `periodo`,`u`.`nombre_razonsocial` AS `miembro`,`m`.`num_serie` AS `medidor`,`l`.`lectura_anterior` AS `lectura_anterior`,`l`.`lectura_actual` AS `lectura_actual`,`l`.`consumo_calculado` AS `consumo_kwh`,`l`.`estado` AS `estado_lectura`,`op`.`nombre_razonsocial` AS `operario`,`l`.`fecha_registro` AS `fecha_registro` from ((((`lectura` `l` join `medidor` `m` on((`m`.`id` = `l`.`medidor_id`))) join `usuario` `u` on((`u`.`id` = `m`.`usuario_id`))) join `usuario` `op` on((`op`.`id` = `l`.`operario_id`))) join `periodo_facturacion` `pf` on((`pf`.`id` = `l`.`periodo_id`))) where (`l`.`deleted_at` is null) order by `pf`.`fecha_inicio` desc,`u`.`nombre_razonsocial`
;

-- Eliminando tabla temporal y crear estructura final de VIEW
DROP TABLE IF EXISTS `v_dashboard_cobranza`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_dashboard_cobranza` AS select `pf`.`mes_anio` AS `periodo`,count(`rec`.`id`) AS `total_recibos`,sum((case when (`rec`.`estado` = 'Pagado') then 1 else 0 end)) AS `pagados`,sum((case when (`rec`.`estado` = 'Pendiente') then 1 else 0 end)) AS `pendientes`,sum((case when (`rec`.`estado` = 'Vencido') then 1 else 0 end)) AS `vencidos`,sum(`rec`.`total`) AS `monto_total`,sum((case when (`rec`.`estado` = 'Pagado') then `rec`.`total` else 0 end)) AS `monto_cobrado`,sum((case when (`rec`.`estado` <> 'Pagado') then `rec`.`total` else 0 end)) AS `monto_pendiente` from (`recibo` `rec` join `periodo_facturacion` `pf` on((`pf`.`id` = `rec`.`periodo_id`))) where (`rec`.`deleted_at` is null) group by `pf`.`id`,`pf`.`mes_anio` order by `pf`.`fecha_inicio` desc
;

-- Eliminando tabla temporal y crear estructura final de VIEW
DROP TABLE IF EXISTS `v_recibos_pendientes`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_recibos_pendientes` AS select `rec`.`id` AS `id`,`rec`.`numero_comprobante` AS `numero_comprobante`,`u`.`nombre_razonsocial` AS `miembro`,`u`.`documento_identidad` AS `ruc_dni`,`u`.`id_manzana` AS `id_manzana`,`u`.`lote` AS `lote`,`pf`.`mes_anio` AS `periodo`,`rec`.`cargo_energia` AS `cargo_energia`,`rec`.`cargo_mantenimiento` AS `cargo_mantenimiento`,`rec`.`subtotal` AS `subtotal`,`rec`.`igv` AS `igv`,`rec`.`total` AS `total`,`rec`.`fecha_emision` AS `fecha_emision`,`rec`.`fecha_vencimiento` AS `fecha_vencimiento`,`rec`.`estado` AS `estado`,(to_days(`rec`.`fecha_vencimiento`) - to_days(curdate())) AS `dias_restantes` from ((`recibo` `rec` join `usuario` `u` on((`u`.`id` = `rec`.`usuario_id`))) join `periodo_facturacion` `pf` on((`pf`.`id` = `rec`.`periodo_id`))) where ((`rec`.`deleted_at` is null) and (`rec`.`estado` in ('Pendiente','Vencido'))) order by `rec`.`fecha_vencimiento`
;

-- Eliminando tabla temporal y crear estructura final de VIEW
DROP TABLE IF EXISTS `v_usuarios_activos`;
CREATE ALGORITHM=UNDEFINED SQL SECURITY DEFINER VIEW `v_usuarios_activos` AS select `u`.`id` AS `id`,`u`.`documento_identidad` AS `documento_identidad`,`u`.`nombre_razonsocial` AS `nombre_razonsocial`,`r`.`nombre_rol` AS `nombre_rol`,`u`.`cargo_representante` AS `cargo_representante`,`u`.`correo` AS `correo`,`u`.`telefono` AS `telefono`,`u`.`id_manzana` AS `id_manzana`,`u`.`lote` AS `lote`,`u`.`es_activo` AS `es_activo`,`u`.`ultimo_acceso` AS `ultimo_acceso` from (`usuario` `u` join `rol` `r` on((`r`.`id` = `u`.`rol_id`))) where (`u`.`deleted_at` is null)
;

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
