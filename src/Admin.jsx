import { useEffect, useMemo, useRef, useState } from "react";
import {
  addWord as saveNewWord,
  exportOfflineData,
  fileToDataUrl,
  getAttempts,
  getWords,
  importOfflineData,
  pictureUrl,
  updateWord,
} from "./offlineDb";
import { saveUserWord } from "./cloudbase";

const categories = ["洗漱如厕", "餐饮餐具", "食物饮品", "家居物品", "清洁用品", "人物", "身体部位", "常用动作", "兴趣活动", "出行用品", "随身物品", "拼音字母", "数字", "其他物品"];

function userId(user) { return user?.uid || user?.openid || user?.id || ""; }

export function Admin({ auth }) {
  const [tab, setTab] = useState("words");
  const [words, setWords] = useState([]);
  const [attemptRows, setAttemptRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
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

  async function loadData() {
    const [wordData, attempts] = await Promise.all([getWords(), getAttempts()]);
    setWords(wordData);
    setAttemptRows(attempts);
  }

  useEffect(() => {
    loadData().catch(() => setMessage("本地数据暂时没有加载成功，请重新打开页面。" )).finally(() => setLoading(false));
  }, []);

  async function toggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        setAudioBlob(new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" }));
        stream.getTracks().forEach((track) => track.stop());
        setMessage("录音已经保存在待添加的词语中。" );
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setMessage("正在录音，请清楚地读出这个词语。" );
    } catch {
      setMessage("没有取得麦克风权限，可以先使用设备自带的普通话语音。" );
    }
  }

  async function addWord(event) {
    event.preventDefault();
    if (!name.trim()) { setMessage("请先填写词语。" ); return; }
    setSaving(true);
    try {
      const newWord = {
        name: name.trim(),
        category,
        image_url: imageFile ? await fileToDataUrl(imageFile) : "",
        audio_url: audioBlob ? await fileToDataUrl(audioBlob) : "",
        created_at: new Date().toISOString(),
      };
      await saveNewWord(newWord);
      const uid = userId(auth.user);
      if (uid) {
        try { await saveUserWord(newWord, uid); setMessage("已经加入个人词库，并同步到登录账号。" ); }
        catch { setMessage("已经保存在本机，云端暂时未连接。" ); }
      } else setMessage("已经加入本机词库。登录后添加的词会同步到账号。" );
      setName("");
      setImageFile(null);
      setAudioBlob(null);
      await loadData();
    } catch (error) {
      setMessage(error.message || "没有保存成功，请再试一次。" );
    } finally {
      setSaving(false);
    }
  }

  async function toggleWord(word) {
    await updateWord(word.id, { enabled: !word.enabled });
    await loadData();
  }

  async function replaceImage(word, file) {
    if (!file) return;
    setUpdatingImageId(word.id);
    try {
      await updateWord(word.id, { image_url: await fileToDataUrl(file) });
      setMessage(`“${word.name}”的图片已经保存在这台设备。`);
      await loadData();
    } catch (error) {
      setMessage(error.message || "图片没有更换成功。" );
    } finally {
      setUpdatingImageId(null);
    }
  }

  function openEditor(word) {
    setEditingWord(word);
    setEditName(word.name);
    setEditCategory(word.category);
    setEditImageFile(null);
    setEditImagePreview(pictureUrl(word.image_url));
  }

  function chooseEditImage(file) {
    if (!file) return;
    if (editImagePreview.startsWith("blob:")) URL.revokeObjectURL(editImagePreview);
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
  }

  function closeEditor() {
    if (editImagePreview.startsWith("blob:")) URL.revokeObjectURL(editImagePreview);
    setEditingWord(null);
    setEditImageFile(null);
    setEditImagePreview("");
  }

  async function saveEditor() {
    if (!editingWord || !editName.trim()) return;
    setSaving(true);
    try {
      await updateWord(editingWord.id, {
        name: editName.trim(),
        category: editCategory,
        image_url: editImageFile ? await fileToDataUrl(editImageFile) : editingWord.image_url,
      });
      closeEditor();
      setMessage("修改已经保存到这台设备。" );
      await loadData();
    } catch (error) {
      setMessage(error.message || "修改没有保存成功。" );
    } finally {
      setSaving(false);
    }
  }

  async function downloadBackup() {
    const data = await exportOfflineData();
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `慢慢来练习备份-${new Date().toLocaleDateString("sv-SE")}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("备份文件已经下载，请妥善保存。" );
  }

  async function restoreBackup(file) {
    if (!file) return;
    try {
      await importOfflineData(JSON.parse(await file.text()));
      await loadData();
      setMessage("备份已经恢复。" );
    } catch (error) {
      setMessage(error.message || "备份文件无法恢复。" );
    }
  }

  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString("sv-SE");
    const byWord = new Map(words.map((word) => [word.id, { name: word.name, count: 0, correct: 0, response: 0 }]));
    const modes = { two: { total: 0, correct: 0 }, three: { total: 0, correct: 0 } };
    const days = new Map();
    for (const row of attemptRows) {
      const date = new Date(row.practiced_at).toLocaleDateString("sv-SE");
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

  if (loading) return <div className="loading">正在打开本机词库……</div>;

  return <main className="admin-shell">
    <header className="admin-header"><div><div className="eyebrow">个人词库 · 断网可用</div><h1>添加自己的词语</h1><p>{auth.user ? "新词会保存在本机，并同步到当前登录账号。" : "当前未登录，新词先保存在这台设备。登录后添加即可跨设备使用。"}</p></div><div className="header-actions"><span className="local-badge">{auth.user ? "✓ 已登录" : "本机模式"}</span>{!auth.user && <button className="secondary-button" onClick={auth.openLogin}>邮箱登录</button>}<a href={location.pathname} className="secondary-button link-button">返回首页</a></div></header>
    <div className="tabs"><button className={`tab ${tab === "words" ? "active" : ""}`} onClick={() => setTab("words")}>词库管理</button><button className={`tab ${tab === "stats" ? "active" : ""}`} onClick={() => setTab("stats")}>练习趋势</button><button className={`tab ${tab === "backup" ? "active" : ""}`} onClick={() => setTab("backup")}>备份与恢复</button></div>

    {tab === "words" && <><section className="panel"><h2>添加一个熟悉的词语</h2><form className="form-grid" onSubmit={addWord}><label className="field">词语<input value={name} onChange={(event) => setName(event.target.value)} maxLength={20} /></label><label className="field">分类<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><div className="field full"><span>照片与家人录音</span><div className="upload-row"><label className="file-button">{imageFile ? imageFile.name : "拍照或选择照片"}<input type="file" accept="image/*" capture="environment" onChange={(event) => setImageFile(event.target.files?.[0] || null)} /></label><button type="button" className={`file-button ${recording ? "recording" : ""}`} onClick={toggleRecord}>{recording ? "停止录音" : audioBlob ? "重新录音" : "录制声音"}</button></div></div><div className="field full"><button className="primary-button" disabled={saving}>{saving ? "正在保存" : "加入词库"}</button></div></form>{message && <div className="form-message">{message}</div>}</section><section className="panel"><h2>现有词语 · {words.length} 个</h2><div className="word-list">{words.map((word) => <div className="word-row" key={word.id}><div className="word-image-control">{word.image_url ? <img src={pictureUrl(word.image_url)} alt={`${word.name}的当前图片`} /> : <div className="thumb-fallback">{word.emoji}</div>}<label className={`quick-image-button ${updatingImageId === word.id ? "busy" : ""}`}>{updatingImageId === word.id ? "保存中" : "换图片"}<input type="file" accept="image/*" capture="environment" disabled={updatingImageId !== null} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; replaceImage(word, file); }} /></label></div><div><strong>{word.name}</strong><small>{word.category}{word.audio_url ? " · 已有家人录音" : " · 设备语音"}</small></div><span className={`pill ${word.enabled ? "" : "off"}`}>{word.enabled ? "练习中" : "已停用"}</span><div className="word-row-actions"><button className="toggle-button" onClick={() => openEditor(word)}>编辑</button><button className="toggle-button" onClick={() => toggleWord(word)}>{word.enabled ? "暂时停用" : "重新启用"}</button></div></div>)}</div></section></>}

    {tab === "stats" && <><div className="notice">这些数据只用于观察家庭练习情况，不代表医学评估或恢复结论。</div><section className="stat-grid"><div className="stat-card"><span>今天完成</span><strong>{stats.today}</strong></div><div className="stat-card"><span>累计完成</span><strong>{stats.total}</strong></div><div className="stat-card"><span>二选一首次正确</span><strong>{stats.two}%</strong></div><div className="stat-card"><span>三选一首次正确</span><strong>{stats.three}%</strong></div></section><section className="panel"><h2>最近 7 天练习量</h2><div className="bar-list">{stats.days.length ? stats.days.map(([day, count]) => <div className="bar-row" key={day}><span>{day.slice(5)}</span><div className="bar"><i style={{ width: `${Math.min(100, count / Math.max(...stats.days.map((item) => item[1]), 1) * 100)}%` }} /></div><strong>{count}</strong></div>) : <p className="muted-copy">完成练习后，这里会显示每天的练习量。</p>}</div></section><section className="panel"><h2>词语练习情况</h2><div className="table-wrap"><table><thead><tr><th>词语</th><th>练习次数</th><th>首次正确</th><th>平均反应时间</th></tr></thead><tbody>{stats.words.map((word) => <tr key={word.name}><td><strong>{word.name}</strong></td><td>{word.count}</td><td>{word.count ? `${Math.round(word.correct / word.count * 100)}%` : "—"}</td><td>{word.count ? `${(word.response / word.count / 1000).toFixed(1)} 秒` : "—"}</td></tr>)}</tbody></table></div></section></>}

    {tab === "backup" && <section className="panel backup-panel"><div className="eyebrow">建议每月备份一次</div><h2>保存本机数据</h2><p>备份文件包含自定义词语、照片、家人录音和练习记录。换电脑或清除浏览器数据前，请先下载备份。</p><div className="backup-actions"><button className="primary-button" onClick={downloadBackup}>下载备份文件</button><label className="file-button">从备份恢复<input type="file" accept="application/json,.json" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; restoreBackup(file); }} /></label></div>{message && <div className="form-message">{message}</div>}</section>}

    <footer className="attribution">通用图形符号：Sergio Palao / ARASAAC，CC BY-NC-SA 4.0。请优先上传父亲熟悉的真实照片。</footer>
    {editingWord && <div className="edit-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}><section className="edit-dialog" role="dialog" aria-modal="true"><div className="edit-dialog-head"><div><div className="eyebrow">编辑词汇</div><h2>修改“{editingWord.name}”</h2></div><button className="dialog-close" onClick={closeEditor}>×</button></div><div className="edit-image-preview">{editImagePreview ? <img src={editImagePreview} alt="新图片预览" /> : <div className="thumb-fallback">{editingWord.emoji}</div>}</div><div className="edit-image-actions"><label className="file-button">拍照<input type="file" accept="image/*" capture="environment" onChange={(event) => chooseEditImage(event.target.files?.[0])} /></label><label className="file-button">从相册选择<input type="file" accept="image/*" onChange={(event) => chooseEditImage(event.target.files?.[0])} /></label></div><div className="form-grid"><label className="field">词语名称<input value={editName} onChange={(event) => setEditName(event.target.value)} /></label><label className="field">分类<select value={editCategory} onChange={(event) => setEditCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="edit-dialog-actions"><button className="secondary-button" onClick={closeEditor}>取消</button><button className="primary-button" onClick={saveEditor} disabled={saving}>{saving ? "正在保存" : "保存修改"}</button></div></section></div>}
  </main>;
}
