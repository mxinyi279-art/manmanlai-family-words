import { useCallback, useEffect, useRef, useState } from "react";
import { pictureUrl, supabase } from "./supabase";

const ROUND_SIZE = 8;

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function WordImage({ word, className }) {
  const [failed, setFailed] = useState(false);
  if (failed || !word.image_url) return <div className={`${className} image-fallback`} aria-label={word.name}>{word.emoji}</div>;
  return <img className={className} src={pictureUrl(word.image_url)} alt={word.name} onError={() => setFailed(true)} />;
}

export function Practice() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState(null);
  const [round, setRound] = useState([]);
  const [index, setIndex] = useState(0);
  const [choices, setChoices] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [firstCorrect, setFirstCorrect] = useState(true);
  const [finished, setFinished] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);
  const timerStart = useRef(0);
  const audioRef = useRef(null);

  const loadWords = useCallback(async () => {
    const { data, error: loadError } = await supabase.from("words").select("*").eq("enabled", true).order("category").order("id");
    if (loadError) throw loadError;
    setWords(data || []);
  }, []);

  useEffect(() => {
    loadWords().catch(() => setError("词库暂时没有加载成功，请检查网络后再试。")).finally(() => setLoading(false));
  }, [loadWords]);

  const current = round[index];

  const speak = useCallback((word) => {
    if (!word) return;
    speechSynthesis?.cancel();
    audioRef.current?.pause();
    const markStart = () => { timerStart.current = performance.now(); };
    if (word.audio_url) {
      const audio = new Audio(word.audio_url);
      audioRef.current = audio;
      audio.onended = markStart;
      audio.onerror = () => {
        const utterance = new SpeechSynthesisUtterance(word.name);
        utterance.lang = "zh-CN";
        utterance.rate = 0.78;
        utterance.onend = markStart;
        speechSynthesis.speak(utterance);
      };
      audio.play().catch(() => audio.onerror?.());
      return;
    }
    const utterance = new SpeechSynthesisUtterance(word.name);
    utterance.lang = "zh-CN";
    utterance.rate = 0.78;
    utterance.onend = markStart;
    speechSynthesis.speak(utterance);
  }, []);

  const makeChoices = useCallback((target, count) => {
    const same = words.filter((word) => word.id !== target.id && word.category === target.category);
    const other = words.filter((word) => word.id !== target.id && word.category !== target.category);
    const distractors = [...shuffle(same), ...shuffle(other)].slice(0, count - 1);
    return shuffle([target, ...distractors]);
  }, [words]);

  useEffect(() => {
    if (!current || mode === "learn" || !mode) return;
    setChoices(makeChoices(current, mode === "two" ? 2 : 3));
    setFeedback("");
    setSelectedId(null);
    setAttempts(0);
    setFirstCorrect(true);
  }, [current, mode, makeChoices]);

  useEffect(() => {
    if (!current || !mode || mode === "learn" || finished) return;
    const timeout = setTimeout(() => speak(current), 220);
    return () => clearTimeout(timeout);
  }, [current, mode, finished, speak]);

  function startMode(nextMode) {
    setRound(shuffle(words).slice(0, Math.min(ROUND_SIZE, words.length)));
    setIndex(0);
    setMode(nextMode);
    setFinished(false);
    setFeedback("");
  }

  function exitPractice() {
    speechSynthesis?.cancel();
    audioRef.current?.pause();
    setMode(null);
    setFinished(false);
  }

  function next() {
    if (index >= round.length - 1) {
      setFinished(true);
      setSessionDone((count) => count + round.length);
      return;
    }
    setIndex((value) => value + 1);
  }

  async function choose(word) {
    if (!current || feedback === "correct") return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setSelectedId(word.id);
    if (word.id !== current.id) {
      setFeedback("retry");
      setFirstCorrect(false);
      setTimeout(() => speak(current), 180);
      return;
    }
    setFeedback("correct");
    const responseMs = Math.max(0, Math.round(performance.now() - (timerStart.current || performance.now())));
    await supabase.from("attempts").insert({
      word_id: current.id,
      mode,
      first_correct: firstCorrect,
      attempts: nextAttempts,
      response_ms: responseMs,
    });
  }

  if (loading) return <div className="loading">正在准备词语……</div>;
  if (error) return <div className="empty-state"><div><p>{error}</p><button className="secondary-button" onClick={() => location.reload()}>重新加载</button></div></div>;
  if (!words.length) return <div className="empty-state">词库正在准备中，请稍后再试。</div>;

  if (!mode) return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">慢</span>慢慢来</div><a className="quiet-link" href="?admin=1">家属管理</a></header>
    <main className="main">
      <section className="home-hero"><div><div className="eyebrow">家庭词语练习</div><h1>听一听，认一认，<br />按自己的节奏来。</h1><p className="hero-copy">没有倒计时，也不用着急。每次只练八个熟悉的日常词语，想听几遍都可以。</p></div><div className="today-note"><span>本次打开后已完成</span><strong>{sessionDone} 个</strong><span>累了就休息，少量多次也很好。</span></div></section>
      <section className="mode-grid" aria-label="选择练习方式">
        <button className="mode-card" onClick={() => startMode("learn")}><span className="mode-icon">◉</span><span className="mode-title">认识词语</span><span className="mode-desc">看一张大图，点击图片听发音。</span></button>
        <button className="mode-card" onClick={() => startMode("two")}><span className="mode-icon">②</span><span className="mode-title">二选一</span><span className="mode-desc">自动听一个词，从两张图片中选择。</span></button>
        <button className="mode-card" onClick={() => startMode("three")}><span className="mode-icon">③</span><span className="mode-title">三选一</span><span className="mode-desc">熟悉以后，从三张图片中选择。</span></button>
      </section>
    </main>
    <footer className="attribution">通用图形符号：Sergio Palao / <a href="https://arasaac.org">ARASAAC</a>，CC BY-NC-SA 4.0。建议逐步替换为本人熟悉物品的照片。</footer>
  </div>;

  if (finished) return <div className="app-shell"><header className="topbar"><div className="brand"><span className="brand-mark">慢</span>慢慢来</div></header><main className="main complete"><div className="complete-card"><div className="complete-symbol">✓</div><h2>今天练得很好</h2><p>这一轮已经完成了。可以休息一下，也可以按自己的节奏再练一轮。</p><div className="complete-actions"><button className="secondary-button" onClick={exitPractice}>回到首页</button><button className="primary-button" onClick={() => startMode(mode)}>再练一轮</button></div></div></main></div>;

  return <div className="app-shell"><header className="topbar"><div className="brand"><span className="brand-mark">慢</span>慢慢来</div></header><main className="main practice">
    <div className="practice-head">
      <button className="small-button" onClick={exitPractice}>退出练习</button>
      <div className="progress-wrap">
        <div className="progress-label">第 {index + 1} 个，共 {round.length} 个</div>
        <div className="progress-track"><div className="progress-fill" style={{ width: `${((index + 1) / round.length) * 100}%` }} /></div>
      </div>
      <span className="head-spacer" />
    </div>
    {mode === "learn" ? <><div className="instruction"><h2>看一看，听一听</h2><p>点击图片或词语，可以再听一遍。</p></div><div className="learn-stage"><button className="word-focus" onClick={() => speak(current)}><WordImage word={current} className="word-photo" /><div className="word-label"><span>{current.name}</span><span className="word-category">{current.category}</span><span>🔊</span></div></button></div><div className="practice-actions"><button className="secondary-button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0}>上一个</button><button className="primary-button" onClick={next}>{index === round.length - 1 ? "完成练习" : "下一个"}</button></div></> : <><div className="instruction"><h2>听词语，选图片</h2><p>新题会自动播报，不着急，可以重复听。</p></div><button className="listen-button" onClick={() => speak(current)}>🔊 播报</button><div className={`choices ${mode}`}>{choices.map((choice) => <button key={choice.id} className={`choice-card ${selectedId === choice.id && feedback === "retry" ? "try-again" : ""} ${feedback === "correct" && choice.id === current.id ? "correct" : ""}`} onClick={() => choose(choice)}><WordImage word={choice} className="choice-image" /><span className="choice-label">{choice.name}</span></button>)}</div><div className={`feedback ${feedback === "retry" ? "retry" : ""}`}>{feedback === "retry" ? "没关系，再播报一次" : feedback === "correct" ? "很好，就是它" : ""}</div><div className="practice-actions"><button className="secondary-button" onClick={exitPractice}>先休息</button><button className="primary-button" onClick={next} disabled={feedback !== "correct"}>{index === round.length - 1 ? "完成练习" : "下一个"}</button></div></>}
  </main></div>;
}
