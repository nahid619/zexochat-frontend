import { create } from 'zustand';
import client from '../api/client';

// Admin user-management state — kept separate from chatStore since this is
// a distinct concern (only ever touched on the /admin route).
const useAdminStore = create((set) => ({
  users: [],
  loading: false,
  error: null,

  // The plaintext access code is only ever returned by the backend once,
  // right at creation/regeneration time (see access plan §4 — only the
  // bcrypt hash is stored after that). This holds that one-time reveal
  // until the admin dismisses it.
  revealedCode: null, // { userId, name, code } | null

  fetchUsers: async () => {
    set({ loading: true, error: null });
    try {
      const res = await client.get('/api/admin/users');
      set({ users: res.data, loading: false });
    } catch (err) {
      set({ loading: false, error: err.response?.data?.error || 'Failed to load users.' });
    }
  },

  createUser: async (name, username) => {
    set({ error: null });
    try {
      const res = await client.post('/api/admin/users', { name, username });
      set((state) => ({
        users: [res.data.user, ...state.users],
        revealedCode: { userId: res.data.user.id, name: res.data.user.name, code: res.data.accessCode }
      }));
      return true;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to create user.' });
      return false;
    }
  },

  regenerateCode: async (id, name) => {
    set({ error: null });
    try {
      const res = await client.patch(`/api/admin/users/${id}/regenerate`);
      set({ revealedCode: { userId: id, name, code: res.data.accessCode } });
      return true;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to regenerate access code.' });
      return false;
    }
  },

  deleteUser: async (id) => {
    set({ error: null });
    try {
      await client.delete(`/api/admin/users/${id}`);
      set((state) => ({ users: state.users.filter((u) => u.id !== id) }));
      return true;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to delete user.' });
      return false;
    }
  },

  updateUser: async (id, name) => {
    try {
      const res = await client.patch(`/api/admin/users/${id}`, { name });
      set((state) => ({
        users: state.users.map((u) => u.id === id ? { ...u, name: res.data.user.name } : u)
      }));
      return true;
    } catch (err) {
      set({ error: err.response?.data?.error || 'Failed to update user.' });
      return false;
    }
  },

  dismissRevealedCode: () => set({ revealedCode: null })
}));

export default useAdminStore;