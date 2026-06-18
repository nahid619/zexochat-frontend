import { useState } from 'react';
import { Lock } from 'lucide-react';
import useChatStore from '../store/chatStore';
import { ANONYMOUS_MODEL_ID } from '../constants';

// Used only if /api/models hasn't responded yet — kept in sync with the
// backend's verified-free model chain (see aiRouter.js / routes/models.js).
const FALLBACK_MODELS = [
  { id: 'gemini-3.5-flash', provider: 'google', name: 'Gemini 3.5 Flash', score: 8.6, rpdFree: 250 },
  { id: 'gemini-3-flash-preview', provider: 'google', name: 'Gemini 3 Flash Preview', score: 8.3, rpdFree: 250 },
  { id: 'gemini-2.5-flash', provider: 'google', name: 'Gemini 2.5 Flash', score: 8.0, rpdFree: 250 },
  { id: 'gemini-3.1-flash-lite', provider: 'google', name: 'Gemini 3.1 Flash-Lite', score: 7.7, rpdFree: 1000 },
  { id: 'gemini-2.5-flash-lite', provider: 'google', name: 'Gemini 2.5 Flash-Lite', score: 7.4, rpdFree: 1000 },
  { id: 'gemini-2.5-pro', provider: 'google', name: 'Gemini 2.5 Pro', score: 8.9, rpdFree: 50 },
  { id: 'openai/gpt-oss-120b', provider: 'groq', name: 'GPT-OSS 120B (Groq)', score: 7.5, rpdFree: 1000 },
  { id: 'llama-3.3-70b-versatile', provider: 'groq', name: 'Llama 3.3 70B', score: 7.2, rpdFree: 1000 },
  { id: 'llama-4-scout', provider: 'groq', name: 'Llama 4 Scout', score: 7.2, rpdFree: 1000 },
  { id: 'command-r-plus', provider: 'cohere', name: 'Command R+', score: 6.9, rpdFree: 1000 },
  { id: 'meta-llama/Llama-3.1-70B-Instruct', provider: 'huggingface', name: 'Llama 3.1 70B (HF)', score: 6.7, rpdFree: 500 },
  { id: 'llama-3.1-8b-instant', provider: 'groq', name: 'Llama 3.1 8B (fast)', score: 6.3, rpdFree: 1000 },
  { id: 'mistral-small-latest', provider: 'mistral', name: 'Mistral Small', score: 5.5, rpdFree: 200 }
];

const PROVIDER_LABEL = {
  google: 'Google',
  groq: 'Groq',
  cohere: 'Cohere',
  mistral: 'Mistral',
  huggingface: 'HuggingFace'
};

function ModelPicker() {
  const { selectedModel, setSelectedModel, models: storeModels, modelsLoaded, user } = useChatStore();
  const [isOpen, setIsOpen] = useState(false);

  const models = modelsLoaded && storeModels.length > 0 ? storeModels : FALLBACK_MODELS;
  const activeModel = models.find((m) => m.id === selectedModel) || models[0];

  // Anonymous tier is locked to exactly one model, enforced server-side
  // (see backend routes/chat.js) — the picker reflects that here instead
  // of offering choices that would just get silently overridden on send.
  if (!user) {
    const lockedModel = models.find((m) => m.id === ANONYMOUS_MODEL_ID);
    return (
      <div className="mp-wrap">
        <button className="mp-btn locked" disabled title="Log in with an access code to unlock every model">
          <Lock size={11} />
          <span>{lockedModel?.name || 'GPT-OSS 120B'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mp-wrap" id="mpWrap">
      <button className="mp-btn" id="mpBtn" onClick={() => setIsOpen((v) => !v)}>
        <span className="mp-dot"></span>
        <span id="mpLabel">{activeModel?.name || selectedModel}</span>
        <span className="mp-arr" style={{ transform: isOpen ? 'rotate(180deg)' : '' }}>▾</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0" style={{ zIndex: 9998 }} onClick={() => setIsOpen(false)}></div>

          <div className="mp-drop open" id="mpDrop">
            <div className="mp-hdr">
              Select Model
              <span className="mp-as-badge">Auto-switch ON</span>
            </div>

            {models.map((model) => {
              const isSelected = model.id === selectedModel;
              return (
                <div
                  key={model.id}
                  className={`mopt ${isSelected ? 'sel' : ''}`}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="mopt-d" style={{ background: 'var(--ok)' }}></div>
                  <div className="mopt-info">
                    <div className="mopt-name">{model.name}{isSelected ? ' ✓' : ''}</div>
                    <div className="mopt-sub">{PROVIDER_LABEL[model.provider] || model.provider} · Available</div>
                  </div>
                  <div className="mopt-badge">{(model.rpdFree || 0).toLocaleString()} / day</div>
                </div>
              );
            })}

            <div className="mp-foot">
              <span className="mp-foot-txt">Fallback chain</span>
              <span className="mp-foot-quota">{models.length} free-tier models</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ModelPicker;