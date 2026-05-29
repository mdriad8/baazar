import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create the seller user via the Admin API (this properly creates identities)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: "seller@baazar.com.au",
      password: "Seller@Baazar2024!",
      email_confirm: true,
      user_metadata: { full_name: "Demo Seller" },
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = data.user.id;

    // Link to existing seller profile
    const { data: sellerProfile } = await supabaseAdmin
      .from("seller_profiles")
      .select("id")
      .eq("slug", "demo-seller")
      .maybeSingle();

    if (sellerProfile) {
      // Update created_by on seller profile
      await supabaseAdmin
        .from("seller_profiles")
        .update({ created_by: userId })
        .eq("slug", "demo-seller");

      // Upsert seller_users link
      await supabaseAdmin.from("seller_users").upsert(
        { user_id: userId, seller_id: sellerProfile.id, role: "owner", is_active: true },
        { onConflict: "user_id,seller_id" }
      );
    }

    // Upsert customer_profiles
    await supabaseAdmin.from("customer_profiles").upsert(
      { user_id: userId, first_name: "Demo", last_name: "Seller", email_verified: true },
      { onConflict: "user_id" }
    );

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
