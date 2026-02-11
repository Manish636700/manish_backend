import otpSender from "@/services/otpSender";
import crypto from "crypto";

export const createNewOtp = async (email: string): Promise<string> => {
  const key = process.env.OTP_SECRET;

  if (!key) {
    throw new Error("OTP_SECRET environment variable is not set");
  }

  // Generate a random 4-digit OTP
  const otp = Math.floor(1000 + Math.random() * 9000);
  const otpValidity = 5 * 60 * 1000; // 5 minutes
  const expiry = Date.now() + otpValidity;
  const data = `${email}.${otp}.${expiry}`;

  const hash = crypto.createHmac("sha256", key).update(data).digest("hex");

  const fullhash = `${hash}.${expiry}`;

  console.log(`Generated OTP for ${email}: ${otp}`);

  try {
    // Send OTP via email
    await otpSender(otp, email);
    console.log(`OTP sent successfully to ${email}`);
  } catch (error) {
    console.error(`Failed to send OTP to ${email}:`, error);
    throw new Error("Failed to send OTP. Please try again.");
  }

  return fullhash;
};
