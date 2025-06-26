-- DropForeignKey
ALTER TABLE `task` DROP FOREIGN KEY `Task_userId_fkey`;

-- AlterTable
ALTER TABLE `task` MODIFY `userId` INTEGER NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `house` ENUM('LILLIE_LOUISE_WOERMER_HOUSE', 'CAROLYN_ECKMAN_HOUSE', 'ADIMINISTRATION') NOT NULL;

-- CreateTable
CREATE TABLE `scripture` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `verse` VARCHAR(191) NOT NULL,
    `scripture` VARCHAR(191) NOT NULL,
    `version` VARCHAR(191) NOT NULL,
    `book` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `task` ADD CONSTRAINT `Task_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
