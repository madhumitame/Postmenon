const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const Lob = require("lob")(process.env.LOB_API_KEY);

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
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`
    };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    try {
      const payload = JSON.parse(session.metadata.postcard);

      await Lob.postcards.create({
        description: "PostaCard order",
        to: payload.to,
        from: payload.from,
        front: payload.frontImage || "https://via.placeholder.com/600x400",
        back: `<html><body>${payload.message}</body></html>`
      });

      console.log("✅ Postcard sent");

    } catch (err) {
      console.error("❌ Lob error:", err);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
