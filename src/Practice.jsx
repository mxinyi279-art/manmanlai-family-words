import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listPublicWords, listUserStates, listUserWords, saveAttempt, saveWordState } from "./cloudbase";
import { addAttempt, getWords, mergeWords, pictureUrl, updateWord } from "./offlineDb";

const encouragements = ["很好，继续按自己的节奏来。", "完成一个，慢慢来就很好。", "记住了，我们继续。", "做得很稳，再看下一个。"];

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function localDay(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("sv-SE");
}

function userId(user) { return user?.uid || user?.openid || user?.id || ""; }

function normalizeCloudWord(word, source) {
  return {
    ...word,
    cloud_id: word._id || word.cloud_id,
    source,
    enabled: word.enabled !== false,
    emoji: word.emoji || "字",
    image_url: word.image_url || "",
    audio_url: word.audio_url || "",
  };
}

function WordImage({ word, className }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [word?.id, word?.image_url]);
  if (failed || !word?.image_url) return <div className={`${className} image-fallback visible`} aria-label={word?.name}>{word?.emoji || "字"}</div>;
  return <img className={className} src={pictureUrl(word.image_url)} alt={word.name} onError={() => setFailed(true)} />;
}

function StatusIcon({ type, active = false }) {
  return <span aria-hidden="true">{type === "favorite" ? (active ? "★" : "☆") : "✓"}</span>;
}

export function Practice({ auth }) {
  const [allWords, setAllWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [homeView, setHomeView] = useState("home");
  const [mode, setMode] = useState(null);
  const [sourceKind, setSourceKind] = useState("all");
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [firstCorrect, setFirstCorrect] = useState(true);
  const [sessionDone, setSessionDone] = useState(0);
  const [notice, setNotice] = useState("");
  const [syncNote, setSyncNote] = useState("");
  const timerStart = useRef(0);
  const audioRef = useRef(null);

  const loadWords = useCallback(async () => setAllWords(await getWords()), []);

  useEffect(() => {
    (async () => {
      await loadWords();
      try {
        const publicWords = (await listPublicWords()).map((word) => normalizeCloudWord(word, "public"));
        if (publicWords.length) { await mergeWords(publicWords); await loadWords(); }
      } catch { setSyncNote("当前使用本地词库，联网后会自动获取新词。"); }
    })().finally(() => setLoading(false));
  }, [loadWords]);

  useEffect(() => {
    const uid = userId(auth.user);
    if (!uid) return;
    (async () => {
      try {
        const [personal, states] = await Promise.all([listUserWords(uid), listUserStates(uid)]);
        if (personal.length) await mergeWords(personal.map((word) => normalizeCloudWord(word, "user")));
        let local = await getWords();
        for (const state of states) {
          const word = local.find((item) => String(item.cloud_id || item.id) === String(state.word_id));
          if (word) await updateWord(word.id, { favorite: Boolean(state.favorite), mastered: Boolean(state.mastered) });
        }
        await loadWords();
        setSyncNote("账号数据已同步。");
      } catch { setSyncNote("暂时未能连接云端，本机数据会继续保留。"); }
    })();
  }, [auth.user, loadWords]);

  const activeWords = useMemo(() => allWords.filter((word) => word.enabled && !word.mastered), [allWords]);
  const favoriteWords = useMemo(() => allWords.filter((word) => word.enabled && word.favorite && !word.mastered), [allWords]);
  const masteredWords = useMemo(() => allWords.filter((word) => word.mastered), [allWords]);
  const today = new Date().toLocaleDateString("sv-SE");
  const todayWords = useMemo(() => allWords.filter((word) => word.source === "public" && localDay(word.created_at) === today && word.enabled && !word.mastered), [allWords, today]);
  const current = queue[index];

  const sourceWords = useCallback(() => {
    if (sourceKind === "favorite") return favoriteWords;
    if (sourceKind === "today") return todayWords;
    return activeWords;
  }, [sourceKind, favoriteWords, todayWords, activeWords]);

  const speak = useCallback((word) => {
    if (!word) return;
    window.speechSynthesis?.cancel(); audioRef.current?.pause();
    const markStart = () => { timerStart.current = performance.now(); };
    const fallback = () => { const utterance = new SpeechSynthesisUtterance(word.name); utterance.lang = "zh-CN"; utterance.rate = 0.76; utterance.onend = markStart; window.speechSynthesis?.speak(utterance); };
    if (word.audio_url) {
      const audio = new Audio(word.audio_url); audioRef.current = audio; audio.onended = markStart; audio.onerror = fallback; audio.play().catch(fallback);
    } else fallback();
  }, []);

  const makeChoices = useCallback((target, count) => {
    const pool = activeWords.filter((word) => word.id !== target.id);
    const same = shuffle(pool.filter((word) => word.category === target.category));
    const other = shuffle(pool.filter((word) => word.category !== target.category));
    return shuffle([target, ...[...same, ...other].slice(0, count - 1)]);
  }, [activeWords]);

  useEffect(() => {
    if (!current || mode === "learn" || !mode) return;
    setChoices(makeChoices(current, mode === "two" ? 2 : 3)); setFeedback(""); setSelectedId(null); setAttempts(0); setFirstCorrect(true);
  }, [current, mode, makeChoices]);

  useEffect(() => {
    if (!current || !mode || mode === "learn") return;
    const timeout = setTimeout(() => speak(current), 220);
    return () => clearTimeout(timeout);
  }, [current, mode, speak]);

  function freshQueue(source, previousId) {
    const favorites = shuffle(source.filter((word) => word.favorite));
    const others = shuffle(source.filter((word) => !word.favorite));
    const next = shuffle([...favorites, ...favorites.slice(0, Math.min(3, favorites.length)), ...others]);
    if (next.length > 1 && next[0]?.id === previousId) [next[0], next[1]] = [next[1], next[0]];
    return next;
  }

  function startMode(nextMode, kind = "all") {
    const source = kind === "today" ? todayWords : kind === "favorite" ? favoriteWords : activeWords;
    if (!source.length) return;
    setSourceKind(kind); setQueue(freshQueue(source)); setIndex(0); setMode(nextMode); setFeedback(""); setNotice("准备好了，按自己的节奏开始。");
  }

  function exitPractice() {
    window.speechSynthesis?.cancel(); audioRef.current?.pause(); setMode(null); setQueue([]); setHomeView("home"); setNotice("");
  }

  function next() {
    setSessionDone((count) => count + 1); setNotice(encouragements[sessionDone % encouragements.length]);
    if (index < queue.length - 1) setIndex((value) => value + 1);
    else { const nextQueue = freshQueue(sourceWords(), current?.id); setQueue(nextQueue); setIndex(0); }
    setFeedback("");
  }

  async function persistState(word, patch) {
    await updateWord(word.id, patch);
    setAllWords((items) => items.map((item) => item.id === word.id ? { ...item, ...patch } : item));
    setQueue((items) => items.map((item) => item.id === word.id ? { ...item, ...patch } : item));
    const uid = userId(auth.user);
    if (uid) saveWordState(String(word.cloud_id || word.id), { ...word, ...patch }, uid).catch(() => setSyncNote("已保存在本机，联网后再同步。"));
  }

  async function collectAndContinue(word) {
    await persistState(word, { favorite: true, mastered: false });
    setNotice("已经收藏，之后会多练几次。"); next();
  }

  async function setFavorite(word, favorite) {
    await persistState(word, { favorite, mastered: false }); setNotice(favorite ? "已经收藏，之后会多练几次。" : "已取消收藏。");
  }

  async function setMastered(word, mastered = true) {
    await persistState(word, { mastered, favorite: mastered ? false : word.favorite });
    if (mastered && mode) {
      const remaining = queue.filter((item) => item.id !== word.id);
      setSessionDone((count) => count + 1); setNotice("这个词已经掌握，继续保持。");
      if (remaining.length) { setQueue(remaining); setIndex((value) => Math.min(value, remaining.length - 1)); }
      else { const source = sourceWords().filter((item) => item.id !== word.id); if (source.length) { setQueue(freshQueue(source)); setIndex(0); } else exitPractice(); }
    } else setNotice("已恢复到日常练习。");
  }

  async function choose(word) {
    if (!current || feedback === "correct") return;
    const nextAttempts = attempts + 1; setAttempts(nextAttempts); setSelectedId(word.id);
    if (word.id !== current.id) { setFeedback("retry"); setFirstCorrect(false); setTimeout(() => speak(current), 180); return; }
    setFeedback("correct");
    const row = { word_id: current.cloud_id || current.id, mode, first_correct: firstCorrect, attempts: nextAttempts, response_ms: Math.max(0, Math.round(performance.now() - (timerStart.current || performance.now()))), practiced_at: new Date().toISOString() };
    await addAttempt(row);
    const uid = userId(auth.user); if (uid) saveAttempt(row, uid).catch(() => {});
  }

  if (loading) return <div className="loading"><div><div className="spinner" />正在准备词语……</div></div>;

  if (!mode) return <div className="app-shell">
    <header className="topbar"><button className="brand brand-button" onClick={() => setHomeView("home")}><span className="brand-mark">慢</span>慢慢来</button><div className="account-actions">{auth.user ? <><span className="account-name">{auth.user.email || "已登录"}</span><button className="quiet-button" onClick={auth.logout}>退出</button></> : <button className="login-button" onClick={auth.openLogin}>邮箱登录</button>}<a className="quiet-link" href="?admin=1">添加词汇</a></div></header>
    <main className="main">
      <nav className="status-tabs" aria-label="词语状态"><button className={homeView === "home" ? "active" : ""} onClick={() => setHomeView("home")}>今日学习</button><button className={homeView === "favorite" ? "active" : ""} onClick={() => setHomeView("favorite")}><StatusIcon type="favorite" active />收藏再练 <span>{favoriteWords.length}</span></button><button className={homeView === "mastered" ? "active" : ""} onClick={() => setHomeView("mastered")}><StatusIcon type="mastered" />已熟练 <span>{masteredWords.length}</span></button></nav>
      {syncNote && <div className="sync-note" role="status">{syncNote}</div>}
      {homeView === "home" && <>
        <section className="home-hero"><div><div className="eyebrow">言语训练 · 断网也能使用</div><h1>一词一卡，<br />慢慢记，反复练。</h1><p className="hero-copy">没有倒计时，也没有每轮数量限制。读不熟就收藏再练，已经掌握就移入熟练。</p></div><div className="today-note"><span>本次已完成</span><strong>{sessionDone} 个</strong><span>练习中 {activeWords.length} 个 · 收藏 {favoriteWords.length} 个</span></div></section>
        {todayWords.length > 0 && <section className="new-words-banner"><div><span className="new-badge">今日新增</span><h2>{todayWords.length} 个新词可以练习</h2><p>{todayWords.slice(0, 5).map((word) => word.name).join("、")}{todayWords.length > 5 ? "……" : ""}</p></div><button className="primary-button" onClick={() => startMode("learn", "today")}>开始练习今日新增</button></section>}
        <section className="mode-grid" aria-label="选择练习方式"><button className="mode-card" onClick={() => startMode("learn")}><span className="mode-icon">字</span><span className="mode-title">学习卡</span><span className="mode-desc">看图片、听发音，按自己的速度一直练习。</span></button><button className="mode-card" onClick={() => startMode("two")}><span className="mode-icon">②</span><span className="mode-title">二选一</span><span className="mode-desc">听一个词，从两张图片中选择。</span></button><button className="mode-card" onClick={() => startMode("three")}><span className="mode-icon">③</span><span className="mode-title">三选一</span><span className="mode-desc">熟悉以后，从三张图片中选择。</span></button></section>
      </>}
      {homeView === "favorite" && <WordCollection title="收藏再练" description="读不熟的词都在这里，可以单独反复练习。" words={favoriteWords} empty="还没有收藏词。练习时点“收藏再练”就会加入这里。" actionLabel="取消收藏" onAction={(word) => setFavorite(word, false)} onPractice={() => startMode("learn", "favorite")} />}
      {homeView === "mastered" && <WordCollection title="已熟练" description="这些词不会再出现在日常练习中，可以随时恢复。" words={masteredWords} empty="还没有移入熟练的词。" actionLabel="恢复练习" onAction={(word) => setMastered(word, false)} />}
    </main><footer className="attribution">口型图用于辅助观察发音位置；词语训练不能替代专业诊疗。</footer>
  </div>;

  return <div className="app-shell"><header className="topbar"><div className="brand"><span className="brand-mark">慢</span>慢慢来</div></header><main className="main practice">
    <div className="practice-head"><button className="small-button" onClick={exitPractice}>返回首页</button><div className="progress-wrap"><div className="progress-label">本次已完成 {sessionDone} 个 · 可一直练习</div></div><span className="head-spacer" /></div>
    {mode === "learn" ? <><div className="instruction"><h2>{sourceKind === "today" ? "练习今日新增" : "看图听词"}</h2><p>点击图片可以反复听，不着急。</p></div><div className="learn-stage"><button className={`word-focus ${current?.category === "拼音字母" ? "pinyin-card" : ""}`} onClick={() => speak(current)}><WordImage word={current} className="word-photo" /><div className="word-label"><span>{current?.name}</span><span className="word-category">{current?.category}</span><span aria-hidden="true">🔊</span></div></button></div><div className="learning-status-actions"><button className={`status-action favorite ${current?.favorite ? "active" : ""}`} onClick={() => collectAndContinue(current)}><StatusIcon type="favorite" active={current?.favorite} />收藏再练</button><button className="status-action mastered" onClick={() => setMastered(current, true)}><StatusIcon type="mastered" />已经熟练</button></div>{notice && <div className="practice-notice" role="status">{notice}</div>}<div className="practice-actions single"><button className="primary-button" onClick={next}>下一个</button></div></> : <><div className="instruction"><h2>听词语，选图片</h2><p>可以重复听，选错了也没关系。</p></div><button className="listen-button" onClick={() => speak(current)}>🔊 播报</button><div className={`choices ${mode}`}>{choices.map((choice) => <button key={choice.id} className={`choice-card ${selectedId === choice.id && feedback === "retry" ? "try-again" : ""} ${feedback === "correct" && choice.id === current.id ? "correct" : ""}`} onClick={() => choose(choice)}><WordImage word={choice} className="choice-image" /><span className="choice-label">{choice.name}</span></button>)}</div><div className={`feedback ${feedback === "retry" ? "retry" : ""}`}>{feedback === "retry" ? "没关系，再听一次，慢慢找。" : feedback === "correct" ? encouragements[sessionDone % encouragements.length] : ""}</div><div className="practice-actions"><button className="secondary-button" onClick={exitPractice}>返回首页</button><button className="primary-button" onClick={next} disabled={feedback !== "correct"}>继续下一个</button></div></>}
  </main></div>;
}

function WordCollection({ title, description, words, empty, actionLabel, onAction, onPractice }) {
  return <section className="collection-section"><div className="collection-heading"><div><div className="eyebrow">词语状态</div><h1>{title}</h1><p>{description}</p></div>{onPractice && words.length > 0 && <button className="primary-button" onClick={onPractice}>开始练习</button>}</div>{words.length ? <div className="collection-grid">{words.map((word) => <article className="collection-card" key={word.id}><WordImage word={word} className="collection-image" /><div className="collection-copy"><strong>{word.name}</strong><span>{word.category}</span></div><button className="collection-action" onClick={() => onAction(word)}>{actionLabel}</button></article>)}</div> : <div className="collection-empty">{empty}</div>}</section>;
}
