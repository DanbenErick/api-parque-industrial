DELIMITER //

CREATE PROCEDURE AddColumnIfNotExists(
    IN dbName VARCHAR(255),
    IN tableName VARCHAR(255),
    IN columnName VARCHAR(255),
    IN columnDef VARCHAR(255)
)
BEGIN
    DECLARE count INT;
    SELECT COUNT(*) INTO count
    FROM information_schema.columns
    WHERE table_schema = dbName
      AND table_name = tableName
      AND column_name = columnName;

    IF count = 0 THEN
        SET @sql = CONCAT('ALTER TABLE ', tableName, ' ADD COLUMN ', columnName, ' ', columnDef);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //

DELIMITER ;

-- Ejecutar para la tabla medidor
CALL AddColumnIfNotExists(DATABASE(), 'medidor', 'demanda_maxima_fuera_punta', "DECIMAL(12,2) DEFAULT '0.00' COMMENT 'Demanda maxima base'");
CALL AddColumnIfNotExists(DATABASE(), 'medidor', 'demanda_maxima_punta', "DECIMAL(12,2) DEFAULT '0.00' COMMENT 'Demanda maxima punta base'");

-- Ejecutar para la tabla lectura
CALL AddColumnIfNotExists(DATABASE(), 'lectura', 'max_demanda_fuera_punta', "DECIMAL(12,2) DEFAULT '0.00'");
CALL AddColumnIfNotExists(DATABASE(), 'lectura', 'max_demanda_punta', "DECIMAL(12,2) DEFAULT '0.00'");

-- 1. Agregar las nuevas columnas para soportar la tarifa_mantenimiento_tiempo_real y el costo de potencia en periodos
CALL AddColumnIfNotExists(DATABASE(), 'periodo_facturacion', 'tarifa_mantenimiento_tiempo_real', "DECIMAL(10,2) DEFAULT '0.00'");
CALL AddColumnIfNotExists(DATABASE(), 'periodo_facturacion', 'costo_potencia', "DECIMAL(12,2) DEFAULT '0.00'");
CALL AddColumnIfNotExists(DATABASE(), 'periodo_facturacion', 'costo_potencia_fuera_punta', "DECIMAL(12,2) DEFAULT '0.00'");
CALL AddColumnIfNotExists(DATABASE(), 'periodo_facturacion', 'precio_energia_reactiva', "DECIMAL(10,4) DEFAULT '0.0000'");

-- Limpiar el procedimiento (eliminarlo tras su uso para no dejar rastro)
DROP PROCEDURE AddColumnIfNotExists;
