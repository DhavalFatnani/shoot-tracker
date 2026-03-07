# Supabase Storage

The app uses Supabase Storage for file uploads. The following buckets must exist in your Supabase project for features to work.

## Required buckets

### `dispute-photos`

- **Used by:** Dispute resolution flow (optional photo when resolving a dispute).
- **Code:** `src/app/actions/dispute-actions.ts` → `uploadDisputePhoto` uploads to this bucket.
- **Setup:** Create the bucket in the Supabase Dashboard (Storage → New bucket). Name must be exactly `dispute-photos`.
- **Policy:** Ensure authenticated users with OPS or ADMIN role can upload. The app uses the service role (admin client) for uploads, so the bucket should allow uploads from your backend (e.g. via service role key). If you use RLS on storage, add a policy that allows insert for the appropriate role or service role.

Example (Supabase Dashboard → Storage → dispute-photos → Policies): allow authenticated inserts and public or authenticated reads if you want resolution photos to be viewable via the returned public URL.
