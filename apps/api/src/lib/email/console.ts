import { EmailSender } from "./sender";

export class ConsoleEmailSender implements EmailSender {
  async send(input: { to: string; subject: string; text: string; html: string }): Promise<void> {
    if (process.env.NODE_ENV === "production") {
      throw new Error("ConsoleEmailSender 는 운영 환경에서 사용 금지 — RESEND_API_KEY 미설정");
    }
    // eslint-disable-next-line no-console
    console.log("[EMAIL]", { to: input.to, subject: input.subject, text: input.text });
  }
}
