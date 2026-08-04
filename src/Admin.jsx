import { useEffect, useMemo, useRef, useState } from "react";
import { pictureUrl, supabase } from "./supabase";

const categories = ["洗漱如厕", "餐饮餐具", "食物饮品", "家居物品", "清洁用品", "人物", "身体部位", "常用动作", "数字", "其他物品"];

async function uploadMedia(file, folder) {
  const extension = file.name?.split(".").pop()?.replace(/[^a-z0-9]/gi, "") || (folder === "audio" ? "webm" : "jpg");
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("word-media").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  return supabase.storage.from("word-media").getPublicUrl(path).data.publicUrl;
}

export function Admin() {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState("words");
  const [words, setWords] = useState([]);
  const [attemptRows, setAttemptRows] = useState([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [imageFile, setImageFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingImageId, setUpdatingImageId] = useState(null);
  const [editingWord, setEditingWord] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState(categories[0]);
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session)).finally(() => setChecking(false));
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setAuthorized(false); return; }
    supabase.rpc("is_current_user_admin").then(({ data, error }) => {
      setAuthorized(Boolean(data) && !error);
      if (!data || error) setMessage("这个邮箱还没有家属管理权限。");
    });
  }, [session]);

  async function loadAdminData() {
    const [{ data: wordData, error: wordError }, { data: attempts, error: attemptError }] = await Promise.all([
      supabase.from("words").select("*").order("category").order("id"),
      supabase.from("attempts").select("id,word_id,mode,first_correct,attempts,response_ms,practiced_at").order("practiced_at", { ascending: false }).limit(3000),
    ]);
    if (wordError) throw wordError;
    if (attemptError) throw attemptError;
    setWords(wordData || []);
    setAttemptRows(attempts || []);
  }

  useEffect(() => {
    if (authorized) loadAdminData().catch(() => setMessage("数据暂时没有加载成功，请稍后重试。"));
  }, [authorized]);

  async function sendLogin(event) {
    event.preventDefault();
    setMessage("正在发送登录邮件……");
    const redirectTo = `${location.origin}${location.pathname}?admin=1`;
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo, shouldCreateUser: true } });
    setMessage(error ? error.message : "登录链接已经发送，请打开邮箱并点击链接。链接只能使用一次。 ");
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setAuthorized(false);
  }

  async function toggleRecord() {
    if (recording) { recorderRef.current?.stop(); setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => { setAudioBlob(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" })); stream.getTracks().forEach((track) => track.stop()); setMessage("录音已经准备好。 "); };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setMessage("正在录音，请清楚地读出这个词语。 ");
    } catch { setMessage("没有取得麦克风权限，可以先不录音。 "); }
  }

  async function addWord(event) {
    event.preventDefault();
    if (!name.trim()) { setMessage("请先填写词语。 "); return; }
    setSaving(true);
    try {
      const imageUrl = imageFile ? await uploadMedia(imageFile, "images") : "";
      const audioUrl = audioBlob ? await uploadMedia(new File([audioBlob], `${name.trim()}.webm`, { type: audioBlob.type }), "audio") : null;
      const { error } = await supabase.from("words").insert({ name: name.trim(), category, image_url: imageUrl, audio_url: audioUrl, emoji: "◉", enabled: true });
      if (error) throw error;
      setName(""); setImageFile(null); setAudioBlob(null); setMessage("已经加入词库。 ");
      await loadAdminData();
    } catch (error) { setMessage(error.message || "没有保存成功，请稍后再试。 "); }
    finally { setSaving(false); }
  }

  async function toggleWord(word) {
    const { error } = await supabase.from("words").update({ enabled: !word.enabled }).eq("id", word.id);
    if (error) setMessage(error.message); else await loadAdminData();
  }

  async function replaceImage(word, file) {
    if (!file) return;
    setUpdatingImageId(word.id);
    try {
      const imageUrl = await uploadMedia(file, "images");
      const { error } = await supabase.from("words").update({ image_url: imageUrl }).eq("id", word.id);
      if (error) throw error;
      setMessage(`“${word.name}”的图片已经更换。`);
      await loadAdminData();
    } catch (error) { setMessage(error.message || "图片没有更换成功。 "); }
    finally { setUpdatingImageId(null); }
  }

  function openEditor(word) {
    setEditingWord(word); setEditName(word.name); setEditCategory(word.category); setEditImageFile(null); setEditImagePreview(pictureUrl(word.image_url));
  }

  function chooseEditImage(file) {
    if (!file) return;
    if (editImagePreview.startsWith("blob:")) URL.revokeObjectURL(editImagePreview);
    setEditImageFile(file); setEditImagePreview(URL.createObjectURL(file));
  }

  function closeEditor() {
    if (editImagePreview.startsWith("blob:")) URL.revokeObjectURL(editImagePreview);
    setEditingWord(null); setEditImageFile(null); setEditImagePreview("");
  }

  async function saveEditor() {
    if (!editingWord || !editName.trim()) return;
    setSaving(true);
    try {
      const imageUrl = editImageFile ? await uploadMedia(editImageFile, "images") : editingWord.image_url;
      const { error } = await supabase.from("words").update({ name: editName.trim(), category: editCategory, image_url: imageUrl }).eq("id", editingWord.id);
      if (error) throw error;
      closeEditor(); setMessage("修改已经保存，并同步到练习页面。 "); await loadAdminData();
    } catch (error) { setMessage(error.message || "修改没有保存成功。 "); }
    finally { setSaving(false); }
  }

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const byWord = new Map(words.map((word) => [word.id, { name: word.name, count: 0, correct: 0, response: 0 }]));
    const modes = { two: { total: 0, correct: 0 }, three: { total: 0, correct: 0 } };
    const days = new Map();
    for (const row of attemptRows) {
      const date = String(row.practiced_at).slice(0, 10);
      days.set(date, (days.get(date) || 0) + 1);
      if (modes[row.mode]) { modes[row.mode].total += 1; if (row.first_correct) modes[row.mode].correct += 1; }
      const item = byWord.get(row.word_id);
      if (item) { item.count += 1; item.correct += row.first_correct ? 1 : 0; item.response += row.response_ms; }
    }
    return {
      today: days.get(today) || 0,
      total: attemptRows.length,
      two: modes.two.total ? Math.round(modes.two.correct / modes.two.total * 100) : 0,
      three: modes.three.total ? Math.round(modes.three.correct / modes.three.total * 100) : 0,
      days: [...days.entries()].sort().slice(-7),
      words: [...byWord.values()].sort((a, b) => b.count - a.count),
    };
  }, [attemptRows, words]);

  if (checking) return <div className="loading">正在检查家属身份……</div>;
  if (!session) return <main className="admin-shell login-shell"><a className="quiet-link" href={location.pathname}>← 返回练习</a><section className="panel login-panel"><div className="eyebrow">家属管理</div><h1>邮箱登录</h1><p>只有登记过的家属邮箱才能修改词库和查看统计。</p><form onSubmit={sendLogin}><label className="field">家属邮箱<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" /></label><button className="primary-button" type="submit">发送登录链接</button></form>{message && <div className="form-message">{message}</div>}</section></main>;
  if (!authorized) return <main className="admin-shell login-shell"><a className="quiet-link" href={location.pathname}>← 返回练习</a><section className="panel login-panel"><h2>暂时没有管理权限</h2><p>{message}</p><button className="secondary-button" onClick={signOut}>换一个邮箱</button></section></main>;

  return <main className="admin-shell">
    <header className="admin-header"><div><div className="eyebrow">家属管理</div><h1>词库与练习记录</h1><p>{session.user.email}</p></div><div className="header-actions"><a href={location.pathname} className="secondary-button link-button">返回练习</a><button className="secondary-button" onClick={signOut}>退出登录</button></div></header>
    <div className="tabs"><button className={`tab ${tab === "words" ? "active" : ""}`} onClick={() => setTab("words")}>词库管理</button><button className={`tab ${tab === "stats" ? "active" : ""}`} onClick={() => setTab("stats")}>练习趋势</button></div>
    {tab === "words" ? <><section className="panel"><h2>添加一个熟悉的词语</h2><form className="form-grid" onSubmit={addWord}><label className="field">词语<input value={name} onChange={(event) => setName(event.target.value)} maxLength={20} /></label><label className="field">分类<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><div className="field full"><span>照片与家人录音</span><div className="upload-row"><label className="file-button">{imageFile ? imageFile.name : "拍照或选择照片"}<input type="file" accept="image/*" capture="environment" onChange={(event) => setImageFile(event.target.files?.[0] || null)} /></label><button type="button" className="file-button" onClick={toggleRecord}>{recording ? "停止录音" : audioBlob ? "重新录音" : "录制声音"}</button></div></div><div className="field full"><button className="primary-button" disabled={saving}>{saving ? "正在保存" : "加入词库"}</button></div></form>{message && <div className="form-message">{message}</div>}</section><section className="panel"><h2>现有词语 · {words.length} 个</h2><div className="word-list">{words.map((word) => <div className="word-row" key={word.id}><div className="word-image-control">{word.image_url ? <img src={pictureUrl(word.image_url)} alt={`${word.name}的当前图片`} /> : <div className="thumb-fallback">{word.emoji}</div>}<label className="quick-image-button">{updatingImageId === word.id ? "上传中" : "换图片"}<input type="file" accept="image/*" capture="environment" disabled={updatingImageId !== null} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; replaceImage(word, file); }} /></label></div><div><strong>{word.name}</strong><small>{word.category}{word.audio_url ? " · 已有家人录音" : " · 系统语音"}</small></div><span className={`pill ${word.enabled ? "" : "off"}`}>{word.enabled ? "练习中" : "已停用"}</span><div className="word-row-actions"><button className="toggle-button" onClick={() => openEditor(word)}>编辑</button><button className="toggle-button" onClick={() => toggleWord(word)}>{word.enabled ? "暂时停用" : "重新启用"}</button></div></div>)}</div></section></> : <><div className="notice">这些数据只用于观察家庭练习情况，不代表医学评估或恢复结论。</div><section className="stat-grid"><div className="stat-card"><span>今天完成</span><strong>{stats.today}</strong></div><div className="stat-card"><span>累计完成</span><strong>{stats.total}</strong></div><div className="stat-card"><span>二选一首次正确</span><strong>{stats.two}%</strong></div><div className="stat-card"><span>三选一首次正确</span><strong>{stats.three}%</strong></div></section><section className="panel"><h2>最近 7 天练习量</h2><div className="bar-list">{stats.days.map(([day, count]) => <div className="bar-row" key={day}><span>{day.slice(5)}</span><div className="bar"><i style={{ width: `${Math.min(100, count / Math.max(...stats.days.map((item) => item[1]), 1) * 100)}%` }} /></div><strong>{count}</strong></div>)}</div></section><section className="panel"><h2>词语练习情况</h2><div className="table-wrap"><table><thead><tr><th>词语</th><th>练习次数</th><th>首次正确</th><th>平均反应时间</th></tr></thead><tbody>{stats.words.map((word) => <tr key={word.name}><td><strong>{word.name}</strong></td><td>{word.count}</td><td>{word.count ? `${Math.round(word.correct / word.count * 100)}%` : "—"}</td><td>{word.count ? `${(word.response / word.count / 1000).toFixed(1)} 秒` : "—"}</td></tr>)}</tbody></table></div></section></>}
    <footer className="attribution">通用图形符号：Sergio Palao / ARASAAC，CC BY-NC-SA 4.0。请优先上传父亲熟悉的真实照片。</footer>
    {editingWord && <div className="edit-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}><section className="edit-dialog" role="dialog" aria-modal="true"><div className="edit-dialog-head"><div><div className="eyebrow">编辑词汇</div><h2>修改“{editingWord.name}”</h2></div><button className="dialog-close" onClick={closeEditor}>×</button></div><div className="edit-image-preview">{editImagePreview ? <img src={editImagePreview} alt="新图片预览" /> : <div className="thumb-fallback">{editingWord.emoji}</div>}</div><div className="edit-image-actions"><label className="file-button">拍照<input type="file" accept="image/*" capture="environment" onChange={(event) => chooseEditImage(event.target.files?.[0])} /></label><label className="file-button">从相册选择<input type="file" accept="image/*" onChange={(event) => chooseEditImage(event.target.files?.[0])} /></label></div><div className="form-grid"><label className="field">词语名称<input value={editName} onChange={(event) => setEditName(event.target.value)} /></label><label className="field">分类<select value={editCategory} onChange={(event) => setEditCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="edit-dialog-actions"><button className="secondary-button" onClick={closeEditor}>取消</button><button className="primary-button" onClick={saveEditor} disabled={saving}>{saving ? "正在保存" : "保存修改"}</button></div></section></div>}
  </main>;
}
