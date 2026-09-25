-- Guarda la dirección tal como la escribió el cliente cuando Google Maps la ha corregido
-- (delivery_address/city/zip guardan la dirección corregida, la que se comunica al cliente).
-- Ejecutar UNA vez en cada base de datos (local y producción/phpMyAdmin de Hostinger).
-- Si la columna ya existe dará "Duplicate column name": es inocuo.
ALTER TABLE `Order` ADD COLUMN `delivery_addressOriginal` TEXT NULL AFTER `delivery_zip`;
