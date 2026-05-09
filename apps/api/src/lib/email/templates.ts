type MailContent = { subject: string; text: string; html: string };

const FOOTER_TEXT = "\n\n요청하지 않으셨다면 이 메일을 무시해주세요.\n— pLAWcess";
const FOOTER_HTML = `<p style="color:#888;font-size:12px;margin-top:24px;">요청하지 않으셨다면 이 메일을 무시해주세요.<br/>— pLAWcess</p>`;

export function signupCodeMail(code: string): MailContent {
  return {
    subject: "[pLAWcess] 회원가입 인증 코드",
    text: `인증 코드는 ${code} 입니다. 5분 안에 입력해주세요.${FOOTER_TEXT}`,
    html: `<div style="font-family:sans-serif;font-size:15px;">인증 코드는 <strong style="font-size:20px;">${code}</strong> 입니다.<br/>5분 안에 입력해주세요.${FOOTER_HTML}</div>`,
  };
}
