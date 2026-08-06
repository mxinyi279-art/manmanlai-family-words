const DB_NAME = "manmanlai-learning-v2";
const DB_VERSION = 3;

const seeds = [
  ["牙膏", "洗漱如厕", "toothpaste", "🧴"], ["牙刷", "洗漱如厕", "toothbrush", "🪥"],
  ["牙齿", "洗漱如厕", "tooth-soft", "🦷"], ["刷牙", "洗漱如厕", "brush-teeth-soft", "🪥"],
  ["毛巾", "洗漱如厕", "towel", "▤"], ["香皂", "洗漱如厕", "soap", "🧼"],
  ["洗发水", "洗漱如厕", "shampoo", "🧴"], ["梳子", "洗漱如厕", "comb", "▥"],
  ["镜子", "洗漱如厕", "mirror", "🪞"], ["洗脸", "洗漱如厕", "wash_face", "🙂"],
  ["洗手", "洗漱如厕", "wash_hands", "👐"], ["马桶", "洗漱如厕", "toilet", "🚽"],
  ["水杯", "餐饮餐具", "cup", "🥛"], ["勺子", "餐饮餐具", "spoon", "🥄"],
  ["碗", "餐饮餐具", "bowl", "🥣"], ["筷子", "餐饮餐具", "chopsticks", "🥢"],
  ["盘子", "餐饮餐具", "plate", "◯"], ["水壶", "餐饮餐具", "kettle", "🫖"],
  ["水", "食物饮品", "water", "💧"], ["茶", "食物饮品", "tea", "🍵"],
  ["牛奶", "食物饮品", "milk", "🥛"], ["米饭", "食物饮品", "rice", "🍚"],
  ["面包", "食物饮品", "bread", "🍞"], ["苹果", "食物饮品", "apple", "🍎"],
  ["香蕉", "食物饮品", "banana", "🍌"], ["鸡蛋", "食物饮品", "egg", "🥚"],
  ["鱼", "食物饮品", "fish", "🐟"], ["蔬菜", "食物饮品", "vegetables", "🥬"],
  ["床", "家居物品", "bed", "🛏️"], ["枕头", "家居物品", "pillow", "▭"],
  ["被子", "家居物品", "blanket", "▰"], ["椅子", "家居物品", "chair", "🪑"],
  ["桌子", "家居物品", "table", "▱"], ["沙发", "家居物品", "sofa", "🛋️"],
  ["台灯", "家居物品", "lamp", "💡"], ["门", "家居物品", "door", "🚪"],
  ["钥匙", "家居物品", "key", "🔑"], ["电话", "家居物品", "telephone", "☎️"],
  ["电视", "家居物品", "television", "📺"], ["遥控器", "家居物品", "remote_control", "▥"],
  ["钟表", "家居物品", "clock", "🕰️"], ["电风扇", "家居物品", "fan", "◉"],
  ["空调", "家居物品", "air_conditioning", "▭"], ["垃圾", "清洁用品", "garbage", "🗑️"],
  ["垃圾桶", "清洁用品", "trash_can", "🗑️"], ["抽纸", "清洁用品", "tissue_box", "▧"],
  ["纸巾", "清洁用品", "tissue", "□"], ["卫生纸", "清洁用品", "toilet_paper", "🧻"],
  ["扫帚", "清洁用品", "broom", "🧹"], ["拖把", "清洁用品", "mop", "▥"],
  ["洗衣液", "清洁用品", "detergent", "🧴"], ["爸爸", "人物", "father", "👨"],
  ["妈妈", "人物", "mother", "👩"], ["阿姨", "人物", "aunt", "👩"],
  ["医生", "人物", "doctor", "🧑‍⚕️"], ["护士", "人物", "nurse", "🧑‍⚕️"],
  ["儿子", "人物", "son", "👦"], ["女儿", "人物", "daughter", "👧"],
  ["头", "身体部位", "head", "🙂"], ["手", "身体部位", "hand", "✋"],
  ["脚", "身体部位", "foot", "🦶"], ["眼睛", "身体部位", "eye", "👁️"],
  ["耳朵", "身体部位", "ear", "👂"], ["嘴巴", "身体部位", "mouth", "👄"],
  ["鼻子", "身体部位", "nose", "👃"], ["胳膊", "身体部位", "arm", "💪"],
  ["腿", "身体部位", "leg", "🦵"], ["吃", "常用动作", "eat", "🍽️"],
  ["喝", "常用动作", "drink", "🥤"], ["坐", "常用动作", "sit", "🪑"],
  ["站", "常用动作", "stand", "│"], ["睡觉", "常用动作", "sleep", "😴"],
  ["走路", "常用动作", "walk", "🚶"], ["打开", "常用动作", "open-door", "↗"],
  ["关闭", "常用动作", "close-door", "↙"], ["拿", "常用动作", "take", "✋"],
  ["给", "常用动作", "give", "🤲"], ["药", "其他物品", "medicine", "💊"],
  ["眼镜", "其他物品", "glasses", "👓"], ["钱包", "其他物品", "wallet", "👛"],
  ["木头", "其他物品", "wood", "🪵"], ["塑料", "其他物品", "plastic", "♻️"],
  ["金属", "其他物品", "metal", "⚙️"], ["1", "数字", "", "1"],
  ["2", "数字", "", "2"], ["3", "数字", "", "3"], ["4", "数字", "", "4"],
  ["5", "数字", "", "5"],
  ["弹钢琴", "兴趣活动", "play_piano", "🎹"], ["吹笛子", "兴趣活动", "play_flute", "🎶"],
  ["帐篷", "出行用品", "tent", "⛺"], ["行李箱", "出行用品", "suitcase", "🧳"],
  ["手提袋", "出行用品", "tote_bag", "👜"], ["绳子", "其他物品", "rope", "➰"],
  ["背包", "出行用品", "backpack", "🎒"], ["盖被子", "常用动作", "cover_with_blanket", "🛏️"],
  ["话筒", "其他物品", "microphone_handheld", "🎤"], ["麦克风", "其他物品", "microphone_studio", "🎙️"],
  ["锁", "其他物品", "lock", "🔒"], ["银行卡", "随身物品", "bank_card", "💳"],
  ["伞", "出行用品", "umbrella", "☂️"], ["手机", "随身物品", "mobile_phone", "📱"],
  ["刷子", "清洁用品", "scrub_brush", "🧹"], ["烟", "其他物品", "cigarette", "🚬"],
  ["盒子", "家居物品", "box", "📦"], ["鱼缸", "家居物品", "fish_tank", "🐠"],
  ["洗漱台", "洗漱如厕", "washbasin", "🚰"], ["浴室", "洗漱如厕", "bathroom", "🚿"],
];

const pinyinSeeds = [
  ["a", "拼音字母", "pinyin_a", "a"], ["o", "拼音字母", "pinyin_o", "o"], ["e", "拼音字母", "pinyin_e", "e"],
  ["i", "拼音字母", "pinyin_i", "i"], ["u", "拼音字母", "pinyin_u", "u"], ["ü", "拼音字母", "pinyin_ü", "ü"],
  ["b", "拼音字母", "pinyin_a", "b"], ["p", "拼音字母", "pinyin_a", "p"], ["m", "拼音字母", "pinyin_a", "m"], ["f", "拼音字母", "pinyin_a", "f"],
  ["d", "拼音字母", "pinyin_a", "d"], ["t", "拼音字母", "pinyin_a", "t"], ["n", "拼音字母", "pinyin_a", "n"], ["l", "拼音字母", "pinyin_a", "l"],
  ["g", "拼音字母", "pinyin_o", "g"], ["k", "拼音字母", "pinyin_o", "k"], ["h", "拼音字母", "pinyin_o", "h"],
  ["j", "拼音字母", "pinyin_ü", "j"], ["q", "拼音字母", "pinyin_ü", "q"], ["x", "拼音字母", "pinyin_ü", "x"],
  ["z", "拼音字母", "pinyin_i", "z"], ["c", "拼音字母", "pinyin_i", "c"], ["s", "拼音字母", "pinyin_i", "s"],
  ["y", "拼音字母", "pinyin_y", "y"], ["w", "拼音字母", "pinyin_w", "w"], ["r", "拼音字母", "pinyin_i", "r"],
];

export const defaultWords = [...seeds, ...pinyinSeeds].map(([name, category, image, emoji], index) => ({
  id: index + 1,
  name,
  category,
  image_url: image ? `pictograms/${image}.png` : "",
  audio_url: "",
  emoji,
  enabled: true,
  favorite: false,
  mastered: false,
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
}));

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error("本地保存已取消"));
  });
}

export function openOfflineDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (event.oldVersion === 0) {
        const words = db.createObjectStore("words", { keyPath: "id" });
        words.createIndex("category", "category");
        const attempts = db.createObjectStore("attempts", { keyPath: "id", autoIncrement: true });
        attempts.createIndex("practiced_at", "practiced_at");
        defaultWords.forEach((word) => words.put(word));
        return;
      }

      const words = request.transaction.objectStore("words");
      const allWordsRequest = words.getAll();
      allWordsRequest.onsuccess = () => {
        const existingNames = new Set(allWordsRequest.result.map((word) => word.name));
        let nextId = Math.max(0, ...allWordsRequest.result.map((word) => Number(word.id) || 0)) + 1;
        defaultWords.forEach((word) => {
          if (!existingNames.has(word.name)) words.put({ ...word, id: nextId++ });
        });
      };
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getWords(enabledOnly = false) {
  const db = await openOfflineDb();
  const transaction = db.transaction("words", "readonly");
  const rows = await requestResult(transaction.objectStore("words").getAll());
  return rows
    .map((word) => ({ favorite: false, mastered: false, ...word }))
    .filter((word) => !enabledOnly || (word.enabled && !word.mastered))
    .sort((a, b) => a.category.localeCompare(b.category, "zh-CN") || a.id - b.id);
}

export async function addWord(word) {
  const rows = await getWords();
  const db = await openOfflineDb();
  const transaction = db.transaction("words", "readwrite");
  const now = new Date().toISOString();
  transaction.objectStore("words").put({
    id: Math.max(0, ...rows.map((item) => Number(item.id) || 0)) + 1,
    emoji: "◉",
    enabled: true,
    image_url: "",
    audio_url: "",
    created_at: now,
    updated_at: now,
    ...word,
  });
  await transactionDone(transaction);
}

export async function updateWord(id, patch) {
  const db = await openOfflineDb();
  const transaction = db.transaction("words", "readwrite");
  const store = transaction.objectStore("words");
  const current = await requestResult(store.get(id));
  if (!current) throw new Error("没有找到这个词语");
  store.put({ ...current, ...patch, id, updated_at: new Date().toISOString() });
  await transactionDone(transaction);
}

export async function mergeWords(words) {
  if (!Array.isArray(words) || !words.length) return;
  const db = await openOfflineDb();
  const transaction = db.transaction("words", "readwrite");
  const store = transaction.objectStore("words");
  const current = await requestResult(store.getAll());
  const byName = new Map(current.map((word) => [word.name, word]));
  let nextId = Math.max(0, ...current.map((word) => Number(word.id) || 0)) + 1;
  for (const incoming of words) {
    const existing = byName.get(incoming.name);
    store.put({ favorite: false, mastered: false, enabled: true, ...incoming, id: existing?.id || nextId++ });
  }
  await transactionDone(transaction);
}

export async function addAttempt(attempt) {
  const db = await openOfflineDb();
  const transaction = db.transaction("attempts", "readwrite");
  transaction.objectStore("attempts").add({ ...attempt, practiced_at: new Date().toISOString() });
  await transactionDone(transaction);
}

export async function getAttempts(limit = 3000) {
  const db = await openOfflineDb();
  const transaction = db.transaction("attempts", "readonly");
  const rows = await requestResult(transaction.objectStore("attempts").getAll());
  return rows.sort((a, b) => String(b.practiced_at).localeCompare(String(a.practiced_at))).slice(0, limit);
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

export function pictureUrl(value) {
  if (!value) return "";
  if (/^(data:|blob:|https?:)/.test(value)) return value;
  return new URL(value.replace(/^\//, ""), document.baseURI).href;
}

export async function exportOfflineData() {
  return { version: 1, exported_at: new Date().toISOString(), words: await getWords(), attempts: await getAttempts(Number.MAX_SAFE_INTEGER) };
}

export async function importOfflineData(data) {
  if (!data || data.version !== 1 || !Array.isArray(data.words) || !Array.isArray(data.attempts)) throw new Error("这不是有效的练习备份文件");
  const db = await openOfflineDb();
  const transaction = db.transaction(["words", "attempts"], "readwrite");
  const wordStore = transaction.objectStore("words");
  const attemptStore = transaction.objectStore("attempts");
  wordStore.clear();
  attemptStore.clear();
  data.words.forEach((word) => wordStore.put(word));
  data.attempts.forEach((attempt) => attemptStore.put(attempt));
  await transactionDone(transaction);
}
