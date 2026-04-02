const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch(e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid request" })
    };
  }

  const to = data.to || {};
  const baseUrl = event.headers.origin || "https://yourdomain.com";

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
        postcard: JSON.stringify(data)
      },
      success_url: baseUrl + "/success?session_id={CHECKOUT_SESSION_ID}",
      //success_url: baseUrl + "/?success=true",
      cancel_url: baseUrl + "/?cancelled=true"
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: session.url })
    };

  } catch(err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
