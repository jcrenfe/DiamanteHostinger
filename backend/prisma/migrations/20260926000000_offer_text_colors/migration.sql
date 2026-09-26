-- AlterTable
ALTER TABLE `Offer` ADD COLUMN `badgeColor` VARCHAR(191) NULL,
    ADD COLUMN `codeColor` VARCHAR(191) NULL,
    ADD COLUMN `descriptionColor` VARCHAR(191) NULL,
    ADD COLUMN `discountBgColor` VARCHAR(191) NULL,
    ADD COLUMN `discountColor` VARCHAR(191) NULL,
    ADD COLUMN `discountCorner` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `titleColor` VARCHAR(191) NULL;
