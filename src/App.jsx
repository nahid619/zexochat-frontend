import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import useChatStore from './store/chatStore';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import AdminPanel from './components/AdminPanel';

function ChatApp() {
  return (
    <>
      <Sidebar />
      <ChatWindow />
    </>
  );
}

function App() {
  const { restoreSession, fetchConversations, fetchModels, theme, user, authReady } = useChatStore();

  // On boot: check for a saved session token first, since conversation
  // history is now scoped per-user — fetching it before we know who's
  // logged in (or that nobody is) would race against restoreSession.
  useEffect(() => {
    (async () => {
      await restoreSession();
      await fetchConversations();
      fetchModels();
    })();
  }, [restoreSession, fetchConversations, fetchModels]);

  // Apply the selected theme to the <html> element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <Routes>
      {/* AdminPanel shows its own login form if user isn't an admin — no
          redirect needed since unauthenticated visitors still land on a
          real page rather than being bounced. */}
      <Route path="/admin" element={<AdminPanel />} />
      <Route path="*" element={<ChatApp />} />
    </Routes>
  );
}

export default App;