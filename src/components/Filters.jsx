/**
 * Filters Component - Kayak AI Style
 * Filter controls for sorting and filtering flight results
 */
const Filters = ({ filters, onFilterChange, sortType, onSortChange }) => {
    const handleStopsChange = (e) => {
        const value = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
        onFilterChange('maxStops', value);
    };

    const handlePriceChange = (e) => {
        const value = e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10);
        onFilterChange('maxPrice', value);
    };

    return (
        <div className="filters-bar" role="group" aria-label="Flight filters">
            {/* Sort Filter */}
            {onSortChange && (
                <div className="filter-group">
                    <label htmlFor="sort-select">Sort by</label>
                    <select
                        id="sort-select"
                        value={sortType}
                        onChange={(e) => onSortChange(e.target.value)}
                        className="filter-select-modern"
                        aria-label="Sort flights by"
                    >
                        <option value="default">Default</option>
                        <option value="best">Best</option>
                        <option value="cheapest">Cheapest</option>
                        <option value="fastest">Fastest</option>
                    </select>
                </div>
            )}

            {/* Stops Filter */}
            <div className="filter-group">
                <label htmlFor="stops-select">Stops</label>
                <select
                    id="stops-select"
                    value={filters.maxStops}
                    onChange={handleStopsChange}
                    className="filter-select-modern"
                    aria-label="Filter by number of stops"
                >
                    <option value="all">Any</option>
                    <option value="0">Non-stop</option>
                    <option value="1">1 Stop</option>
                    <option value="2">2+ Stops</option>
                </select>
            </div>

            {/* Price Filter */}
            <div className="filter-group">
                <label htmlFor="price-select">Price</label>
                <select
                    id="price-select"
                    value={filters.maxPrice}
                    onChange={handlePriceChange}
                    className="filter-select-modern"
                    aria-label="Filter by maximum price"
                >
                    <option value="all">Any Price</option>
                    <option value="500">Under $500</option>
                    <option value="1000">Under $1,000</option>
                    <option value="2000">Under $2,000</option>
                </select>
            </div>
        </div>
    );
};

export default Filters;
