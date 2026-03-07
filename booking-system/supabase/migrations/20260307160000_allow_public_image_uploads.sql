-- Allow anonymous users to upload references to crm_images
CREATE POLICY "Public users can upload images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'crm_images' );
