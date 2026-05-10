import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const ISSUER = "pLAWcess";

const SIGNUP_VERIFICATION_AUDIENCE = "email-verification:signup";
const PASSWORD_RESET_AUDIENCE = "password-reset";

export type SignupVerificationPayload = {
  email: string;
};

export type ResetTokenPayload = {
  token_id: string;
  raw: string;
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

export function signResetToken(token_id: string, raw: string): string {
  return jwt.sign({ token_id, raw } satisfies ResetTokenPayload, JWT_SECRET, {
    expiresIn: "10m",
    issuer: ISSUER,
    audience: PASSWORD_RESET_AUDIENCE,
  });
}

export function verifyResetToken(token: string): ResetTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: PASSWORD_RESET_AUDIENCE,
    }) as ResetTokenPayload;
  } catch {
    return null;
  }
}
