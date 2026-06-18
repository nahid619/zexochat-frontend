// Shown in the sidebar/header before anyone logs in. Once a real user logs
// in with an access code, their actual name (from the backend) replaces
// this — see the `user` field in store/chatStore.js.
export const GUEST_NAME = 'Guest';

// Anonymous (unidentified) callers are locked to exactly this model —
// must match ANONYMOUS_MODEL in the backend's src/routes/chat.js. Kept
// here so both the store (to set the right default) and ModelPicker (to
// show the locked option) read the same value.
export const ANONYMOUS_MODEL_ID = 'openai/gpt-oss-120b';

// localStorage keys for the persisted session.
export const TOKEN_STORAGE_KEY = 'zexochat_token';