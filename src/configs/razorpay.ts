import Razorpay from "razorpay";

const config = {
  key_id: process.env.RAZORPAY_KEY_ID as string,
  key_secret: process.env.RAZORPAY_KEY_SECRET as string,
};

// console.log("Razorpay Config:", config);

const razorpay = new Razorpay(config);

export default razorpay;
