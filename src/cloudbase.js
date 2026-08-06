import cloudbase from "@cloudbase/js-sdk";

const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV || "manmanlai-family-d5ew2wj5f1257a4";
let app;

export function getCloudApp() {
  if (!app) app = cloudbase.init({ env: ENV_ID, region: "ap-shanghai", persistence: "local" });
  return app;
}

export function cloudConfigured() {
  return Boolean(ENV_ID);
}

export async function getCloudLogin() {
  try { return await getCloudApp().auth().getLoginState(); } catch { return null; }
}

export async function sendEmailCode(email) {
  const result = await getCloudApp().auth().signInWithOtp({ email: email.trim().toLowerCase() });
  if (result?.error) throw new Error(result.error.message || "验证码发送失败");
  return result?.data;
}

export async function verifyEmailCode(verifier, token) {
  if (!verifier?.verifyOtp) throw new Error("请重新发送验证码");
  const result = await verifier.verifyOtp({ token: token.trim() });
  if (result?.error) throw new Error(result.error.message || "验证码不正确");
  return result?.data || result;
}

export async function cloudSignOut() { try { await getCloudApp().auth().signOut(); } catch {} }

function rowsFrom(result) {
  return result?.data?.records || result?.data || result?.records || [];
}

export async function listPublicWords() {
  const collection = getCloudApp().database().collection("public_words");
  const result = await collection.where({ enabled: true }).limit(500).get();
  return rowsFrom(result);
}

export async function listUserStates(uid) {
  const result = await getCloudApp().database().collection("user_word_states").where({ owner_id: uid }).limit(1000).get();
  return rowsFrom(result);
}

export async function listUserWords(uid) {
  const collection = getCloudApp().database().collection("user_words");
  const result = await collection.where({ owner_id: uid }).limit(500).get();
  return rowsFrom(result);
}

export async function saveUserWord(word, uid) {
  const payload = { ...word, owner_id: uid, source: "user", updated_at: new Date().toISOString() };
  delete payload.id;
  return getCloudApp().database().collection("user_words").add(payload);
}

export async function saveWordState(wordId, state, uid) {
  const collection = getCloudApp().database().collection("user_word_states");
  const result = await collection.where({ owner_id: uid, word_id: wordId }).limit(1).get();
  const rows = rowsFrom(result);
  const payload = { owner_id: uid, word_id: wordId, favorite: Boolean(state.favorite), mastered: Boolean(state.mastered), updated_at: new Date().toISOString() };
  if (rows[0]?._id) return collection.doc(rows[0]._id).update(payload);
  return collection.add(payload);
}

export async function saveAttempt(attempt, uid) {
  return getCloudApp().database().collection("user_attempts").add({ ...attempt, owner_id: uid, practiced_at: attempt.practiced_at || new Date().toISOString() });
}
