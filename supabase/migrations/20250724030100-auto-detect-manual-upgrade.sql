-- Create a trigger function to auto-set manual_override when subscription_plan is manually changed to 'pro'
CREATE OR REPLACE FUNCTION auto_detect_manual_upgrade()
RETURNS TRIGGER AS $$
BEGIN
  -- If subscription_plan changed from free to pro and no stripe_customer_id, set manual_override
  IF OLD.subscription_plan = 'free' AND NEW.subscription_plan = 'pro' AND NEW.stripe_customer_id IS NULL THEN
    NEW.manual_override = true;
  END IF;
  
  -- If subscription_plan changed from pro to free, unset manual_override
  IF OLD.subscription_plan = 'pro' AND NEW.subscription_plan = 'free' THEN
    NEW.manual_override = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on profiles table
DROP TRIGGER IF EXISTS auto_detect_manual_upgrade_trigger ON public.profiles;
CREATE TRIGGER auto_detect_manual_upgrade_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION auto_detect_manual_upgrade();

-- Ensure manual_override columns exist with default values
DO $$ 
BEGIN
  -- Add manual_override to profiles if not exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'manual_override') THEN
    ALTER TABLE public.profiles ADD COLUMN manual_override BOOLEAN DEFAULT false;
  END IF;
  
  -- Add manual_override to subscribers if not exists  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscribers' AND column_name = 'manual_override') THEN
    ALTER TABLE public.subscribers ADD COLUMN manual_override BOOLEAN DEFAULT false;
  END IF;
END
$$;

-- Update existing records to have proper defaults
UPDATE public.profiles SET manual_override = false WHERE manual_override IS NULL;
UPDATE public.subscribers SET manual_override = false WHERE manual_override IS NULL;