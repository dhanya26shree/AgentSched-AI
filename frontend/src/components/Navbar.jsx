import React from 'react';

export default function Navbar({ pageTitle, clockText, theme, onToggleTheme }) {
    return (
        <header className="content-header">
            <h1 id="page-title">{pageTitle}</h1>
            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button 
                    onClick={onToggleTheme}
                    className="btn btn-outline"
                    style={{ 
                        padding: '8px 12px', 
                        fontSize: '0.85rem', 
                        borderRadius: '50px', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        cursor: 'pointer',
                        borderColor: 'var(--border-color)',
                        background: 'rgba(19, 26, 46, 0.2)'
                    }}
                    title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                >
                    {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                </button>
                <div className="time-display" id="clock-display">
                    {clockText}
                </div>
            </div>
        </header>
    );
}
