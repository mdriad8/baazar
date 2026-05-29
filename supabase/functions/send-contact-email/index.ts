import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ContactPayload {
  name: string;
  email: string;
  phone?: string;
  topic: string;
  message: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { name, email, phone, topic, message }: ContactPayload = await req.json();

    if (!name || !email || !topic || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background: #f9fafb;">
        <div style="background: #fff; border-radius: 12px; padding: 32px; border: 1px solid #e5e7eb;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid #f3f4f6;">
            <div style="width: 40px; height: 40px; background: #16a34a; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-weight: 700; font-size: 18px;">B</span>
            </div>
            <span style="font-size: 20px; font-weight: 700; color: #111827;">Baazar — New Contact Form Submission</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 10px 12px; background: #f9fafb; border-radius: 6px 0 0 6px; font-size: 13px; font-weight: 600; color: #6b7280; width: 120px;">Name</td>
              <td style="padding: 10px 12px; background: #f9fafb; font-size: 14px; color: #111827; border-radius: 0 6px 6px 0;">${name}</td>
            </tr>
            <tr><td colspan="2" style="height: 6px;"></td></tr>
            <tr>
              <td style="padding: 10px 12px; background: #f9fafb; border-radius: 6px 0 0 6px; font-size: 13px; font-weight: 600; color: #6b7280;">Email</td>
              <td style="padding: 10px 12px; background: #f9fafb; font-size: 14px; color: #111827; border-radius: 0 6px 6px 0;"><a href="mailto:${email}" style="color: #16a34a;">${email}</a></td>
            </tr>
            <tr><td colspan="2" style="height: 6px;"></td></tr>
            <tr>
              <td style="padding: 10px 12px; background: #f9fafb; border-radius: 6px 0 0 6px; font-size: 13px; font-weight: 600; color: #6b7280;">Phone</td>
              <td style="padding: 10px 12px; background: #f9fafb; font-size: 14px; color: #111827; border-radius: 0 6px 6px 0;">${phone || "Not provided"}</td>
            </tr>
            <tr><td colspan="2" style="height: 6px;"></td></tr>
            <tr>
              <td style="padding: 10px 12px; background: #f9fafb; border-radius: 6px 0 0 6px; font-size: 13px; font-weight: 600; color: #6b7280;">Topic</td>
              <td style="padding: 10px 12px; background: #f9fafb; font-size: 14px; border-radius: 0 6px 6px 0;">
                <span style="background: #dcfce7; color: #16a34a; padding: 2px 10px; border-radius: 999px; font-size: 13px; font-weight: 600;">${topic}</span>
              </td>
            </tr>
          </table>

          <div style="background: #f9fafb; border-radius: 8px; padding: 16px;">
            <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #6b7280;">MESSAGE</p>
            <p style="margin: 0; font-size: 14px; color: #111827; line-height: 1.6; white-space: pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
          </div>

          <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af; text-align: center;">
            Submitted via baazar.com.au/contact &nbsp;|&nbsp; ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })} AEST
          </p>
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Baazar Contact Form <onboarding@resend.dev>",
        to: ["baazar003@gmail.com"],
        reply_to: email,
        subject: `[Baazar] New enquiry from ${name} — ${topic}`,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-contact-email error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to send email. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
