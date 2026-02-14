import { useState } from "react";

/**
 * SearchInput Component - Kayak AI Style
 * Modern search input with smooth interactions and accessibility
 */
const SearchInput = ({
    onSearch,
    isLoading = false,
    placeholder = "Ask about flights, dates, or destinations…",
}) => {
    const [query, setQuery] = useState("");

    const canSubmit = query.trim().length > 0 && !isLoading;

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSearch(query.trim());
        setQuery(""); // Clear input after submission
    };

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="search-input-container">
            <div className={`search-input-wrapper ${isLoading ? "loading" : ""}`}>
                {/* Search Icon */}
                <span className="search-icon" aria-hidden="true">
                    ✈️
                </span>

                {/* Input Field */}
                <input
                    className="search-input"
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    autoFocus
                    spellCheck={false}
                    autoComplete="off"
                    aria-label="Search for flights"
                />

                {/* Submit Button */}
                <button
                    className="search-submit-btn"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    aria-label={isLoading ? "Searching..." : "Search flights"}
                    type="button"
                >
                    {isLoading ? (
                        <span className="spinner-small" aria-hidden="true">⏳</span>
                    ) : (
                        <span className="arrow-icon" aria-hidden="true">→</span>
                    )}
                </button>
            </div>
        </div>
    );
};

export default SearchInput;
