
-- Create storage bucket for TSE voting data files
INSERT INTO storage.buckets (id, name, public)
VALUES ('tse-data', 'tse-data', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read/download TSE data files
CREATE POLICY "Public can read TSE data"
ON storage.objects FOR SELECT
USING (bucket_id = 'tse-data');

-- Only authenticated users can upload TSE data
CREATE POLICY "Authenticated users can upload TSE data"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'tse-data');

-- Only authenticated users can delete TSE data
CREATE POLICY "Authenticated users can delete TSE data"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'tse-data');
