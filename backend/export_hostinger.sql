-- MySQL dump 10.13  Distrib 8.4.11, for Linux (x86_64)
--
-- Host: localhost    Database: diamante_db
-- ------------------------------------------------------
-- Server version	8.4.11

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Campaign`
--

DROP TABLE IF EXISTS `Campaign`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Campaign` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Campaign`
--

LOCK TABLES `Campaign` WRITE;
/*!40000 ALTER TABLE `Campaign` DISABLE KEYS */;
INSERT INTO `Campaign` VALUES ('UCaZ8f8sWEllnTN2sOV0','Campaña sin título','','','completed','2026-07-14 17:27:30.819','2026-08-04 10:22:07.894');
/*!40000 ALTER TABLE `Campaign` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Category`
--

DROP TABLE IF EXISTS `Category`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Category` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `isDefault` tinyint(1) NOT NULL DEFAULT '0',
  `order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Category`
--

LOCK TABLES `Category` WRITE;
/*!40000 ALTER TABLE `Category` DISABLE KEYS */;
INSERT INTO `Category` VALUES ('bebés','Desayuno infantil',NULL,'2026-08-04 10:11:01.497',0,3),('desayunos','Desayunos',NULL,'2026-08-04 18:51:24.480',1,1),('especiales','Productos adicionales',NULL,'2026-08-04 10:11:01.543',0,5),('frutas','Cestas de fruta',NULL,'2026-08-04 10:11:01.589',0,2),('meriendas','Merienda y brunch',NULL,'2026-08-04 10:11:01.616',0,4);
/*!40000 ALTER TABLE `Category` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Configuration`
--

DROP TABLE IF EXISTS `Configuration`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Configuration` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` json NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Configuration`
--

LOCK TABLES `Configuration` WRITE;
/*!40000 ALTER TABLE `Configuration` DISABLE KEYS */;
INSERT INTO `Configuration` VALUES ('citas','{\"endHour\": 13, \"startHour\": 8, \"bufferSlots\": 1, \"intervalMinutes\": \"60\"}'),('disponibilidad','{\"dailySlots\": {\"0\": [], \"1\": [{\"end\": \"13:00\", \"start\": \"09:00\"}, {\"end\": \"18:00\", \"start\": \"14:00\"}, {\"end\": \"20:00\", \"start\": \"18:00\"}], \"2\": [{\"end\": \"13:00\", \"start\": \"09:00\"}, {\"end\": \"18:00\", \"start\": \"14:00\"}, {\"end\": \"20:00\", \"start\": \"18:00\"}], \"3\": [{\"end\": \"13:00\", \"start\": \"09:00\"}, {\"end\": \"18:00\", \"start\": \"14:00\"}, {\"end\": \"20:00\", \"start\": \"18:00\"}], \"4\": [{\"end\": \"13:00\", \"start\": \"09:00\"}, {\"end\": \"18:00\", \"start\": \"14:00\"}, {\"end\": \"20:00\", \"start\": \"18:00\"}], \"5\": [{\"end\": \"13:00\", \"start\": \"09:00\"}, {\"end\": \"18:00\", \"start\": \"14:00\"}, {\"end\": \"20:00\", \"start\": \"18:00\"}], \"6\": []}, \"deliveryDays\": [\"2026-03-04\", \"2026-03-05\", \"2026-03-06\", \"2026-03-08\", \"2026-03-09\", \"2026-03-10\", \"2026-03-11\", \"2026-03-12\", \"2026-03-13\", \"2026-03-15\", \"2026-03-16\", \"2026-03-17\", \"2026-03-18\", \"2026-03-22\", \"2026-03-23\", \"2026-03-24\", \"2026-03-25\", \"2026-03-26\", \"2026-03-27\", \"2026-03-28\", \"2026-03-31\", \"2026-04-01\", \"2026-04-02\", \"2026-04-03\", \"2026-04-04\", \"2026-04-05\", \"2026-04-06\", \"2026-04-07\", \"2026-04-08\", \"2026-04-09\", \"2026-04-10\", \"2026-04-11\", \"2026-04-12\", \"2026-04-13\", \"2026-04-14\", \"2026-04-15\", \"2026-04-16\", \"2026-04-17\", \"2026-04-18\", \"2026-04-19\", \"2026-04-20\", \"2026-04-21\", \"2026-04-22\", \"2026-04-23\", \"2026-04-24\", \"2026-04-25\", \"2026-04-26\", \"2026-04-27\", \"2026-04-28\", \"2026-04-29\", \"2026-04-30\", \"2026-05-01\", \"2026-05-02\", \"2026-05-03\", \"2026-05-04\", \"2026-05-05\", \"2026-05-06\", \"2026-05-07\", \"2026-05-08\", \"2026-05-09\", \"2026-05-10\", \"2026-05-11\", \"2026-05-12\", \"2026-05-13\", \"2026-05-14\", \"2026-05-15\", \"2026-05-16\", \"2026-05-17\", \"2026-05-18\", \"2026-05-19\", \"2026-05-20\", \"2026-05-21\", \"2026-05-22\", \"2026-05-23\", \"2026-05-24\", \"2026-05-25\", \"2026-05-26\", \"2026-05-27\", \"2026-05-28\", \"2026-05-29\", \"2026-05-30\", \"2026-05-31\", \"2026-06-01\", \"2026-06-02\", \"2026-06-03\", \"2026-06-04\", \"2026-06-05\", \"2026-06-06\", \"2026-06-07\", \"2026-06-08\", \"2026-06-09\", \"2026-06-10\", \"2026-06-11\", \"2026-06-12\", \"2026-06-13\", \"2026-06-14\", \"2026-06-15\", \"2026-06-16\", \"2026-06-17\", \"2026-06-18\", \"2026-06-19\", \"2026-06-20\", \"2026-06-21\", \"2026-06-22\", \"2026-06-23\", \"2026-06-24\", \"2026-06-25\", \"2026-06-26\", \"2026-06-27\", \"2026-06-28\", \"2026-06-29\", \"2026-06-30\", \"2026-07-01\", \"2026-07-02\", \"2026-07-03\", \"2026-07-04\", \"2026-07-05\", \"2026-07-06\", \"2026-07-07\", \"2026-07-08\", \"2026-07-09\", \"2026-07-10\", \"2026-07-11\", \"2026-07-12\", \"2026-07-13\", \"2026-07-14\", \"2026-07-15\", \"2026-07-16\", \"2026-07-17\", \"2026-07-18\", \"2026-07-19\", \"2026-07-20\", \"2026-07-21\", \"2026-07-22\", \"2026-07-23\", \"2026-07-24\", \"2026-07-25\", \"2026-09-06\", \"2026-09-07\", \"2026-09-08\", \"2026-09-09\", \"2026-09-10\", \"2026-09-11\", \"2026-09-12\", \"2026-09-13\", \"2026-09-14\", \"2026-09-15\", \"2026-09-16\", \"2026-09-17\", \"2026-09-18\", \"2026-09-19\", \"2026-09-20\", \"2026-09-21\", \"2026-09-22\", \"2026-09-23\", \"2026-09-24\", \"2026-09-25\", \"2026-09-26\", \"2026-09-27\", \"2026-09-28\", \"2026-09-29\", \"2026-09-30\", \"2026-10-01\", \"2026-10-02\", \"2026-10-03\", \"2026-10-04\", \"2026-10-05\", \"2026-10-06\", \"2026-10-07\", \"2026-10-08\", \"2026-10-09\", \"2026-10-10\", \"2026-10-11\", \"2026-10-12\", \"2026-10-13\", \"2026-10-14\", \"2026-10-15\", \"2026-10-16\", \"2026-10-17\", \"2026-10-18\", \"2026-10-19\", \"2026-10-20\", \"2026-10-21\", \"2026-10-22\", \"2026-10-23\", \"2026-10-24\", \"2026-10-25\", \"2026-10-26\", \"2026-10-27\", \"2026-10-28\", \"2026-10-29\", \"2026-08-23\", \"2026-08-26\", \"2026-08-24\", \"2026-08-25\", \"2026-08-09\", \"2026-08-10\", \"2026-08-11\", \"2026-08-12\", \"2026-08-13\", \"2026-08-02\", \"2026-08-05\", \"2026-08-06\", \"2026-08-07\", \"2026-08-08\", \"2026-08-14\", \"2026-08-15\", \"2026-08-16\", \"2026-08-17\", \"2026-08-18\", \"2026-08-19\", \"2026-08-20\", \"2026-08-21\", \"2026-08-22\", \"2026-08-27\", \"2026-08-28\", \"2026-08-29\"], \"blockingRules\": {\"far\": {\"afterMinutes\": 90, \"beforeMinutes\": 120}, \"near\": {\"afterMinutes\": 30, \"beforeMinutes\": 60}, \"medium\": {\"afterMinutes\": 60, \"beforeMinutes\": 90}}}');
/*!40000 ALTER TABLE `Configuration` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Offer`
--

DROP TABLE IF EXISTS `Offer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Offer` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  `backgroundColor` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `backgroundImage` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `code` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discountPercent` double DEFAULT NULL,
  `imageUrl` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ribbonColor` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ribbonText` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ribbonTextColor` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'banner',
  `validUntil` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Offer`
--

LOCK TABLES `Offer` WRITE;
/*!40000 ALTER TABLE `Offer` DISABLE KEYS */;
INSERT INTO `Offer` VALUES ('0a8486ed-747e-403a-a466-30d9fb71ca42','oferta prueba','erewrewr',1,'2026-08-04 18:02:40.576','2026-08-04 18:02:40.576','#8B4513',NULL,NULL,NULL,NULL,'bizcocho-de-cumpleaños','#bf0d7e','¡DESTACADO!','#ffffff','product_deal',NULL),('5B5vS4yvWJCO1G6VAcYK','San Valentín',NULL,1,'2026-08-03 19:49:58.989','2026-08-04 18:51:24.500','#8B4513','assets/images/la_naranja_mecanica.png',NULL,NULL,NULL,'fresa-y-chocolate','#23e764','¡Imbatible!','#ec3232','product_deal',NULL),('bBVrKHa9icFBSwdNAPJE','FIN DE SEMANA','ARA SÁBADOS Y DOMINGOS ESPECIALES',1,'2026-08-03 19:49:59.026','2026-08-04 17:34:52.790','#8B4513',NULL,NULL,NULL,NULL,'desayuno-con-diamantes','#a923e7','FIN DE SEMANA','#ffffff','product_deal',NULL),('jwQ5GMsK8t1hVwPZM8AN','Oferton del día del Padre!!','Sorprende a Papá con un detalle que nunca olvidará. Prueba nuestra cesta especial para el día del padre.',1,'2026-08-03 19:49:59.043','2026-08-04 18:35:46.484','#d2f25f','/uploads/offer_jwQ5GMsK8t1hVwPZM8AN_image.webp',NULL,10,'/uploads/offer_jwQ5GMsK8t1hVwPZM8AN_image.webp',NULL,'#e67e22','¡DESTACADO!','#ffffff','coupon',NULL),('LIq6JNoPSTxjPTuamJkg','Esta es la oferta de la semana','No lo dudes. No encontrarás nada como nuestros desayunos para sorprender a tu persona favorita',1,'2026-08-03 19:49:59.009','2026-08-04 17:34:52.763','#e86711',NULL,NULL,NULL,NULL,NULL,'#e67e22','¡DESTACADO!','#ffffff','banner',NULL),('s6Md9Pi6VHceLVY6tY80','¡¡ OFERTÓN !!','La oferta del día. No te la puedes perder',1,'2026-08-03 19:49:59.071','2026-08-04 17:34:52.824','#8B4513',NULL,NULL,NULL,NULL,'desayuno-con-diamantes','#e7239f','¡DESTACADO!','#ffffff','product_deal',NULL);
/*!40000 ALTER TABLE `Offer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Order`
--

DROP TABLE IF EXISTS `Order`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Order` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `redsysOrderId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stripeSessionId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_uid` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `customer_name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `customer_phone` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_address` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_city` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_zip` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_date` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_timeSlot` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `delivery_message` text COLLATE utf8mb4_unicode_ci,
  `total` double NOT NULL,
  `status` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `failedPaymentAttempts` int NOT NULL DEFAULT '0',
  `lastStripeErrorId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `Order_redsysOrderId_key` (`redsysOrderId`),
  KEY `Order_customer_uid_fkey` (`customer_uid`),
  CONSTRAINT `Order_customer_uid_fkey` FOREIGN KEY (`customer_uid`) REFERENCES `User` (`uid`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Order`
--

LOCK TABLES `Order` WRITE;
/*!40000 ALTER TABLE `Order` DISABLE KEYS */;
INSERT INTO `Order` VALUES ('0QF0MYRvWkvJbPLbd0vg','123789584104',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','trfdhdfh','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','08:030','nbvnbv',49,'cancelled',0,NULL,'2026-03-08 23:06:32.830','2026-08-03 19:49:59.308'),('1wE0zv3CTEiE6ah8WEw6','773007357262',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','yrty','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','rtyrtyrty',60,'cancelled',0,NULL,'2026-03-08 22:02:37.591','2026-08-03 19:49:59.353'),('2JDZRZu3rW9xayeCIdkM','196686713779',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','tyrtyrty','adosadovega@gmail.com','456755565','Aragón 2','ewrwrw','47007','2026-07-23','10:30',NULL,49.9,'cancelled',3,'pm_1Tudj4LfaSGxxAzCnGXGCBXK','2026-07-18 19:16:00.149','2026-08-03 19:49:59.388'),('3iw9iM2QQ8on3spqY3UF','773007898306',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','gfg','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','fsdfsdf',49,'cancelled',0,NULL,'2026-03-08 22:11:38.605','2026-08-03 19:49:59.421'),('4uwwWgIn0gPVGOj327C9','467606506214',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','fdfg','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','gdfgf',30,'cancelled',0,NULL,'2026-03-08 22:45:56.843','2026-08-03 19:49:59.459'),('53LAinjryNIuJ5AiDdTQ','710647097613',NULL,NULL,'Jdjd','adosadovega@gmail.com','963528523','Aragón 2','VALLADOLID','47007','2026-07-22','11:00',NULL,49,'cancelled',3,NULL,'2026-07-18 19:23:49.030','2026-08-03 19:49:59.480'),('54HExzOESgEPzKdI6fa3','208485874669',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','gfggfsgf','adosadovega@gmail.com','254825648','Aragón 2','valladolid','47007','2026-07-23','10:00','fsdfs',49,'cancelled',0,NULL,'2026-07-18 19:03:01.408','2026-08-03 19:49:59.522'),('5AAETyhlfyDVI5SziT4t','277196810005',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','retre','adosadovega@gmail.com','345678987','Aragón 2','valladolid','47007','2026-07-17','12:00','fsdf',35,'cancelled',0,NULL,'2026-07-16 17:32:54.750','2026-08-03 19:49:59.623'),('5DpCoPb93YEA4vT6rnyM','646496754624',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','rtrey','adosadovega@gmail.com','456789456','Aragón 2','VALLADOLID','47007','2026-07-30','11:00','erewr',30,'cancelled',0,NULL,'2026-07-14 16:35:58.946','2026-08-03 19:49:59.688'),('61w8RN9JcDIgIqWRLz3p','772988930509',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','kua','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-10','10:00','hykbvh',49.9,'cancelled',0,NULL,'2026-03-08 16:55:30.699','2026-08-03 19:49:59.723'),('6m3GmYWX6PIfYxtMfz9z','650198537746',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','fdfgdf','adosadovega@gmail.com','565665464','Aragón 2','valladolid','47007','2026-07-24','14:00','dfdfd',49.9,'cancelled',0,NULL,'2026-07-16 17:55:22.990','2026-08-03 19:49:59.867'),('6OttSWR25z8ne0Bdv7Gv','773007159126',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','gyrrr','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','ggdfgdgdg',30,'cancelled',0,NULL,'2026-03-08 21:59:19.504','2026-08-03 19:49:59.758'),('6P23WTrNG2G6XghATNqA','389124670867','cs_test_a1xRbiGHV72gAY73JG7ExJYbdkmAKIFxo83GpaCBrIGV0TcccTItjW3rqg','ihnpowXpJqdgvMtRcrSteRDPamj1','hrtyhrt','jcrenfe@gmail.com','345678987','Aragón 2','VALLADOLID','47007','2026-07-23','16:30','grgregeger',35,'paid',0,NULL,'2026-07-14 17:21:20.153','2026-08-03 19:49:59.790'),('7bb355EslS6y0jIRGMFX','773007977721',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','sfdf','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','fsfs',30,'cancelled',0,NULL,'2026-03-08 22:12:58.020','2026-08-03 19:49:59.904'),('7u6KCAY1IT9lY1aUaduz','745464376186',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','trtret','adosadovega@gmail.com','245258288','Aragón 2','valladolid','47007','2026-07-22','18:00','dfdfsd',49.9,'cancelled',0,NULL,'2026-07-16 18:08:18.803','2026-08-03 19:49:59.939'),('7zelWCsJemRXIPvIrSwc','871795291051',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','gfdfg','adosadovega@gmail.com','5682546985','Aragón 2','dfgdfg','47007','2026-07-22','11:30',NULL,49.9,'cancelled',0,NULL,'2026-07-18 19:12:32.809','2026-08-03 19:49:59.991'),('8Dw7BF6K6CYO13fWVTjH','629783496252','cs_test_a1ikSqkTltMmdlFPZHqsmn2ys8wSJd3p5tQUmcFkZaviyf77bEO9sSXeX0','rc7DN8Xszng6gayl00HozksCqa02','jacinto','jcrenfb@gmail.com','345678909','Aragón 2','VALLADOLID','47007','2026-07-23','14:30','ewerwe',30,'delivered',0,NULL,'2026-07-14 17:48:15.099','2026-08-03 19:50:00.021'),('8SQJJkOzL5gV72yo8XPb','202790651552',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','dgfg','adosadovega@gmail.com','545678465','Aragón 2','ggfege','47007','2026-07-22','11:30',NULL,49,'cancelled',1,NULL,'2026-07-18 19:04:47.708','2026-08-03 19:50:00.054'),('993892275107',NULL,NULL,NULL,'ewrwer','adosadovega@gmail.com','455345345','Aragón 2','vafrewrw','47007','2026-08-12','14:30','wrwrwerwe',30,'pending',0,NULL,'2026-08-04 19:03:22.958','2026-08-04 19:03:22.958'),('9iLgW6K3fxny1ncYbnzr','108839695097',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','ddfg','adosadovega@gmail.com','456789334','Aragón 2','vall','47007','2026-07-23','11:00',NULL,49.9,'cancelled',0,NULL,'2026-07-18 19:09:10.571','2026-08-03 19:50:00.136'),('ACxhD3iRtG2wM6ohRCjT','773008308948',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','etrt','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','dgdfgdfg',49,'cancelled',0,NULL,'2026-03-08 22:18:29.222','2026-08-03 19:50:00.195'),('AwbLAd5wfpCFnpAmrkax','692209836443',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','tyrtyy','adosadovega@gmail.com','567898987','Aragón 2','VALLADOLID','47007','2026-07-21','15:30','getrt',49.9,'cancelled',0,NULL,'2026-07-14 16:15:56.902','2026-08-03 19:50:00.245'),('b9UXbMFlj0aFEbvz7xXd','690461704227',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','rgdfg','adosadovega@gmail.com','567876566','Aragón 2','VALLADOLID','47007','2026-07-30','17:00','ghfhgh',35,'cancelled',0,NULL,'2026-07-14 16:57:34.685','2026-08-03 19:50:01.588'),('BUUSH0XhxyUGiNIR8n3F','773006948209',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','gyrrr','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','ggdfgdgdg',30,'cancelled',0,NULL,'2026-03-08 21:55:48.615','2026-08-03 19:50:00.287'),('Ci3HUtKtggkyKtxgZjoB','674022393275',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','gdfg','adosadovega@gmail.com','567890876','Aragón 2','VALLADOLID','47007','2026-07-28','15:30','gfhfgh',49.9,'cancelled',0,NULL,'2026-07-14 16:28:20.862','2026-08-03 19:50:00.334'),('clOIiDsAYD3Lc5xoTBu3','200161178864',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','fgdfg','adosadovega@gmail.com','456789876','Aragón 2','VALLADOLID','47007','2026-07-29','15:00','fgdfg',49,'cancelled',0,NULL,'2026-07-14 16:40:59.206','2026-08-03 19:50:01.615'),('d4SRiiFvEOfMZurKx0hD','604091493416',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','dfg','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','dfgdfgfg',49,'cancelled',0,NULL,'2026-03-08 22:43:29.829','2026-08-03 19:50:01.646'),('dHOzznmm1dRlm1A7S3Rp','864266709632',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','fsdf','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','sfsdfdf',49,'cancelled',0,NULL,'2026-03-08 22:52:17.357','2026-08-03 19:50:01.674'),('EQ2xlRzRXWU82YdTZ0bN','760022815509',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','fgfg','adosadovega@gmail.com','456789345','Aragón 2','VALLADOLID','47007','2026-07-23','15:30',NULL,173,'cancelled',0,NULL,'2026-07-14 16:33:34.309','2026-08-03 19:50:00.606'),('fHv7TuZs3A5h2uCob0L7','76530IAO6LYW',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','retret','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','terter',30,'cancelled',0,NULL,'2026-03-08 22:31:44.118','2026-08-03 19:50:01.703'),('G3eeDemUpK2n9LBrTlv8','351891721025',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','gdfg','adosadovega@gmail.com','567890876','Aragón 2','VALLADOLID','47007','2026-07-28','15:30','gfhfgh',49.9,'cancelled',0,NULL,'2026-07-14 16:27:12.287','2026-08-03 19:50:00.706'),('Gurx7uw1w3t2eaOJdV1y','389573450585',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','juan','adosadovega@gmail.com','365326584','Aragón 2','Valladolid','47007','2026-07-23','18:00','dfsfs',35,'cancelled',0,NULL,'2026-07-18 19:01:08.864','2026-08-03 19:50:00.743'),('hljDFdYAUtYfmx8Tyefc','275121112997','cs_test_a1lWzCTLuTUhCGdqRsdcnDLYY7MQqYedYWQgDWd4cfeLZGVUTvWRMXTZuW','ihnpowXpJqdgvMtRcrSteRDPamj1','dfg','adosadovega@gmail.com','567890888','Aragón 2','VALLADOLID','47007','2026-09-11','11:30','fdgdfg',35,'paid',0,NULL,'2026-07-16 16:55:55.106','2026-08-03 19:50:01.732'),('HtrHQCDvmRqaJwiDBlgP','719317054353',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','rtrr','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-02','09:00','ykgkgk',30,'cancelled',0,NULL,'2026-03-08 23:03:02.091','2026-08-03 19:50:00.816'),('HWnUlmvQzDfBxqCi7gcg','934752610610',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','gfhfgh','adosadovega@gmail.com','245232589','Aragón 2','valladolid','47007','2026-07-17','15:30','fsfsdf',49.9,'cancelled',0,NULL,'2026-07-16 18:03:58.229','2026-08-03 19:50:00.781'),('hxIeG8f2F9D5M65qx6kx','962833275966',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','gdfgdf','adosadovega@gmail.com','253656875','Aragón 2','Valladolid','47007','2026-07-23','18:00','ccx',49.9,'cancelled',0,NULL,'2026-07-16 18:05:31.294','2026-08-03 19:50:01.766'),('iHxjjiRWkk9YK9fuQHrW','300053614708','cs_test_a1AeT4gVh5GQb48V6geKH3sMgK7JB3QiUP5TTiMnsLEHZ2LELEYK9r8kb8','ihnpowXpJqdgvMtRcrSteRDPamj1','Fhh','adosadovega@gmail.com','569636635','Aragón 2','VALLADOLID','47007','2026-08-13','10:00','Ghvd',38,'paid',0,NULL,'2026-08-03 04:56:45.797','2026-08-03 19:50:01.798'),('ILUZDM9prrM7Jn7cbXZ6','473071358946',NULL,NULL,'Juan Carlos Gutiérrez ','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-04-01','10:00','Muchas felicidades papi!!',33,'cancelled',0,NULL,'2026-03-30 09:29:23.805','2026-08-03 19:50:00.839'),('ILWoxMzDX98hWcni498i','438883603244',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','dsf','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-13','09:00','fs',35,'paid',0,NULL,'2026-03-11 23:01:37.828','2026-08-03 19:50:00.875'),('JB9DbTb40XJUW20cnjmE','954530179256',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','terte','adosadovega@gmail.com','345678876','Aragón 2','valladolid','47007','2026-07-24','18:00','fgd',35,'cancelled',0,NULL,'2026-07-16 17:50:45.079','2026-08-03 19:50:00.914'),('jLQGqE59S5DNGncln0ef','914333568209',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','qweqe','adosadovega@gmail.com','345678987','Aragón 2','VALLADOLID','47007','2026-07-17','10:00','DFSDF',35,'cancelled',0,NULL,'2026-07-16 17:38:38.906','2026-08-03 19:50:01.850'),('jonvC7BMfrsmjfC1URuN','735414960950',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','erttete','adosadovega@gmail.com','5665665656','Aragón 2','VALLADOLID','47007','2026-07-16','15:00','gergege',38,'cancelled',0,NULL,'2026-07-14 16:00:39.369','2026-08-03 19:50:01.903'),('jZR5frb3VM2bTnecuzbV','436054787743',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','fgdf','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','dgfgf',0,'cancelled',0,NULL,'2026-03-08 22:43:09.972','2026-08-03 19:50:01.880'),('kbuFmtxqZMo1m8M63gp3',NULL,NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','juan','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-10','10:00',NULL,49.9,'cancelled',0,NULL,'2026-03-08 16:52:44.489','2026-08-03 19:50:01.929'),('l0nlv4FkrlPG2HMWerqQ','773007678137',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','fdfd','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','sfsfsdf',30,'cancelled',0,NULL,'2026-03-08 22:07:58.451','2026-08-03 19:50:01.956'),('LvJmtRQGuJnZlf8sZTIi','773007403994',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','gfdg','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','gdfgdfgdfg',0,'cancelled',0,NULL,'2026-03-08 22:03:24.349','2026-08-03 19:50:01.045'),('m2c4p3mCCutJ6tlWLi5p','197320019296',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','fdsfdsf','adosadovega@gmail.com','677676766','Aragón 2','VALLADOLID','47007','2026-07-29','17:00','ret',30,'cancelled',0,NULL,'2026-07-14 16:17:04.641','2026-08-03 19:50:01.989'),('MKJfLSoMqCTzJt41gtMb','457291911271',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','dfg','adosadovega@gmail.com','567890888','Aragón 2','VALLADOLID','47007','2026-09-11','11:30','fdgdfg',35,'cancelled',0,NULL,'2026-07-16 16:49:53.498','2026-08-03 19:50:01.070'),('mvqRXWBtQD9EFeRhoSDd','453175735071','cs_test_a1Q8nwWg6nSLj8w63d18ziTNvBuST4YvuSOKkX3jDL0K5MCgWOCsXxhujM','ihnpowXpJqdgvMtRcrSteRDPamj1','hgfh','adosadovega@gmail.com','456789876','Aragón 2','VALLADOLID','47007','2026-07-29','17:30','rgedg',30,'paid',0,NULL,'2026-07-14 17:05:32.121','2026-08-03 19:50:02.090'),('mVvXxtKofu83E6fvEa5j','339588395500','cs_test_a133BFMDAAdT9BS6EoinuNbriBb5zLcMAzWGOzM7BmORKPgW9bGHmrMePy',NULL,'gdfgdf','adosadovega@gmail.com','345678978','Aragón 2','VALLADOLID','47007','2026-07-30','18:00','hrrhrhr',35,'paid',0,NULL,'2026-07-14 18:26:06.827','2026-08-03 19:50:02.050'),('MW5gRaOClT9d7Xy09Ift','378439302994',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','fsdf','adosadovega@gmail.com','345665666','Aragón 2','ewrwrwr','47007','2026-07-23','12:00',NULL,35,'cancelled',1,NULL,'2026-07-16 18:13:18.029','2026-08-03 19:50:01.099'),('NaRq7tCrwnTVBWYjVjhz','338026278399',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','Juan Carlos Gutiérrez Díaz','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-30','10:00','hola',35,'cancelled',0,NULL,'2026-03-28 19:14:29.821','2026-08-03 19:50:01.125'),('ncIR3EvgqrJLM93g2wAB','175318415599',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','sfdsf','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','fsdfsdf',49,'cancelled',0,NULL,'2026-03-08 22:49:03.439','2026-08-03 19:50:02.164'),('nDJCvMJlAfBreylPV0J5','801765899917',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','Juan','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-12','10:00','Hola',49.9,'cancelled',0,NULL,'2026-03-11 23:00:38.795','2026-08-03 19:50:02.136'),('nroW1t4bTztKFeYoFaM3','696734187400','cs_test_a1jvyfWntSYPppbtUANTl3gP10aUKQ3Hpc3IO4B5jwp2eUZIawOtwZ5vLQ','ihnpowXpJqdgvMtRcrSteRDPamj1','jji','adosadovega@gmail.com','987654567','Aragón 2','VALLADOLID','47007','2026-07-22','16:30','bgu',49,'paid',0,NULL,'2026-07-14 17:11:33.349','2026-08-03 19:50:02.191'),('ns60qBj3j4S5DG8ynDlH','667517967523',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','Juan','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-12','10:00','Hola',49.9,'paid',0,NULL,'2026-03-11 23:00:54.385','2026-08-03 19:50:02.221'),('ols5us8gVdxWmv53rR48','423334534030','cs_test_a1d7BgOdnzKBRGElWY30k78sYxSMBUz1a1j8ydk1yFBv6qYTriIdDFoanV','ihnpowXpJqdgvMtRcrSteRDPamj1','eretyte','jcrenfe@gmail.com','4563456677','Aragón 2','VALLADOLID','47007','2026-07-23','17:00','turtyuruw   u6u6u56u3  58u',35,'paid',0,NULL,'2026-07-14 17:16:36.145','2026-08-03 19:50:02.289'),('oUiCHhRexckhjJR3ge5S','424515143980',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','fdfhg','jcrenfe@gmail.com','566666888','Aragón 2','VALLADOLID','47007','2026-07-31','17:30','ewwer',49.9,'cancelled',0,NULL,'2026-07-14 16:45:50.706','2026-08-03 19:50:02.255'),('P53Ou1Px9lcWRNE80nDE','772989249492',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','juam','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-10','10:00','guuhviv',8,'cancelled',0,NULL,'2026-03-08 17:00:49.692','2026-08-03 19:50:01.153'),('pd1kK27Ejgt5uAesdQiN','921547600285',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','dgdfg','adosadovega@gmail.com','567890987','Aragón 2','VALLADOLID','47007','2026-07-31','17:00','hgjghj',35,'cancelled',0,NULL,'2026-07-14 16:21:54.189','2026-08-03 19:50:02.329'),('phly7WOPfyFAxWHhh63s','290611383124','cs_test_a1FNkQgOjJZtHF2eaPBbuvgdBqTmiLJoUlqhgSQh0ncb8fV9rxYLys3Buq','ihnpowXpJqdgvMtRcrSteRDPamj1','Pepe','adosadovega@gmail.com','645363236','Aragón 2','VALLADOLID','47007','2026-08-13','11:30','Hugf',38,'paid',1,NULL,'2026-08-03 04:49:59.857','2026-08-03 19:50:02.364'),('pmJBa8V7BzfvHWvWfsxE','773008998578',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','trt','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','etert',30,'cancelled',0,NULL,'2026-03-08 22:29:58.818','2026-08-03 19:50:02.409'),('PuBHA9eWhqqk8QdG4SEm','739422271299',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','fdfds','adosadovega@gmail.com','456789786','Aragón 2','VALLADOLID','47007','2026-07-22','15:30','dffd',49,'cancelled',0,NULL,'2026-07-14 16:54:30.786','2026-08-03 19:50:01.190'),('pzTMT3oCfj8i0jxJbTIX','147863142372',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','ewrer','adosadovega@gmail.com','345678547','Aragón 2','VALLADOLID','47007','2026-07-17','17:30','adad',35,'cancelled',0,NULL,'2026-07-16 17:24:47.320','2026-08-03 19:50:02.432'),('q5xKuxv4LhJDLm4XXsX7','289983108222',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','fdsfds','adosadovega@gmail.com','4567898756','Aragón 2','VALLADOLID','47007','2026-07-29','12:30','reter',35,'cancelled',0,NULL,'2026-07-14 16:31:13.980','2026-08-03 19:50:02.455'),('QIvszr9BKfa9AVJWO2YZ','892369806327',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','Juan','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-12','10:00','Hol de ',49.9,'cancelled',0,NULL,'2026-03-11 23:11:03.324','2026-08-03 19:50:01.232'),('qMr5IfueMwaYxoTWA1QN','452503389611',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','rtetre','adosadovega@gmail.com','345678987','Aragón 2','fgdfgf','47007','2026-07-23','10:30',NULL,49.9,'cancelled',3,'pm_1TudkULfaSGxxAzCavEMtYl3','2026-07-18 19:17:17.737','2026-08-03 19:50:02.489'),('RAQOnTDec2LnO5zrALYT','798937664362','cs_test_a1htOLgku8fIBMjzYe4eU0PWRTiIJJgemwmQhxU2HDAfiuaoQBmpDKKx5E','rc7DN8Xszng6gayl00HozksCqa02','wwdfs','jcrenfb@gmail.com','253698658','Aragón 2','VALLADOLID','47007','2026-07-17','11:30','dfsfsdf',49.9,'cancelled',0,NULL,'2026-07-14 18:27:50.441','2026-08-03 19:50:01.269'),('RRqTftfLkwthg123fmG5',NULL,NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','paco','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','10:00',NULL,35,'cancelled',0,NULL,'2026-03-08 16:42:22.610','2026-08-03 19:50:01.309'),('rWDZC0Gul1xownl7uj3K','561402131171',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','juan','adosadovega@gmail.com','365326584','Aragón 2','Valladolid','47007','2026-07-23','18:00','dfsfs',35,'cancelled',0,NULL,'2026-07-18 18:58:00.611','2026-08-03 19:50:02.530'),('TxEqKmLH0us5DIzqPPnn','276078785506',NULL,NULL,'Juan Carlos Gutiérrez Díaz ','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-04-08','09:30','Hola',30,'cancelled',0,NULL,'2026-04-02 15:30:35.674','2026-08-03 19:50:01.325'),('u6jGaHMUgptJz4DvQXoW','370542929825',NULL,NULL,'Juan Carlos Gutiérrez Díaz','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-31','10:00','df f wew fe',35,'cancelled',0,NULL,'2026-03-28 20:11:22.606','2026-08-03 19:50:02.556'),('uo1O21NwR9eL5H5OnvMt','773006811585',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','uan','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-10','10:00','ggfgdfgf',49,'cancelled',0,NULL,'2026-03-08 21:53:31.939','2026-08-03 19:50:02.626'),('UpBhVk2sMnnhT5uKDemH','331337278738',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','ewrwer','adosadovega@gmail.com','234567897','Aragón 2','VALLADOLID','47007','2026-07-21','09:30','ertret',173,'cancelled',0,NULL,'2026-07-14 16:34:17.948','2026-08-03 19:50:01.361'),('VdQWSuqrU2lD7lTy8jxJ','773007212584',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','gdg','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','dgdfgfdgfd',30,'cancelled',0,NULL,'2026-03-08 22:00:12.928','2026-08-03 19:50:01.425'),('VNaGuESYVW5Ub00MFogk','254248146449',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','ggghh','adosadovega@gmail.com','354566777','Aragón 2','valladolid','47007','2026-07-23','10:30',NULL,49.9,'cancelled',0,NULL,'2026-07-16 17:57:49.597','2026-08-03 19:50:01.394'),('WZ92sIBsJDtHhS6yW0QM','7927R4HNE8PC',NULL,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','fgd','jcrenfe@gmail.com','645663378','Aragón 2','Valladolid','47007','2026-03-09','09:00','dgfgdf',0,'cancelled',0,NULL,'2026-03-08 22:30:52.615','2026-08-03 19:50:01.461'),('x0wzgHniWgeu19TML4mm','957726129244',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','fdsf','adosadovega@gmail.com','456789567','Aragón 2','VALLADOLID','47007','2026-07-30','14:30','fdss',30,'cancelled',0,NULL,'2026-07-14 16:29:43.017','2026-08-03 19:50:02.660'),('xhpwMfzBDwy7Qd3aP9RY','913349622699','cs_test_a1SYrI4YXvTzWQyakYB0a9tyVIihK9gfrNPVGWdKiB4UaE2yJsNAqnKVjX','ihnpowXpJqdgvMtRcrSteRDPamj1','rtert','adosadovega@gmail.com','567467578','Aragón 2','VALLADOLID','47007','2026-07-23','14:30','tretertet',35,'paid',0,NULL,'2026-07-14 17:23:58.961','2026-08-03 19:50:02.707'),('yqHda5zZy5SBCfEBSzy7','915248253681',NULL,NULL,'ret','adosadovega@gmail.com','456899075','Aragón 2','VALLADOLID','47007','2026-07-31','15:30','gfgdfgdf',30,'cancelled',0,NULL,'2026-07-14 18:17:38.786','2026-08-03 19:50:02.750'),('YyAt0cQozk4wHmpv1hl6','300277813691',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','Huyrfc','adosadovega@gmail.com','359588558','Aragón 2','VALLADOLID','47007','2026-08-13','14:00','Tyygg',38,'cancelled',0,NULL,'2026-08-03 04:52:57.837','2026-08-03 19:50:01.500'),('ZQD5CGnp7VWqY1bk1tt0','297122726499',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','juan','adosadovega@gmail.com','365326584','Aragón 2','Valladolid','47007','2026-07-23','18:00','dfsfs',35,'cancelled',0,NULL,'2026-07-18 18:56:32.722','2026-08-03 19:50:01.541'),('zSmVZFzC7BEpCTS2yOkU','921636766953',NULL,'ihnpowXpJqdgvMtRcrSteRDPamj1','gdfg','adosadovega@gmail.com','456789345','Aragón 2','valladolid','47007','2026-07-17','14:30','fd',35,'cancelled',0,NULL,'2026-07-16 17:46:48.914','2026-08-03 19:50:02.800');
/*!40000 ALTER TABLE `Order` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `OrderItem`
--

DROP TABLE IF EXISTS `OrderItem`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `OrderItem` (
  `id` int NOT NULL AUTO_INCREMENT,
  `orderId` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `productId` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `price` double NOT NULL,
  `quantity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `OrderItem_orderId_fkey` (`orderId`),
  CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `OrderItem`
--

LOCK TABLES `OrderItem` WRITE;
/*!40000 ALTER TABLE `OrderItem` DISABLE KEYS */;
INSERT INTO `OrderItem` VALUES (1,'0QF0MYRvWkvJbPLbd0vg',NULL,'Producto',0,1),(2,'1wE0zv3CTEiE6ah8WEw6',NULL,'Producto',0,2),(3,'2JDZRZu3rW9xayeCIdkM',NULL,'Producto',0,1),(4,'3iw9iM2QQ8on3spqY3UF',NULL,'Producto',0,1),(5,'4uwwWgIn0gPVGOj327C9',NULL,'Producto',0,1),(6,'53LAinjryNIuJ5AiDdTQ',NULL,'Producto',0,1),(7,'54HExzOESgEPzKdI6fa3',NULL,'Producto',0,1),(8,'5AAETyhlfyDVI5SziT4t',NULL,'Producto',0,1),(9,'5DpCoPb93YEA4vT6rnyM',NULL,'Producto',0,1),(10,'61w8RN9JcDIgIqWRLz3p',NULL,'Producto',0,1),(11,'6OttSWR25z8ne0Bdv7Gv',NULL,'Producto',0,1),(12,'6P23WTrNG2G6XghATNqA',NULL,'Producto',0,1),(13,'6m3GmYWX6PIfYxtMfz9z',NULL,'Producto',0,1),(14,'7bb355EslS6y0jIRGMFX',NULL,'Producto',0,1),(15,'7u6KCAY1IT9lY1aUaduz',NULL,'Producto',0,1),(16,'7zelWCsJemRXIPvIrSwc',NULL,'Producto',0,1),(17,'8Dw7BF6K6CYO13fWVTjH',NULL,'Producto',0,1),(18,'8SQJJkOzL5gV72yo8XPb',NULL,'Producto',0,1),(19,'9iLgW6K3fxny1ncYbnzr',NULL,'Producto',0,1),(20,'ACxhD3iRtG2wM6ohRCjT',NULL,'Producto',0,1),(21,'AwbLAd5wfpCFnpAmrkax',NULL,'Producto',0,1),(22,'BUUSH0XhxyUGiNIR8n3F',NULL,'Producto',0,1),(23,'Ci3HUtKtggkyKtxgZjoB',NULL,'Producto',0,1),(24,'EQ2xlRzRXWU82YdTZ0bN',NULL,'Producto',0,2),(25,'EQ2xlRzRXWU82YdTZ0bN',NULL,'Producto',0,1),(26,'EQ2xlRzRXWU82YdTZ0bN',NULL,'Producto',0,1),(27,'EQ2xlRzRXWU82YdTZ0bN',NULL,'Producto',0,1),(28,'G3eeDemUpK2n9LBrTlv8',NULL,'Producto',0,1),(29,'Gurx7uw1w3t2eaOJdV1y',NULL,'Producto',0,1),(30,'HWnUlmvQzDfBxqCi7gcg',NULL,'Producto',0,1),(31,'HtrHQCDvmRqaJwiDBlgP',NULL,'Producto',0,1),(32,'ILUZDM9prrM7Jn7cbXZ6',NULL,'Producto',0,1),(33,'ILWoxMzDX98hWcni498i',NULL,'Producto',0,1),(34,'JB9DbTb40XJUW20cnjmE',NULL,'Producto',0,1),(35,'MKJfLSoMqCTzJt41gtMb',NULL,'Producto',0,1),(36,'MW5gRaOClT9d7Xy09Ift',NULL,'Producto',0,1),(37,'NaRq7tCrwnTVBWYjVjhz',NULL,'Producto',0,1),(38,'P53Ou1Px9lcWRNE80nDE',NULL,'Producto',0,1),(39,'PuBHA9eWhqqk8QdG4SEm',NULL,'Producto',0,1),(40,'QIvszr9BKfa9AVJWO2YZ',NULL,'Producto',0,1),(41,'RAQOnTDec2LnO5zrALYT',NULL,'Producto',0,1),(42,'RRqTftfLkwthg123fmG5',NULL,'Producto',0,1),(43,'TxEqKmLH0us5DIzqPPnn',NULL,'Producto',0,1),(44,'UpBhVk2sMnnhT5uKDemH',NULL,'Producto',0,2),(45,'UpBhVk2sMnnhT5uKDemH',NULL,'Producto',0,1),(46,'UpBhVk2sMnnhT5uKDemH',NULL,'Producto',0,1),(47,'UpBhVk2sMnnhT5uKDemH',NULL,'Producto',0,1),(48,'VNaGuESYVW5Ub00MFogk',NULL,'Producto',0,1),(49,'VdQWSuqrU2lD7lTy8jxJ',NULL,'Producto',0,1),(50,'YyAt0cQozk4wHmpv1hl6',NULL,'Producto',0,1),(51,'ZQD5CGnp7VWqY1bk1tt0',NULL,'Producto',0,1),(52,'b9UXbMFlj0aFEbvz7xXd',NULL,'Producto',0,1),(53,'clOIiDsAYD3Lc5xoTBu3',NULL,'Producto',0,1),(54,'d4SRiiFvEOfMZurKx0hD',NULL,'Producto',0,1),(55,'dHOzznmm1dRlm1A7S3Rp',NULL,'Producto',0,1),(56,'fHv7TuZs3A5h2uCob0L7',NULL,'Producto',0,1),(57,'hljDFdYAUtYfmx8Tyefc',NULL,'Producto',0,1),(58,'hxIeG8f2F9D5M65qx6kx',NULL,'Producto',0,1),(59,'iHxjjiRWkk9YK9fuQHrW',NULL,'Producto',0,1),(60,'jLQGqE59S5DNGncln0ef',NULL,'Producto',0,1),(61,'jonvC7BMfrsmjfC1URuN',NULL,'Producto',0,1),(62,'kbuFmtxqZMo1m8M63gp3',NULL,'Producto',0,1),(63,'l0nlv4FkrlPG2HMWerqQ',NULL,'Producto',0,1),(64,'m2c4p3mCCutJ6tlWLi5p',NULL,'Producto',0,1),(65,'mVvXxtKofu83E6fvEa5j',NULL,'Producto',0,1),(66,'mvqRXWBtQD9EFeRhoSDd',NULL,'Producto',0,1),(67,'nDJCvMJlAfBreylPV0J5',NULL,'Producto',0,1),(68,'ncIR3EvgqrJLM93g2wAB',NULL,'Producto',0,1),(69,'nroW1t4bTztKFeYoFaM3',NULL,'Producto',0,1),(70,'ns60qBj3j4S5DG8ynDlH',NULL,'Producto',0,1),(71,'oUiCHhRexckhjJR3ge5S',NULL,'Producto',0,1),(72,'ols5us8gVdxWmv53rR48',NULL,'Producto',0,1),(73,'pd1kK27Ejgt5uAesdQiN',NULL,'Producto',0,1),(74,'phly7WOPfyFAxWHhh63s',NULL,'Producto',0,1),(75,'pmJBa8V7BzfvHWvWfsxE',NULL,'Producto',0,1),(76,'pzTMT3oCfj8i0jxJbTIX',NULL,'Producto',0,1),(77,'q5xKuxv4LhJDLm4XXsX7',NULL,'Producto',0,1),(78,'qMr5IfueMwaYxoTWA1QN',NULL,'Producto',0,1),(79,'rWDZC0Gul1xownl7uj3K',NULL,'Producto',0,1),(80,'u6jGaHMUgptJz4DvQXoW',NULL,'Producto',0,1),(81,'uo1O21NwR9eL5H5OnvMt',NULL,'Producto',0,1),(82,'x0wzgHniWgeu19TML4mm',NULL,'Producto',0,1),(83,'xhpwMfzBDwy7Qd3aP9RY',NULL,'Producto',0,1),(84,'yqHda5zZy5SBCfEBSzy7',NULL,'Producto',0,1),(85,'zSmVZFzC7BEpCTS2yOkU',NULL,'Producto',0,1);
/*!40000 ALTER TABLE `OrderItem` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Product`
--

DROP TABLE IF EXISTS `Product`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Product` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` double DEFAULT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `local_image_path` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url_origen` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `showOnHome` tinyint(1) NOT NULL DEFAULT '0',
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Product`
--

LOCK TABLES `Product` WRITE;
/*!40000 ALTER TABLE `Product` DISABLE KEYS */;
INSERT INTO `Product` VALUES ('adicional-flores','ADICIONAL FLORES',10,'PRECIO PARA 1 ROSA\nESTE PRODUCTO SOLO SE COMERCIALIZA PARA SER AGREGADO COMO  COMPLEMENTO EN CUALQUIER CESTA','Productos adicionales','/uploads/prod_adicional-flores.webp',NULL,NULL,0,'2026-08-03 19:49:50.751','2026-08-04 07:26:19.872'),('adicional-para-dos-personas','ADICIONAL PARA DOS PERSONAS',14,'SI LA CESTA LA QUIERES PARA DOS PERSONAS, EL COSTE ADICIONAL ES DE 14€\nDEBES COMPRAR LA CESTA Y AGREGAR ESTE ADICIONAL EN EL CARRITO DE COMPRA','Productos adicionales','/uploads/prod_adicional-para-dos-personas.webp',NULL,NULL,0,'2026-08-03 19:49:51.080','2026-08-04 07:26:19.892'),('all','ADICIONAL TERMO',10.9,'ADICIONAL TERMO\nESTE PRODUCTO SOLO SE COMERCIALIZA COMO ADICIONAL A LAS CESTAS','Productos adicionales','/uploads/prod_all.webp',NULL,NULL,0,'2026-08-03 19:49:51.397','2026-08-04 07:26:19.900'),('amores-salados-placeres-dulces','AMORES SALADOS PLACERES DULCES',49.9,'CESTA DE MIMBRE, TAZA, TERMO, CUBIERTOS, MANTEL, SERVILLETA, CAFE NORMAL Y DESCAFEINADO, CAPUCHINO, TE, LECHE, AZUCAR Y EDULCORANTE, MANTEQUILLA, ACEITE DE OLIVA, TOMATE TRITURADO, MERMELADA, JAMÓN IBÉRICO, 2 PIEZAS DE PAN DE DISTINTAS VARIEDADES, TOSTADAS, CROISSANT, TRENZA O CARACOLA, MAGDALENA, ZUMO, FRUTA, TARJETA RECORDATORIA.','Desayunos','/uploads/prod_amores-salados-placeres-dulces.webp',NULL,NULL,0,'2026-08-03 19:49:51.734','2026-08-04 07:26:19.915'),('antes-del-atardecer','ANTES DEL ATARDECER',38,'CESTA DE MIMBRE, JAMÓN COCIDO (100g), JAMÓN SERRANO (100g), SALCHICHÓN (100g), CHORIZO (100g), QUESO (100g),PATE 1 tarrina, FRUTOS SECOS SURTIDOS, PATATAS FRITAS, ACEITUNAS, PANES 3 piezas, TARJETA RECORDATORIA, CUBIERTOS, MANTEL Y SERVILLETA','Merienda y brunch','/uploads/prod_antes-del-atardecer.webp',NULL,NULL,1,'2026-08-03 19:49:52.070','2026-08-04 07:26:19.929'),('bandeja-de-dulces-adicional','BANDEJA DE DULCES ADICIONAL',8,'BANDEJA DE DULCES ADICIONAL\nESTE PRODUCTO SOLO SE COMERCIALIZA PARA SER AGREGADO COMO   COMPLEMENTO EN CUALQUIER CESTA ','Productos adicionales','/uploads/prod_bandeja-de-dulces-adicional.webp',NULL,NULL,0,'2026-08-03 19:49:52.475','2026-08-04 07:26:19.942'),('bandeja-de-patés-adicional','BANDEJA DE PATÉS ADICIONAL',6,'BANDEJA DE PATES ADICIONAL\nESTE PRODUCTO SOLO SE COMERCIALIZA PARA SER AGREGADO COMO  COMPLEMENTO EN CUALQUIER CESTA','Productos adicionales','/uploads/prod_bandeja-de-patés-adicional.webp',NULL,NULL,0,'2026-08-03 19:49:52.760','2026-08-04 07:26:19.959'),('bizcocho-de-cumpleaños','BIZCOCHO DE CUMPLEAÑOS',8,'BIZCOCHO CON VELITA PARA AGREGAR A CUALQUIER CESTA\nESTE PRODUCTO SOLO SE COMERCIALIZA PARA SER AGREGADO COMO   COMPLEMENTO EN CUALQUIER CESTA ','Productos adicionales','/uploads/prod_bizcocho-de-cumpleaños.webp',NULL,NULL,0,'2026-08-03 19:49:53.089','2026-08-04 07:26:19.972'),('bombones-adicional','BOMBONES ADICIONAL',9,'BOMBONES ADICIONAL\nESTE PRODUCTO SOLO SE COMERCIALIZA PARA SER AGREGADO COMO  COMPLEMENTO EN CUALQUIER CESTA','Productos adicionales','/uploads/prod_bombones-adicional.webp',NULL,NULL,0,'2026-08-03 19:49:53.418','2026-08-04 07:26:19.984'),('cava-y-copa-adicional','CAVA Y COPA ADICIONAL',5,'CAVA Y COPA ADICIONAL\nESTE PRODUCTO SOLO SE COMERCIALIZA PARA SER AGREGADO COMO  COMPLEMENTO EN CUALQUIER CESTA','Productos adicionales','/uploads/prod_cava-y-copa-adicional.webp',NULL,NULL,0,'2026-08-03 19:49:53.659','2026-08-04 07:26:19.998'),('delicioso','DELICIOSO',39.5,'CESTA DE MIMBRE, BENJAMÍN DE CAVA O BOTELLÍN DE CERVEZA, ZUMO DE NARANJA, CROISANT, MUFFIN, DONUT, PANES 2 piezas, TOSTADAS, MANTEQUILLA, MERMELADA, TOMATE TRITURADO, ACEITE DE OLIVA, PATE 1 tarrina, ACEITUNAS, JAMÓN IBÉRICO, FRUTA, CUBIERTOS, MANTEL Y SERVILLETAS.','Merienda y brunch','/uploads/prod_delicioso.webp',NULL,NULL,0,'2026-08-03 19:49:53.935','2026-08-04 07:26:20.012'),('desayuno-con-diamante','AMANECE QUE NO ES POCO',30,'CESTA DE MIMBRE, TAZA, SERVILLETA, MANTEL, CUBIERTOS, CAFE, TES, AZUCAR Y EDULCORANTE, MERMELADA, MANTEQUILLA, ACEITE DE OLIVA, TOMATE TRITURADO, LECHE, ZUMO, TOSTADAS, MAGDALENA, CROISSANT, DONUTS, CARACOLA O TRENZA, TARJETA RECORDATORIA.','Desayunos','/uploads/prod_desayuno-con-diamante.webp',NULL,NULL,1,'2026-08-03 19:49:54.227','2026-08-04 07:26:20.028'),('desayuno-con-diamantes','DESAYUNO CON DIAMANTES',35,'CESTA DE MIMBRE, TAZA, SERVILLETA, MANTEL, CUBIERTOS, CAFE, TES, CAPUCHINO, COLACAO, LECHE, ZUMO, AZUCAR Y EDULCORANTE, MANTEQUILLA, MERMELADA, ACEITE DE OLIVA, GALLETAS, TOSTADAS, MAGDALENA, CROISSANT, DONUTS, CARACOLA O TRENZA, CHOCOLATINA, FRUTA, TARJETA RECORDATORIA.','Desayunos','/uploads/prod_desayuno-con-diamantes.webp',NULL,NULL,0,'2026-08-03 19:49:54.546','2026-08-04 07:26:20.048'),('el-festín-de-babette','EL FESTÍN DE BABETTE',49.9,'CESTA DE MIMBRE, TAZA, CUBIERTOS, MANTEL, SERVILLETA, CAFE NORMAL Y DESCAFEINADO, CAPUCHINO, TE, LECHE, AZUCAR Y EDULCORANTE, MANTEQUILLA, ACEITE DE OLIVA, TOMATE TRITURADO, JAMÓN IBÉRICO, TOSTADAS, 3 PIEZAS DE PAN DE DISTINTAS VARIEDADES, ZUMO, QUESO SEMICURADO, FRUTA, TARJETA RECORDATORIA.','Desayunos','/uploads/prod_el-festín-de-babette.webp',NULL,NULL,0,'2026-08-03 19:49:54.848','2026-08-04 07:26:20.067'),('en-busca-de-la-felicidad','EN BUSCA DE LA FELICIDAD',41,'CESTA DE MIMBRE, TAZA, CUBIERTOS, MANTEL, SERVILLETA, CAFE NORMAL Y DESCAFEINADO, CAPUCHINO, TE, LECHE, AZUCAR Y EDULCORANTE, MANTEQUILLA, ACEITE DE OLIVA, TOMATE TRITURADO, JAMÓN IBÉRICO, TOSTADAS, 3 PIEZAS DE PAN DE DISTINTAS VARIEDADES, ZUMO, QUESO SEMICURADO, FRUTA, TARJETA RECORDATORIA.','Desayunos','/uploads/prod_en-busca-de-la-felicidad.webp',NULL,NULL,0,'2026-08-03 19:49:55.223','2026-08-04 07:26:20.097'),('en-el-nombre-del-padre','EN EL NOMBRE DEL PADRE',33,'BANDEJA O CESTA DE MIMBRE, TAZA, SERVILLETA, MANTEL, CUBIERTOS, CAFE, TES, AZUCAR Y EDULCORANTE, MERMELADA, MANTEQUILLA, ACEITE DE OLIVA, LECHE, ZUMO, TOSTADAS, MAGDALENA, CROISSANT, DONUTS, CARACOLA O TRENZA, TARJETA RECORDATORIA, GLOBO ESPECIAL DIA DEL PADRE.','Desayunos','/uploads/prod_en-el-nombre-del-padre.webp',NULL,NULL,1,'2026-08-03 19:49:55.622','2026-08-04 07:26:20.153'),('fresa-y-chocolate','FRESA Y CHOCOLATE',49,'CESTA DE MIMBRE, 1 PIÑA, FRESAS APROX 500 GRS, ARÁNDANOS APROX 200 GRS, 3 KIWIS, 3 MANZANAS ROJAS, 3 MANZANAS VERDES, 3 PLATANOS, 1 CAJA DE BOMBONES, 1 TABLETA DE CHOCOLATE, TARJETA RECORDATORIA.','Cestas de fruta','/uploads/prod_fresa-y-chocolate.webp',NULL,NULL,0,'2026-08-03 19:49:55.946','2026-08-04 07:26:20.169'),('fruta-adicional','FRUTA ADICIONAL',1.5,'1 PIEZA DE FRUTA\nESTE PRODUCTO SOLO SE COMERCIALIZA PARA SER AGREGADO COMO COMPLEMENTO EN CUALQUIER CESTA.','Productos adicionales','/uploads/prod_fruta-adicional.webp',NULL,NULL,0,'2026-08-03 19:49:56.244','2026-08-04 07:26:20.185'),('globo-adicional','GLOBO ADICIONAL',2.5,'1 GLOBO A ELECCCIÓN\nESTE PRODUCTO SOLO SE COMERCIALIZA PARA SER AGREGADO COMO  COMPLEMENTO EN CUALQUIER CESTA','Productos adicionales','/uploads/prod_globo-adicional.webp',NULL,NULL,0,'2026-08-03 19:49:56.570','2026-08-04 07:26:20.204'),('jamon-jamon','JAMON, JAMON',49.9,'CESTA DE MIMBRE, SERVILLETA, MANTEL, CUBIERTOS, FRUTOS SECOS SURTIDOS, JAMON IBERICO, CHORIZO IBERICO, SALCHICHON IBERICO, QUESO SEMICURADO, PATES, 3 PIEZAS DE PAN DE DISTINTAS VARIEDADES, TOSTADAS, ACEITE DE OLIVA, 3 BOTELLINES DE CERVEZA, CONSULTE PARA AGREGAR 1 BOTELLA DE VINO TINTO, BLANCO O ROSADO.','Merienda y brunch','/uploads/prod_jamon-jamon.webp',NULL,NULL,0,'2026-08-03 19:49:56.880','2026-08-04 07:26:20.230'),('la-dolce-vita','LA DOLCE VITA',13,'Está compuesto por gominolas de distintos sabores\nESTE PRODUCTO SOLO SE COMERCIALIZA COMO ADICIONAL A LAS CESTAS','Productos adicionales','/uploads/prod_la-dolce-vita.webp',NULL,NULL,0,'2026-08-03 19:49:57.217','2026-08-04 07:26:20.248'),('la-naranja-mecánica','LA NARANJA MECÁNICA',49,'CESTA DE MIMBRE, 1 PIÑA, 1 AGUACATE, 1 MANGO, 4 PLÁTANOS, 4 MANZANAS ROJAS, 4 MANZANAS VERDES, 4 KIWIS, 4 NARANJAS, 4 PERAS CONFERENCIA, TARJETA RECORDATORIA.','Cestas de fruta','/uploads/prod_la-naranja-mecánica.webp',NULL,NULL,0,'2026-08-03 19:49:57.530','2026-08-04 07:26:20.259'),('peluche-adicional','PELUCHE ADICIONAL',9.5,'PELUCHE ADICIONAL\nESTE PRODUCTO SOLO SE COMERCIALIZA PARA SER AGREGADO COMO  COMPLEMENTO EN CUALQUIER CESTA','Productos adicionales','/uploads/prod_peluche-adicional.webp',NULL,NULL,0,'2026-08-03 19:49:57.805','2026-08-04 07:26:20.270'),('preciuos','PRECIOUS',32,'CESTA DE MIMBRE, TAZA, CUBIERTOS, MANTEL, SERVILLETA, CAFE NORMAL O DESCAFEINADO, TE, AZUCAR Y EDULCORANTE, LECHE NORMAL O DE AVENA, 1 PANECILLO DE SEMILLAS, 1 PANECILLO INTEGRAL, ACEITE DE OLIVA, TOMATE TRITURADO, 1 YOGUR, 1 KIWI, 1 AGUACATE, 1 ZUMO, TORTITAS DE ARROZ, BARRITA ENERGÉTICA, TARJETA RECORDATORIA.','Desayunos','/uploads/prod_preciuos.webp',NULL,NULL,0,'2026-08-03 19:49:58.099','2026-08-04 07:26:20.280'),('qué-bello-es-vivir!','QUÉ BELLO ES VIVIR!',41,'CESTA DE MIMBRE, TAZA, CUBIERTOS, MANTEL, SERVILLETA, CAFE NORMAL Y DESCAFEINADO, CAPUCHINO, TE, LECHE, AZUCAR Y EDULCORANTE, MANTEQUILLA, ACEITE DE OLIVA, TOMATE TRITURADO, MERMELADA, JAMÓN IBÉRICO, 2 PIEZAS DE PAN DE DISTINTAS VARIEDADES, TOSTADAS, CROISSANT, TRENZA O CARACOLA, MAGDALENA, ZUMO, FRUTA, TARJETA RECORDATORIA.','Desayunos','/uploads/prod_qué-bello-es-vivir!.webp',NULL,NULL,0,'2026-08-03 19:49:58.354','2026-08-04 07:26:20.292'),('tadeo-jones','TADEO JONES',36,'CESTA DE MIMBRE, TAZA INFANTIL, CUBIERTOS, SERVILLETAS, MANTEL, AZUCAR Y EDULCORANTE, COLACAO, LECHE, ZUMO, BATIDO DE FRUTAS, 2 DONUTS, 1 CROISSANT, GALLETAS INFANTILES, CEREALES, MERMELADA, FRUTA, CHUCHES, TARJETA RECORDATORIA, GLOBO INFANTIL.','Desayuno infantil','/uploads/prod_tadeo-jones.webp',NULL,NULL,0,'2026-08-03 19:49:58.696','2026-08-04 07:26:20.305'),('toast','TOAST',36,'CESTA DE MIMBRE, TAZA, CUBIERTOS, MANTEL, SERVILLETA, CAFE NORMAL Y DESCAFEINADO, TE, AZUCAR Y EDULCORANTE, LECHE NORMAL O DE AVENA, 1 PANECILLO DE SEMILLAS, 1 PANECILLO INTEGRAL, TOSTADAS INTEGRALES O NORMALES, MANTEQUILLA, JAMÓN YORK, QUESO CREMA, ACEITE DE OLIVA, TOMATE TRITURADO, 1 YOGUR, 1 KIWI, 1 AGUACATE, 1 ZUMO, BARRITA ENERGÉTICA, TARJETA RECORDATORIA.','Desayunos','/uploads/prod_toast.webp',NULL,NULL,0,'2026-08-03 19:49:58.873','2026-08-04 07:26:20.322');
/*!40000 ALTER TABLE `Product` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `User`
--

DROP TABLE IF EXISTS `User`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `User` (
  `id` int NOT NULL AUTO_INCREMENT,
  `uid` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `displayName` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `photoURL` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'cliente',
  `password` varchar(191) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdAt` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `User_uid_key` (`uid`),
  UNIQUE KEY `User_email_key` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `User`
--

LOCK TABLES `User` WRITE;
/*!40000 ALTER TABLE `User` DISABLE KEYS */;
INSERT INTO `User` VALUES (1,'SwLEmDKKoCVyFwJuF7MKfcRyIR32','jcrenfe@gmail.com','uan',NULL,'admin','$2a$10$ZEQfw3bEi6nNMD.V6ukxI.k.BzZC90Nj2ZBOjmkvEpoegPrmOGrbG','2026-08-03 18:03:45.996','2026-08-04 07:53:37.009'),(2,'ihnpowXpJqdgvMtRcrSteRDPamj1','adosadovega@gmail.com','gdfg',NULL,'cliente',NULL,'2026-08-03 18:03:46.075','2026-08-03 19:50:02.781'),(3,'rc7DN8Xszng6gayl00HozksCqa02','jcrenfb@gmail.com','wwdfs',NULL,'cliente',NULL,'2026-08-03 18:04:08.615','2026-08-03 19:50:01.247');
/*!40000 ALTER TABLE `User` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-06 10:40:27
