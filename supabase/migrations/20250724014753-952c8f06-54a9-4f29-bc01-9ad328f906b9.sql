-- Create PayPal orders table for tracking PayPal payments
CREATE TABLE public.paypal_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  paypal_order_id TEXT UNIQUE NOT NULL,
  paypal_capture_id TEXT,
  amount DECIMAL(10,2),
  status TEXT DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for PayPal orders table
ALTER TABLE public.paypal_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for PayPal orders table
CREATE POLICY "select_own_paypal_orders" ON public.paypal_orders
FOR SELECT
USING (user_id = auth.uid() OR email = auth.email());

CREATE POLICY "insert_paypal_order" ON public.paypal_orders
FOR INSERT
WITH CHECK (true);

CREATE POLICY "update_paypal_order" ON public.paypal_orders
FOR UPDATE
USING (true);

-- Create trigger for updating updated_at on paypal_orders
CREATE TRIGGER update_paypal_orders_updated_at
BEFORE UPDATE ON public.paypal_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();