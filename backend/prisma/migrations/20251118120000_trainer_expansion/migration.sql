-- Add trainer relationship and nutrition targets for users
ALTER TABLE "users"
ADD COLUMN "trainer_id" INTEGER,
ADD COLUMN "goal_date" TIMESTAMP(3),
ADD COLUMN "daily_calorie_target" INTEGER,
ADD COLUMN "daily_protein_target" DOUBLE PRECISION,
ADD COLUMN "daily_carb_target" DOUBLE PRECISION,
ADD COLUMN "daily_fat_target" DOUBLE PRECISION;

CREATE INDEX "idx_users_trainer_id" ON "users"("trainer_id");

ALTER TABLE "users"
ADD CONSTRAINT "users_trainer_id_fkey"
FOREIGN KEY ("trainer_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

