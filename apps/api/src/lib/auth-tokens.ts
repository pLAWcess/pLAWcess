import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const ISSUER = "pLAWcess";

const SIGNUP_VERIFICATION_AUDIENCE = "email-verification:signup";

export type SignupVerificationPayload = {
  email: string;
};

export function signSignupVerificationToken(email: string): string {
  return jwt.sign({ email } satisfies SignupVerificationPayload, JWT_SECRET, {
    expiresIn: "10m",
    issuer: ISSUER,
    audience: SIGNUP_VERIFICATION_AUDIENCE,
  });
}

export function verifySignupVerificationToken(token: string): SignupVerificationPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: SIGNUP_VERIFICATION_AUDIENCE,
    }) as SignupVerificationPayload;
  } catch {
    return null;
  }
}
