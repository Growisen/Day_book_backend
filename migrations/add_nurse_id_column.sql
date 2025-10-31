-- Add nurse_id column to day_book table
-- This field is optional and only used for outgoing payments

ALTER TABLE public.day_book 
ADD COLUMN nurse_id TEXT NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN public.day_book.nurse_id IS 'Optional field to store nurse ID for outgoing payments only';

-- Optional: Add a check constraint to ensure nurse_id is only used with outgoing payments
-- ALTER TABLE public.day_book 
-- ADD CONSTRAINT check_nurse_id_outgoing 
-- CHECK (
--   (payment_type = 'outgoing' AND nurse_id IS NOT NULL) OR 
--   (payment_type = 'incoming' AND nurse_id IS NULL) OR 
--   nurse_id IS NULL
-- );