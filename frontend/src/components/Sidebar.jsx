import React from 'react';

export default function Sidebar({ role, activeTab, onTabChange, isOnline, onSwitchRole }) {
    return (
        <aside className="sidebar">
            {/* Brand Header */}
            <div className="sidebar-brand">
                <div className="brand-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                </div>
                <div className="brand-text">
                    <h2>AgentSched <span>AI</span></h2>
                    <p>{role === 'patient' ? 'Patient Portal' : 'Doctor Dashboard'}</p>
                </div>
            </div>

            {/* Menu Sections based on Role */}
            <nav className="sidebar-menu">
                {role === 'patient' ? (
                    <>
                        <button 
                            className={`menu-item ${activeTab === 'chat' ? 'active' : ''}`}
                            onClick={() => onTabChange('chat')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                                <line x1="7" y1="8" x2="17" y2="8"></line>
                                <line x1="7" y1="12" x2="17" y2="12"></line>
                                <line x1="7" y1="16" x2="14" y2="16"></line>
                            </svg>
                            <span>AI Assistant</span>
                        </button>
                        <button 
                            className={`menu-item ${activeTab === 'appointments' ? 'active' : ''}`}
                            onClick={() => onTabChange('appointments')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>My Appointments</span>
                        </button>
                        <button 
                            className={`menu-item ${activeTab === 'history' ? 'active' : ''}`}
                            onClick={() => onTabChange('history')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                            <span>Medical History</span>
                        </button>
                    </>
                ) : (
                    <>
                        <button 
                            className={`menu-item ${activeTab === 'stats' ? 'active' : ''}`}
                            onClick={() => onTabChange('stats')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="7" height="9"></rect>
                                <rect x="14" y="3" width="7" height="5"></rect>
                                <rect x="14" y="12" width="7" height="9"></rect>
                                <rect x="3" y="16" width="7" height="5"></rect>
                            </svg>
                            <span>Dashboard Stats</span>
                        </button>
                        <button 
                            className={`menu-item ${activeTab === 'today' ? 'active' : ''}`}
                            onClick={() => onTabChange('today')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span>Today's Schedule</span>
                        </button>
                        <button 
                            className={`menu-item ${activeTab === 'records' ? 'active' : ''}`}
                            onClick={() => onTabChange('records')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                            <span>Patient Records</span>
                        </button>
                        <button 
                            className={`menu-item ${activeTab === 'med-history' ? 'active' : ''}`}
                            onClick={() => onTabChange('med-history')}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                            <span>Medical History</span>
                        </button>
                    </>
                )}

                {/* Switch Role Button */}
                <button 
                    className="menu-item" 
                    onClick={onSwitchRole} 
                    style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', borderRadius: '0', paddingTop: '20px' }}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 17l5-5-5-5M19.8 12H9M10 3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"></path>
                    </svg>
                    <span>Switch Role</span>
                </button>
            </nav>

            {/* Online Status footer */}
            <div className="sidebar-footer">
                <div className={`status-badge ${isOnline ? 'connected' : ''}`} id="system-status">
                    <span className="status-indicator"></span>
                    <span className="status-text">{isOnline ? 'Server Connected' : 'Offline Mode'}</span>
                </div>
            </div>
        </aside>
    );
}
