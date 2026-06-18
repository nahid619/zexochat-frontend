import useChatStore from '../store/chatStore';

function SearchToggle() {
  const { searchEnabled, toggleSearch } = useChatStore();

  return (
    <button
      onClick={toggleSearch}
      id="search-toggle-btn"
      className={`st-btn ${searchEnabled ? 'on' : ''}`}
      title={searchEnabled ? 'Web search is ON' : 'Web search is OFF'}
    >
      <span className="st-d"></span>
      🌐 Web Search
    </button>
  );
}

export default SearchToggle;