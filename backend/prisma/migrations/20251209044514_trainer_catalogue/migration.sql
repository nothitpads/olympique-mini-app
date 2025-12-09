-- CreateTable
CREATE TABLE "trainer_profile" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "headline" TEXT,
    "bio" TEXT,
    "years_experience" INTEGER,
    "location" TEXT,
    "price_from" INTEGER,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "certifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "rating_avg" DOUBLE PRECISION DEFAULT 0,
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "hero_url" TEXT,
    "contact_url" TEXT,
    "telegram_username" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainer_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_reviews" (
    "id" SERIAL NOT NULL,
    "trainer_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trainer_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trainer_profile_user_id_key" ON "trainer_profile"("user_id");

-- CreateIndex
CREATE INDEX "idx_trainer_reviews_trainer" ON "trainer_reviews"("trainer_id");

-- AddForeignKey
ALTER TABLE "trainer_profile" ADD CONSTRAINT "trainer_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_reviews" ADD CONSTRAINT "trainer_reviews_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_reviews" ADD CONSTRAINT "trainer_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
