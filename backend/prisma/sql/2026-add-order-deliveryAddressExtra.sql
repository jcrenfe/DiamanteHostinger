-- Piso / puerta / escalera que escribe el cliente aparte de la dirección (Google Maps no los conserva).
-- Ejecutar UNA vez en cada base de datos (local y producción/phpMyAdmin de Hostinger).
-- Si la columna ya existe dará "Duplicate column name": es inocuo.
ALTER TABLE `Order` ADD COLUMN `delivery_addressExtra` VARCHAR(191) NULL AFTER `delivery_addressOriginal`;
