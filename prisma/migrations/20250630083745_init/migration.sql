-- CreateEnum
CREATE TYPE "user_gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'RESIDENT_MANAGER', 'FACILITY_MANAGER', 'RESIDENT', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "user_house" AS ENUM ('LILLIE_LOUISE_WOERMER_HOUSE', 'CAROLYN_ECKMAN_HOUSE', 'ADIMINISTRATION');

-- CreateEnum
CREATE TYPE "task_category" AS ENUM ('NORMAL', 'SPECIAL');

-- CreateTable
CREATE TABLE "feedback" (
    "id" SERIAL NOT NULL,
    "message" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "progress" TEXT,
    "status" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "instruction" TEXT,
    "category" "task_category",

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "gender" "user_gender" NOT NULL,
    "role" "user_role" NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "image" TEXT,
    "joinedDate" TIMESTAMP(3),
    "leavingDate" TIMESTAMP(3),
    "password" TEXT NOT NULL,
    "houseId" INTEGER,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scripture" (
    "id" SERIAL NOT NULL,
    "verse" TEXT NOT NULL,
    "scripture" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "book" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "scripture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "house" (
    "id" SERIAL NOT NULL,
    "name" "user_house" NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "house_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_feedback_taskId" ON "feedback"("taskId");

-- CreateIndex
CREATE INDEX "idx_feedback_userId" ON "feedback"("userId");

-- CreateIndex
CREATE INDEX "idx_task_userId" ON "task"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_email" ON "user"("email");

-- CreateIndex
CREATE INDEX "idx_user_houseId" ON "user"("houseId");

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "fk_feedback_taskId" FOREIGN KEY ("taskId") REFERENCES "task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedback" ADD CONSTRAINT "fk_feedback_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "fk_task_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "fk_user_houseId" FOREIGN KEY ("houseId") REFERENCES "house"("id") ON DELETE SET NULL ON UPDATE CASCADE;
