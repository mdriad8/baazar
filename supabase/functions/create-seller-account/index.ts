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

    const { seller_id, email, first_name, business_name } = await req.json();

    if (!seller_id || !email) {
      return new Response(JSON.stringify({ error: "seller_id and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Create new auth user with a random temp password; they'll reset via the link
      const tempPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { first_name: first_name ?? "", last_name: "" },
      });

      if (createError || !newUser.user) {
        return new Response(JSON.stringify({ error: createError?.message ?? "Failed to create user" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = newUser.user.id;

      // Create customer_profiles entry
      await supabaseAdmin.from("customer_profiles").upsert({
        user_id: userId,
        first_name: first_name ?? "",
        last_name: "",
      }, { onConflict: "user_id", ignoreDuplicates: true });
    }

    // Link user to seller profile as owner
    const { error: linkError } = await supabaseAdmin.from("seller_users").upsert({
      user_id: userId,
      seller_id,
      role: "owner",
      is_active: true,
    }, { onConflict: "user_id,seller_id", ignoreDuplicates: true });

    if (linkError) {
      return new Response(JSON.stringify({ error: linkError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a password reset link so the seller can set their own password
    const { data: linkData, error: linkGenError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${Deno.env.get("NEXT_PUBLIC_SITE_URL") ?? "https://baazar.com.au"}/seller-dashboard/login`,
      },
    });

    if (linkGenError || !linkData?.properties?.action_link) {
      return new Response(JSON.stringify({ error: linkGenError?.message ?? "Failed to generate reset link" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resetLink = linkData.properties.action_link;

    // Send the seller approval email with the password setup link
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured — seller account created but email not sent", reset_link: resetLink }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = first_name ? first_name : "there";
    const storeName = business_name ?? "your store";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Your Seller Account is Approved</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="background:#166534;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="display:inline-table;">
                <tr>
                  <td style="background:rgba(255,255,255,0.2);border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;">
                    <span style="color:#fff;font-size:22px;font-weight:700;line-height:40px;">B</span>
                  </td>
                  <td style="padding-left:10px;">
                    <span style="color:#fff;font-size:24px;font-weight:700;">Baazar</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Congrats banner -->
          <tr>
            <td style="background:#dcfce7;padding:20px 40px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:13px;font-weight:600;color:#166534;letter-spacing:0.05em;text-transform:uppercase;">Seller Account Approved</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background:#fff;padding:40px 40px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#111827;">
                Congratulations, ${name}!
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#6b7280;line-height:1.6;">
                Your seller account for <strong style="color:#111827;">${storeName}</strong> has been approved. You can now list products and start selling on Baazar — Australia's premier South Asian marketplace.
              </p>

              <!-- Features -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;width:100%;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
                <tr><td style="background:#f9fafb;padding:12px 16px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0;font-size:12px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.05em;">What you can do as a seller</p>
                </td></tr>
                ${[
                  ["📦", "List unlimited products", "Upload products for approval and go live instantly"],
                  ["📊", "Real-time dashboard", "Track orders, stock, and revenue in one place"],
                  ["💰", "Settlements & payouts", "Get paid on a regular schedule to your bank account"],
                  ["📢", "Boost with ads", "Promote your products to thousands of buyers"],
                ].map(([icon, title, desc]) => `
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #f3f4f6;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:20px;padding-right:12px;vertical-align:top;">${icon}</td>
                        <td>
                          <div style="font-size:14px;font-weight:600;color:#111827;">${title}</div>
                          <div style="font-size:13px;color:#9ca3af;margin-top:2px;">${desc}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>`).join("")}
              </table>

              <!-- Set Password CTA -->
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
                <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#166534;">Set your password to get started</p>
                <p style="margin:0 0 16px;font-size:13px;color:#4b7c59;line-height:1.5;">Click the button below to create your password and access your seller dashboard. This link expires in 24 hours.</p>
                <div style="text-align:center;">
                  <a href="${resetLink}" style="display:inline-block;background:#166534;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
                    Set My Password &amp; Sign In
                  </a>
                </div>
              </div>

              <p style="margin:0;font-size:13px;color:#9ca3af;text-align:center;">
                If the button doesn't work, copy and paste this link into your browser:<br/>
                <a href="${resetLink}" style="color:#166534;word-break:break-all;font-size:12px;">${resetLink}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} Baazar Pty Ltd, Australia &bull;
                <a href="https://baazar.com.au" style="color:#6b7280;text-decoration:none;">baazar.com.au</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#d1d5db;">
                You received this email because an admin approved your seller account on Baazar.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Baazar Sellers <noreply@baazar.com.au>",
        to: [email],
        subject: `Congratulations! Your Baazar seller account is approved`,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      return new Response(JSON.stringify({ error: `Account created but email failed: ${errText}`, reset_link: resetLink }), {
        status: 207,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
