-- Add manual_override field to both tables to prevent auto-reset from check-subscription
ALTER TABLE public.profiles 
ADD COLUMN manual_override BOOLEAN DEFAULT false;

ALTER TABLE public.subscribers 
ADD COLUMN manual_override BOOLEAN DEFAULT false;

-- Update existing data to allow manual overrides
UPDATE public.profiles SET manual_override = false WHERE manual_override IS NULL;
UPDATE public.subscribers SET manual_override = false WHERE manual_override IS NULL;