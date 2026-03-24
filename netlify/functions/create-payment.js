const stripe = require(“stripe”)(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {

// Only allow POST requests
if (event.httpMethod !== “POST”) {
return {
statusCode: 405,
body: JSON.stringify({ error: “Method not allowed” })
};
}

// Parse the request body
let data;
try {
data = JSON.parse(event.body);
} catch (err) {
return {
statusCode: 400,
body: JSON.stringify({ error: “Invalid request body” })
};
}

// Store all postcard data in Stripe metadata
// So we can retrieve it after payment succeeds
const { message, frontImage, to, from } = data;

try {
const session = await stripe.checkout.sessions.create({
payment_method_types: [“card”],
line_items: [
{
price_data: {
currency: “usd”,
product_data: {
name: “PostaCard.”,
description: `A real postcard delivered to ${to.name} 💌`,
images: [“https://i.imgur.com/placeholder.png”], // optional product image
},
unit_amount: 200, // $2.00 in cents
},
quantity: 1,
},
],
mode: “payment”,

```
  // Where to redirect after payment
  success_url: `${event.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${event.headers.origin}/?cancelled=true`,

  // Store postcard data in metadata so we can send it after payment
  metadata: {
    message: message,
    frontImage: frontImage ? "uploaded" : "default",
    to_name: to.name,
    to_address: to.address,
    to_city: to.city,
    to_state: to.state || "",
    to_zip: to.zip,
    to_country: to.country,
    from_name: from.name,
    from_address: from.address,
    from_city: from.city,
    from_state: from.state || "",
    from_zip: from.zip,
    from_country: from.country,
  },
});

return {
  statusCode: 200,
  body: JSON.stringify({ url: session.url })
};
```

} catch (err) {
console.error(“Stripe error:”, err);
return {
statusCode: 500,
body: JSON.stringify({ error: err.message || “Payment setup failed” })
};
}
};
