/**
 * Sidebar Component - SkyScout
 * Navigation sidebar with branding, new plan action, and scrollable deletable plan history
 */
const Sidebar = ({ onReset, plans = [], onLoadPlan, onDeletePlan, currentPlanId, theme, toggleTheme, onToggleSidebar }) => {
    const handlePlanClick = (planId) => {
        if (onLoadPlan) {
            onLoadPlan(planId);
        }
    };

    return (
        <aside className="sidebar" role="navigation" aria-label="Main navigation">
            {/* top area (header + action) */}
            <div className="sidebar-top">
                {/* Logo Header */}
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="logo-icon-wrapper" aria-hidden="true">
                            <svg className="logo-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 16V14L13 9V3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5V9L2 14V16L10 13.5V19L8 20.5V22L11.5 21L15 22V20.5L13 19V13.5L21 16Z" fill="#0071c2" />
                            </svg>
                        </div>
                        <span className="logo-text">SkyScout</span>
                    </div>
                    {/* Hamburger Toggle */}
                    {onToggleSidebar && (
                        <button
                            className="hamburger-btn-inline"
                            onClick={onToggleSidebar}
                            aria-label="Hide sidebar"
                        >
                            <div className="hamburger-icon">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </button>
                    )}
                </div>

                {/* New Plan Button */}
                <button
                    className="new-plan-btn"
                    onClick={onReset}
                    aria-label="Start a new travel plan"
                >
                    <svg className="plus-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M12 5V19M5 12H19" stroke="white" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    <span>Start a new plan</span>
                </button>
            </div>

            {/* Recent Plans */}
            <div className="previous-plans">
                <h3 className="section-title">Your plans</h3>
                <ul className="plans-list" role="list">
                    {plans.length === 0 ? (
                        <li className="plan-item plan-item-empty" aria-label="No recent plans">
                            <span className="plan-empty-icon">🗺️</span>
                            <span>No recent plans yet</span>
                        </li>
                    ) : (
                        plans.map((plan) => (
                            <li
                                key={plan.id}
                                className={`plan-item ${plan.id === currentPlanId ? 'plan-item-active' : ''}`}
                                onClick={() => handlePlanClick(plan.id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        handlePlanClick(plan.id);
                                    }
                                }}
                                aria-label={`Load plan: ${plan.route} from ${plan.date}`}
                                aria-current={plan.id === currentPlanId ? 'true' : undefined}
                            >
                                <div className="plan-item-content">
                                    <span className="plan-route">{plan.route}</span>
                                    <span className="plan-date">{plan.date}</span>
                                </div>
                                {onDeletePlan && (
                                    <button
                                        className="plan-delete-btn"
                                        onClick={(e) => onDeletePlan(plan.id, e)}
                                        aria-label={`Delete plan: ${plan.route}`}
                                        title="Delete plan"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                                        </svg>
                                    </button>
                                )}
                            </li>
                        ))
                    )}
                </ul>
            </div>

            {/* Footer with User Profile */}
            <div className="sidebar-footer">
                <div className="user-profile">
                    <div className="user-avatar" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#718096" />
                        </svg>
                    </div>
                    <span className="user-name">Guest User</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
