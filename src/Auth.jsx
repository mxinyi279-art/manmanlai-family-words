import { useEffect, useState } from "react";
import { cloudSignOut, getCloudLogin, sendEmailCode, verifyEmailCode } from "./cloudbase";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [open, setOpen] = useState(false);
  useEffect(() => { getCloudLogin().then((state) => setUser(state?.user || state || null)).finally(() => setChecking(false)); }, []);
  return { user, checking, openLogin: () => setOpen(true), closeLogin: () => setOpen(false), setUser, loginOpen: open, logout: async () => { await cloudSignOut(); setUser(null); } };
}

export function LoginDialog({ auth }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [verifier, setVerifier] = useState(null);
  const [message, setMessage] = useState("");
  if (!auth.loginOpen) return null;
  async function send() {
    if (!email.includes("@")) { setMessage("请填写正确的邮箱地址。"); return; }
    setPending(true); setMessage("");
    try { const nextVerifier = await sendEmailCode(email); setVerifier(nextVerifier); setSent(true); setMessage("验证码已发送，请查看邮箱（也请检查垃圾邮件）。"); }
    catch (error) { setMessage(error.message || "验证码服务暂时不可用，仍可先离线练习。"); }
    finally { setPending(false); }
  }
  async function verify() {
    if (!code.trim()) { setMessage("请填写邮箱中的验证码。"); return; }
    setPending(true); setMessage("");
    try { const result = await verifyEmailCode(verifier, code); auth.setUser(result?.user || result); auth.closeLogin(); }
    catch (error) { setMessage(error.message || "验证码不正确，请重新输入。"); }
    finally { setPending(false); }
  }
  return <div className="edit-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) auth.closeLogin(); }}>
    <section className="edit-dialog auth-dialog" role="dialog" aria-modal="true">
      <div className="edit-dialog-head"><div><div className="eyebrow">同步学习记录</div><h2>邮箱登录</h2></div><button className="dialog-close" onClick={auth.closeLogin}>×</button></div>
      <p className="muted-copy">不需要手机号。登录后，收藏、熟练状态和自己添加的词语会跟着账号同步。</p>
      <label className="field">邮箱地址<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" /></label>
      {sent && <label className="field auth-code-field">邮箱验证码<input inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} placeholder="输入验证码" /></label>}
      {message && <div className="form-message">{message}</div>}
      <div className="edit-dialog-actions"><button className="secondary-button" onClick={auth.closeLogin}>先离线使用</button><button className="primary-button" onClick={sent ? verify : send} disabled={pending}>{pending ? "处理中" : sent ? "确认登录" : "发送验证码"}</button></div>
    </section>
  </div>;
}
