-- Necesaria para el webhook de Stripe (guarda el PaymentIntent y permite reembolsos automáticos).
-- Ejecutar UNA vez en cada base de datos (local y producción/phpMyAdmin de Hostinger).
-- Si la columna ya existe dará "Duplicate column name": es inocuo.
ALTER TABLE `Order` ADD COLUMN `stripePaymentIntent` VARCHAR(191) NULL AFTER `stripeSessionId`;
