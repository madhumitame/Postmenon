const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  try {
    const { image } = JSON.parse(event.body);

    const result = await cloudinary.uploader.upload(image, {
      folder: "postacard"
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: result.secure_url
      })
    };

  } catch (err) {

    console.log(err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message
      })
    };
  }
};