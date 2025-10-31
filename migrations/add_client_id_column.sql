-- Add client_id column to day_book table
-- This field is optional and only used for incoming payments

ALTER TABLE public.day_book 
ADD COLUMN client_id TEXT NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN public.day_book.client_id IS 'Optional field to store client ID for incoming payments only';

-- Optional: Add a check constraint to ensure proper usage of nurse_id and client_id
-- ALTER TABLE public.day_book 
-- ADD CONSTRAINT check_payment_type_ids 
-- CHECK (
--   (payment_type = 'outgoing' AND client_id IS NULL) OR 
--   (payment_type = 'incoming' AND nurse_id IS NULL) OR 
--   (nurse_id IS NULL AND client_id IS NULL)
-- );