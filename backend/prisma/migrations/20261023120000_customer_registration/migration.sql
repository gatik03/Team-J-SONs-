-- Seeded demo users retain simulated login; registered customers have salted hashes.
ALTER TABLE "app_user" ADD COLUMN "password_hash" TEXT;
