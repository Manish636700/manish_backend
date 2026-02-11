import nodemailer from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

const otpSender = async (otp: number, email: string): Promise<void> => {
  // Validate required environment variables
  const requiredEnvVars = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const missingVars = requiredEnvVars.filter(
    (key) => !process.env[key]
  );

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required SMTP environment variables: ${missingVars.join(", ")}`
    );
  }

  const config: EmailConfig = {
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === "465", // true only for 465
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  };

  try {
    const transporter = nodemailer.createTransport(config);

    // Verify SMTP connection
    await transporter.verify();
    console.log("✅ SMTP server is ready to send emails");

    const mailOptions = {
      from: `"Sassy Shringaar" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "🔐 Your OTP for Sassy Shringaar",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #d4af37; margin: 0; font-size: 28px;">✨ Sassy Shringaar</h1>
              <p style="color: #666; margin-top: 10px;">Your Premium Jewelry Destination</p>
            </div>

            <div style="text-align: center;">
              <h2>Email Verification</h2>
              <p>Use the OTP below to verify your email:</p>

              <div style="background: #f0f0f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #d4af37;">
                  ${otp}
                </span>
              </div>

              <p style="font-size: 14px;">OTP valid for <strong>5 minutes</strong>.</p>
            </div>

            <hr />

            <p style="font-size: 12px; color: #999; text-align: center;">
              If you didn’t request this OTP, ignore this email.
            </p>
            <p style="font-size: 12px; color: #999; text-align: center;">
              © 2024 Sassy Shringaar. All rights reserved.
            </p>
          </div>
        </div>
      `,
      text: `Your OTP for Sassy Shringaar is ${otp}. It is valid for 5 minutes.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully: ${info.messageId}`);
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw new Error(
      "Failed to send verification email. Please check SMTP configuration."
    );
  }
};

export default otpSender;
