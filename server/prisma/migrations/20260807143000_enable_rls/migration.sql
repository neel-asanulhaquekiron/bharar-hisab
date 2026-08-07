-- Deny all access through Supabase's Data API (PostgREST). The Express server
-- connects as the table owner via Prisma, which is not subject to RLS.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "renters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rentals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "device_tokens" ENABLE ROW LEVEL SECURITY;
