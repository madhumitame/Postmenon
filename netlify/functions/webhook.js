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
    console.error("❌ Webhook signature error:", err.message);
    return { statusCode: 400, body: "Webhook Error" };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    console.log("✅ Payment received!");
    
    const session = stripeEvent.data.object;

    try {
      const payload = JSON.parse(session.metadata.postcard);

      await Lob.postcards.create({
        description: "Postcard",
        to: payload.to,
        from: payload.from,
        front: payload.front,
        back: payload.back
      });

      console.log("💌 Postcard sent!");

    } catch (err) {
      console.error("❌ Lob error:", err.message);
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
