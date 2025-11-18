-- CreateTable
CREATE TABLE "workout_plan" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ux_workout_plan_user_day" ON "workout_plan"("user_id", "day_of_week");

-- AddForeignKey
ALTER TABLE "workout_plan" ADD CONSTRAINT "workout_plan_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
