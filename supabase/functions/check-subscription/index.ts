import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) {
      return new Response(
        JSON.stringify({ 
          subscription_plan: 'free',
          subscription_status: 'active',
          isProUser: false 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    try {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      
      if (userError || !userData.user) {
        console.log('Auth error:', userError?.message);
        return new Response(
          JSON.stringify({ 
            subscription_plan: 'free',
            subscription_status: 'active',
            isProUser: false 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Get user profile
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('subscription_plan, subscription_status')
        .eq('user_id', userData.user.id)
        .maybeSingle();
      
      if (profileError) {
        console.error('Profile lookup error:', profileError);
        return new Response(
          JSON.stringify({ 
            subscription_plan: 'free',
            subscription_status: 'active',
            isProUser: false 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      const subscriptionPlan = profile?.subscription_plan || 'free';
      const subscriptionStatus = profile?.subscription_status || 'active';
      const isProUser = subscriptionPlan === 'pro';
      
      return new Response(
        JSON.stringify({ 
          subscription_plan: subscriptionPlan,
          subscription_status: subscriptionStatus,
          isProUser: isProUser
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
      
    } catch (error) {
      console.error('Error checking subscription:', error);
      return new Response(
        JSON.stringify({ 
          subscription_plan: 'free',
          subscription_status: 'active',
          isProUser: false 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});