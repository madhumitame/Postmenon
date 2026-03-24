const stripe = require(“stripe”)(process.env.STRIPE_SECRET_KEY);

exports.handler = async function(event) {
  if (event.httpMethod !== “POST”) {
    return { statusCode: 405, body: “Method Not Allowed” };
  }

var data;
try {
  data = JSON.parse(event.body);
} catch(e) {
  return { statusCode: 400, body: JSON.stringify({ error: “Invalid request” }) };
}

var to = data.to;

try {
  var session = await stripe.checkout.sessions.create({
    payment_method_types: [“card”],
    line_items: [{
      price_data: {
        currency: “usd”,
        product_data: {
          name: “PostaCard.”,
          description: “A real postcard delivered to “ + to.name
        },
        unit_amount: 200
      },
      quantity: 1
    }],
    mode: “payment”,
    success_url: event.headers.origin + “/success?session_id={CHECKOUT_SESSION_ID}”,
    cancel_url: event.headers.origin + “/?cancelled=true”
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ url: session.url })
  };

} catch(err) {
  return {
    statusCode: 500,
    body: JSON.stringify({ error: err.message })
    };
  }
};
