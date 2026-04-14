const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Lob = require("lob")(process.env.LOB_API_KEY);

function formatZip(zip, country) {
  if (!zip) return "";
  const z = zip.trim().toUpperCase().replace(/\s+/g, "");
  if (country === "GB" && z.length >= 5) {
    return z.slice(0, z.length - 3) + " " + z.slice(z.length - 3);
  }
  if (country === "IN") return z.replace(/[^0-9]/g, "").slice(0, 6);
  if (country === "CA" && z.length === 6) return z.slice(0, 3) + " " + z.slice(3);
  return z;
}

exports.handler = async function(event) {
  const sig = event.headers["stripe-signature"];

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return { statusCode: 400, body: "Webhook Error: " + err.message };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    console.log("Payment confirmed! Building postcard...");
    const m = stripeEvent.data.object.metadata;

    const toZip   = formatZip(m.to_zip,   m.to_country);
    const fromZip = formatZip(m.from_zip, m.from_country);

    const toAddress = {
      name:            m.to_name,
      address_line1:   m.to_address1,
      address_city:    m.to_city,
      address_state:   m.to_state,
      address_zip:     toZip,
      address_country: m.to_country
    };
    if (m.to_address2) toAddress.address_line2 = m.to_address2;

    const fromAddress = {
      name:            m.from_name,
      address_line1:   m.from_address1,
      address_city:    m.from_city,
      address_state:   m.from_state,
      address_zip:     fromZip,
      address_country: m.from_country
    };
    if (m.from_address2) fromAddress.address_line2 = m.from_address2;

    const safeMessage = (m.message || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const safeName    = (m.from_name || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const frontHtml = `<html><body style="margin:0;padding:0;width:6.25in;height:4.25in;background:linear-gradient(160deg,#87CEEB 0%,#87CEEB 55%,#90EE90 55%,#228B22 100%);display:flex;align-items:flex-end;justify-content:center;padding-bottom:0.3in;font-family:Georgia,serif;"><p style="color:white;font-size:18pt;font-style:italic;text-shadow:0 2px 6px rgba(0,0,0,0.3);background:rgba(0,0,0,0.15);padding:6px 20px;border-radius:20px;margin:0;">Wish you were here! 🌿</p></body></html>`;

    const backHtml = `<html><body style="margin:0;padding:0;width:6.25in;height:4.25in;display:flex;font-family:Georgia,serif;"><div style="flex:1.4;padding:0.4in 0.3in;border-right:1px solid #ddd;display:flex;flex-direction:column;justify-content:space-between;"><p style="font-size:13pt;font-style:italic;color:#2c1a1a;line-height:1.7;margin:0;">${safeMessage}</p><p style="font-size:10pt;color:#7b1d35;font-weight:bold;margin:0;">— ${safeName} 💛</p></div><div style="flex:1;padding:0.3in 0.25in 0.15in;display:flex;flex-direction:column;justify-content:space-between;"><div style="align-self:flex-end;width:0.7in;height:0.85in;border:2px solid #ddd;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:20pt;">🌸</div><div><p style="font-size:8pt;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#7b1d35;margin:0 0 6px 0;">To:</p><p style="font-size:11pt;font-weight:bold;color:#2c1a1a;margin:0 0 4px 0;">${m.to_name}</p><p style="font-size:9pt;color:#555;line-height:1.5;margin:0;">${m.to_address1}<br/>${m.to_city}, ${m.to_state} ${toZip}<br/>${m.to_country}</p></div><div style="border-top:1px solid #f0d0da;padding-top:6px;margin-top:6px;display:flex;align-items:center;justify-content:space-between;"><p style="font-family:Georgia,serif;font-size:9pt;font-weight:bold;color:#7b1d35;margin:0;"><span style="background:#7b1d35;color:white;padding:1px 3px;border-radius:2px;">Posta</span><span style="color:#d4687e;">Card.</span></p><img src="https://api.qrserver.com/v1/create-qr-code/?size=54x54&data=https://postacard.netlify.app/&color=7b1d35&bgcolor=ffffff&margin=2" width="54" height="54" style="border-radius:4px;border:1px solid #f0d0da;" /></div></div></body></html>`;

    try {
      const postcard = await Lob.postcards.create({
        description: "PostaCard from " + m.from_name,
        to:    toAddress,
        from:  fromAddress,
        front: frontHtml,
        back:  backHtml,
        size:  "4x6"
        mail_type: "first_class"
      });
      console.log("Postcard created! Lob ID:", postcard.id);
    } catch (err) {
      console.error("Lob error:", err.message, JSON.stringify(err));
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
