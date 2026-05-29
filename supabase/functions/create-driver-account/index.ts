import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Maps AU state abbreviation (uppercase) to the delivery_areas.name value
const STATE_TO_AREA: Record<string, string> = {
  VIC: "Melbourne",
  NSW: "Sydney",
  QLD: "Brisbane",
  WA:  "Perth",
  SA:  "Adelaide",
  ACT: "Canberra",
  TAS: "Hobart",
  NT:  "Darwin",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: callerUser } } = await callerClient.auth.getUser();
    if (!callerUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: roleData } = await callerClient
      .from("user_roles")
      .select("roles(name)")
      .eq("user_id", callerUser.id)
      .maybeSingle();

    const roleName = (roleData?.roles as { name?: string } | null)?.name;
    if (roleName !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, first_name, last_name, phone, state, vehicle_type, vehicle_rego, notes } = body;

    if (!email || !password || !first_name || !last_name) {
      return new Response(JSON.stringify({ error: "email, password, first_name, last_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!state) {
      return new Response(JSON.stringify({ error: "state is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve area_id from state
    const areaName = STATE_TO_AREA[state.toUpperCase()];
    let area_id: string | null = null;
    if (areaName) {
      const { data: areaData } = await adminClient
        .from("delivery_areas")
        .select("id")
        .ilike("name", areaName)
        .maybeSingle();
      area_id = areaData?.id ?? null;
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, role: "driver" },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: driverRecord, error: driverError } = await adminClient
      .from("delivery_driver_accounts")
      .insert({
        user_id: newUser.user.id,
        first_name,
        last_name,
        email,
        phone: phone ?? "",
        state: state.toUpperCase(),
        area_id,
        vehicle_type: vehicle_type ?? "car",
        vehicle_rego: vehicle_rego ?? "",
        notes: notes ?? "",
        created_by: callerUser.id,
        status: "active",
        must_change_password: true,
      })
      .select("*")
      .single();

    if (driverError) {
      await adminClient.auth.admin.deleteUser(newUser.user.id);
      return new Response(JSON.stringify({ error: driverError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ driver: driverRecord }), {
      status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
