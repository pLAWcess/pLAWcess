import jwt from "jsonwebtoken";

// JWT_SECRET 미설정 시 모듈 로드 시점에 즉시·명확하게 죽는다(fail fast). auth.ts 와 동일.
const rawJwtSecret = process.env.JWT_SECRET;
if (!rawJwtSecret) throw new Error("JWT_SECRET 환경변수가 설정되지 않았습니다.");
const JWT_SECRET = rawJwtSecret;

const ISSUER = "pLAWcess";

const SIGNUP_VERIFICATION_AUDIENCE = "email-verification:signup";
const PASSWORD_RESET_AUDIENCE = "password-reset";
const CHANGE_EMAIL_VERIFICATION_AUDIENCE = "email-verification:change-email";

export type SignupVerificationPayload = {
  email: string;
};

export type ResetTokenPayload = {
  token_id: string;
  raw: string;
};

export type ChangeEmailVerificationPayload = {
  user_id: string;
  newEmail: string;
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

export function signChangeEmailVerificationToken(user_id: string, newEmail: string): string {
  return jwt.sign({ user_id, newEmail } satisfies ChangeEmailVerificationPayload, JWT_SECRET, {
    expiresIn: "10m",
    issuer: ISSUER,
    audience: CHANGE_EMAIL_VERIFICATION_AUDIENCE,
  });
}

export function verifyChangeEmailVerificationToken(token: string): ChangeEmailVerificationPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: CHANGE_EMAIL_VERIFICATION_AUDIENCE,
    }) as ChangeEmailVerificationPayload;
  } catch {
    return null;
  }
}
