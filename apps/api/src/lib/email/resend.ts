import { Resend } from "resend";
import { EmailSender, EmailDeliveryError } from "./sender";

export class ResendEmailSender implements EmailSender {
  private client: Resend;
  constructor(apiKey: string, private from: string) {
    this.client = new Resend(apiKey);
  }
  async send(input: { to: string; subject: string; text: string; html: string }): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    if (error) {
      throw new EmailDeliveryError(`Resend 발송 실패: ${error.message ?? "unknown"}`, error);
    }
  }
}
