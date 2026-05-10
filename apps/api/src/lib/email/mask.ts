/**
 * 이메일 마스킹: 로컬파트 1~2자는 첫 1자 + ***, 3자 이상은 첫 2자 + ***
 * 예: a@x.com → a***@x.com, ab@x.com → a***@x.com, hong@gmail.com → ho***@gmail.com
 */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at < 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.length >= 3 ? local.slice(0, 2) : local.slice(0, 1);
  return `${visible}***${domain}`;
}
