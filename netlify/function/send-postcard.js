const Lob = require(“lob”)(process.env.LOB_API_KEY);

exports.handler = async (event) => {

// Only allow POST requests
if (event.httpMethod !== “POST”) {
return {
statusCode: 405,
body: JSON.stringify({ error: “Method not allowed” })
};
}

// Parse the request body sent from index.html
let data;
try {
data = JSON.parse(event.body);
} catch (err) {
return {
statusCode: 400,
body: JSON.stringify({ error: “Invalid request body” })
};
}

const { message, frontImage, to, from } = data;

// Basic validation
if (!message || !to || !from) {
return {
statusCode: 400,
body: JSON.stringify({ error: “Missing required fields: message, to, or from” })
};
}

// Build the postcard back HTML
// This is what gets printed on the message side of the postcard
const backHTML = `
<html>
<body style="
font-family: Georgia, serif;
margin: 0;
padding: 0;
width: 6.25in;
height: 4.25in;
display: flex;
">
<!-- LEFT: Message area -->
<div style="
flex: 1.4;
padding: 0.4in 0.3in;
border-right: 1px solid #ddd;
display: flex;
flex-direction: column;
justify-content: space-between;
">
<p style="
font-size: 13pt;
font-style: italic;
color: #2c1a1a;
line-height: 1.7;
margin: 0;
">${message}</p>

```
      <p style="
        font-size: 10pt;
        color: #7b1d35;
        font-weight: bold;
        margin: 0;
      ">— ${from.name} 💛</p>
    </div>

    <!-- RIGHT: Address area -->
    <div style="
      flex: 1;
      padding: 0.3in 0.25in 0.15in;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    ">
      <!-- Stamp box placeholder -->
      <div style="
        align-self: flex-end;
        width: 0.7in;
        height: 0.85in;
        border: 2px solid #ddd;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20pt;
      ">🌸</div>

      <!-- Recipient address -->
      <div>
        <p style="
          font-size: 8pt;
          font-weight: bold;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #7b1d35;
          margin: 0 0 6px 0;
        ">To:</p>
        <p style="
          font-size: 11pt;
          font-weight: bold;
          color: #2c1a1a;
          margin: 0 0 4px 0;
        ">${to.name}</p>
        <p style="
          font-size: 9pt;
          color: #555;
          line-height: 1.5;
          margin: 0;
        ">
          ${to.address}<br/>
          ${to.city}${to.state ? ", " + to.state : ""} ${to.zip}<br/>
          ${to.country}
        </p>
      </div>

      <!-- PostaCard branding: logo + QR code -->
      <div style="
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 1px solid #f0d0da;
        padding-top: 6px;
        margin-top: 6px;
      ">
        <!-- Logo -->
        <div>
          <p style="
            font-family: Georgia, serif;
            font-size: 9pt;
            font-weight: bold;
            color: #7b1d35;
            margin: 0 0 1px 0;
            letter-spacing: -0.3px;
          ">
            <span style="color: #ffffff; background:#7b1d35; padding: 1px 3px; border-radius:2px;">Posta</span><span style="color: #d4687e;">Card.</span>
          </p>
          <p style="
            font-size: 6pt;
            color: #aaa;
            margin: 0;
            font-style: italic;
          ">Send one back! 💌</p>
        </div>

        <!-- QR Code linking to postacard.netlify.app -->
        <img
          src="https://api.qrserver.com/v1/create-qr-code/?size=54x54&data=https://postacard.netlify.app/&color=7b1d35&bgcolor=ffffff&margin=2"
          width="54"
          height="54"
          alt="PostaCard QR code"
          style="border-radius: 4px; border: 1px solid #f0d0da;"
        />
      </div>

    </div>
  </body>
</html>
```

`;

// Build the postcard front
// If user uploaded a photo, use it. Otherwise use a default Lob-compatible template
const frontContent = frontImage
? frontImage  // base64 image data URL from the user’s upload
: `<html> <body style=" margin: 0; padding: 0; width: 6.25in; height: 4.25in; background: linear-gradient(160deg, #87CEEB 0%, #87CEEB 55%, #90EE90 55%, #228B22 100%); display: flex; align-items: flex-end; justify-content: center; padding-bottom: 0.3in; font-family: Georgia, serif; "> <p style=" color: white; font-size: 18pt; font-style: italic; text-shadow: 0 2px 6px rgba(0,0,0,0.3); background: rgba(0,0,0,0.15); padding: 6px 20px; border-radius: 20px; margin: 0; ">Wish you were here! 🌿</p> </body> </html>`;

try {
const postcard = await Lob.postcards.create({
description: `Postcard from ${from.name} to ${to.name}`,
to: {
name: to.name,
address_line1: to.address,
address_city: to.city,
address_state: to.state || “”,
address_zip: to.zip,
address_country: to.country,
},
from: {
name: from.name,
address_line1: from.address,
address_city: from.city,
address_state: from.state || “”,
address_zip: from.zip,
address_country: from.country,
},
front: frontContent,
back: backHTML,
size: “4x6”,
});

```
return {
  statusCode: 200,
  body: JSON.stringify({
    id: postcard.id,
    status: "sent",
    expectedDelivery: postcard.expected_delivery_date || null
  })
};
```

} catch (err) {
console.error(“Lob API error:”, err);
return {
statusCode: 500,
body: JSON.stringify({
error: err.message || “Something went wrong sending your postcard”
})
};
}
};
