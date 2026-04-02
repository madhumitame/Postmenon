const stripe = require(“stripe”)(process.env.STRIPE_SECRET_KEY);
const Lob = require(“lob”)(process.env.LOB_API_KEY);

exports.handler = async function(event) {
var sig = event.headers[“stripe-signature”];

var stripeEvent;
try {
stripeEvent = stripe.webhooks.constructEvent(
event.body,
sig,
process.env.STRIPE_WEBHOOK_SECRET
);
} catch(err) {
console.error(“Webhook signature error:”, err.message);
return { statusCode: 400, body: “Webhook Error: “ + err.message };
}

if (stripeEvent.type === “checkout.session.completed”) {
var session = stripeEvent.data.object;

var payload;
try {
  payload = JSON.parse(session.metadata.postcard);
} catch(err) {
  console.error("Failed to parse postcard metadata:", err.message);
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
}

var to = payload.to;
var from = payload.from;
var message = payload.message;

console.log("Payment received, sending postcard to:", to.name);

function formatZip(zip, country) {
  if (!zip) return "";
  var z = zip.trim().toUpperCase().replace(/\s+/g, "");
  if (country === "GB" && z.length >= 5) {
    return z.slice(0, z.length - 3) + " " + z.slice(z.length - 3);
  }
  if (country === "IN") { return z.replace(/[^0-9]/g, "").slice(0, 6); }
  return z;
}

var backHTML = "<html><body style='font-family:Georgia,serif;margin:0;padding:0;width:6.25in;height:4.25in;display:flex;'>";
backHTML += "<div style='flex:1.4;padding:0.4in 0.3in;border-right:1px solid #ddd;display:flex;flex-direction:column;justify-content:space-between;'>";
backHTML += "<p style='font-size:13pt;font-style:italic;color:#2c1a1a;line-height:1.7;margin:0;'>" + message + "</p>";
backHTML += "<p style='font-size:10pt;color:#7b1d35;font-weight:bold;margin:0;'>From " + from.name + "</p>";
backHTML += "</div>";
backHTML += "<div style='flex:1;padding:0.3in 0.25in 0.15in;display:flex;flex-direction:column;justify-content:space-between;'>";
backHTML += "<div style='align-self:flex-end;width:0.7in;height:0.85in;border:2px solid #ddd;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:20pt;'>🌸</div>";
backHTML += "<div>";
backHTML += "<p style='font-size:8pt;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#7b1d35;margin:0 0 6px 0;'>To:</p>";
backHTML += "<p style='font-size:11pt;font-weight:bold;color:#2c1a1a;margin:0 0 4px 0;'>" + to.name + "</p>";
backHTML += "<p style='font-size:9pt;color:#555;line-height:1.5;margin:0;'>" + to.address + "<br/>";
if (to.address2) { backHTML += to.address2 + "<br/>"; }
backHTML += to.city + (to.state ? ", " + to.state : "") + " " + to.zip + "<br/>" + to.country + "</p>";
backHTML += "</div>";
backHTML += "<div style='display:flex;align-items:center;justify-content:space-between;border-top:1px solid #f0d0da;padding-top:6px;margin-top:6px;'>";
backHTML += "<div><p style='font-family:Georgia,serif;font-size:9pt;font-weight:bold;color:#7b1d35;margin:0;'><span style='color:#ffffff;background:#7b1d35;padding:1px 3px;border-radius:2px;'>Posta</span><span style='color:#d4687e;'>Card.</span></p>";
backHTML += "<p style='font-size:6pt;color:#aaa;margin:0;font-style:italic;'>Send one back!</p></div>";
backHTML += "<img src='https://api.qrserver.com/v1/create-qr-code/?size=54x54&data=https://postacard.netlify.app/&color=7b1d35&bgcolor=ffffff&margin=2' width='54' height='54' style='border-radius:4px;border:1px solid #f0d0da;'/>";
backHTML += "</div></div></body></html>";

var frontContent = "<html><body style='margin:0;padding:0;width:6.25in;height:4.25in;background:linear-gradient(160deg,#87CEEB 0%,#87CEEB 55%,#90EE90 55%,#228B22 100%);display:flex;align-items:flex-end;justify-content:center;padding-bottom:0.3in;font-family:Georgia,serif;'><p style='color:white;font-size:18pt;font-style:italic;text-shadow:0 2px 6px rgba(0,0,0,0.3);background:rgba(0,0,0,0.15);padding:6px 20px;border-radius:20px;margin:0;'>Wish you were here!</p></body></html>";

try {
  var toAddress = {
    name: to.name,
    address_line1: to.address,
    address_city: to.city,
    address_state: to.state || "",
    address_zip: formatZip(to.zip, to.country),
    address_country: to.country
  };
  if (to.address2) { toAddress.address_line2 = to.address2; }

  var fromAddress = {
    name: from.name,
    address_line1: from.address,
    address_city: from.city,
    address_state: from.state || "",
    address_zip: formatZip(from.zip, from.country),
    address_country: from.country
  };
  if (from.address2) { fromAddress.address_line2 = from.address2; }

  await Lob.postcards.create({
    description: "PostaCard from " + from.name + " to " + to.name,
    to: toAddress,
    from: fromAddress,
    front: frontContent,
    back: backHTML,
    size: "4x6"
  });

  console.log("Postcard sent successfully to:", to.name);

} catch(lobErr) {
  console.error("Lob error:", lobErr.message);
}


}

return {
statusCode: 200,
body: JSON.stringify({ received: true })
};
};
