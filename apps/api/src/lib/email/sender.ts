import { ResendEmailSender } from "./resend";
import { ConsoleEmailSender } from "./console";

export interface EmailSender {
  send(input: { to: string; subject: string; text: string; html: string }): Promise<void>;
}

export class EmailDeliveryError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

let cached: EmailSender | null = null;

export function getEmailSender(): EmailSender {
  if (cached) return cached;
  if (process.env.RESEND_API_KEY) {
    cached = new ResendEmailSender(
      process.env.RESEND_API_KEY,
      process.env.MAIL_FROM ?? "pLAWcess <onboarding@resend.dev>",
    );
  } else {
    cached = new ConsoleEmailSender();
  }
  return cached;
}
