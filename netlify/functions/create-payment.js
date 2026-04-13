const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid request" }) };
  }

  const to = data.to || {};
  const from = data.from || {};
  const baseUrl = event.headers.origin || "https://postacard.netlify.app";

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: "PostaCard",
            description: "A real postcard delivered to " + (to.name || "recipient")
          },
          unit_amount: 200
        },
        quantity: 1
      }],
      mode: "payment",
      metadata: {
        message:       (data.message || "").substring(0, 400),
        to_name:       (to.name || "").substring(0, 100),
        to_address1:   (to.address || "").substring(0, 100),
        to_address2:   (to.address2 || "").substring(0, 100),
        to_city:       (to.city || "").substring(0, 100),
        to_state:      (to.state || "").substring(0, 100),
        to_zip:        (to.zip || "").substring(0, 20),
        to_country:    (to.country || "").substring(0, 2),
        from_name:     (from.name || "").substring(0, 100),
        from_address1: (from.address || "").substring(0, 100),
        from_address2: (from.address2 || "").substring(0, 100),
        from_city:     (from.city || "").substring(0, 100),
        from_state:    (from.state || "").substring(0, 100),
        from_zip:      (from.zip || "").substring(0, 20),
        from_country:  (from.country || "").substring(0, 2)
      },
      success_url: baseUrl + "/?success=true",
      cancel_url:  baseUrl + "/?cancelled=true"
    });

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: session.url })
    };

  } catch(err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
