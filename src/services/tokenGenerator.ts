var jwt = require("jsonwebtoken");

const tokenGenerator = (email: string, userId?: number) => {
  const secretKey = process.env.JWT_SECRET;
  const payload = userId ? { email, userId } : { email };
  const token = jwt.sign(payload, secretKey);
  return token;
};
export default tokenGenerator;
