import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const { email, first_name } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = first_name ? first_name : "there";

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Baazar</title>
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
          <!-- Body -->
          <tr>
            <td style="background:#fff;padding:40px 40px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#111827;">
                Hey ${name}, welcome to Baazar!
              </h1>
              <p style="margin:0 0 24px;font-size:16px;color:#6b7280;line-height:1.6;">
                We're thrilled to have you join Australia's premier South Asian marketplace. Your account is all set — start exploring thousands of authentic products today.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;width:100%;">
                ${[
                  ["🛒", "Shop 10,000+ products", "From groceries to clothing and electronics"],
                  ["🥩", "Halal certified", "Fresh meat and groceries you can trust"],
                  ["🚚", "Fast delivery", "Australia-wide delivery to your door"],
                  ["🏷️", "Exclusive deals", "Member-only promos and discounts"],
                ].map(([icon, title, desc]) => `
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
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
              <div style="text-align:center;">
                <a href="https://baazar.com.au" style="display:inline-block;background:#166534;color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;">
                  Start Shopping
                </a>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; ${new Date().getFullYear()} Baazar Pty Ltd, Australia &bull;
                <a href="https://baazar.com.au" style="color:#6b7280;text-decoration:none;">baazar.com.au</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Baazar <noreply@baazar.com.au>",
        to: [email],
        subject: `Welcome to Baazar, ${name}!`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
