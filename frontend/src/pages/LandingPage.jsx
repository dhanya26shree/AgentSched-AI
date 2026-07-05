import React from 'react';
import AuroraBackground from '../components/ui/aurora-background';

export default function LandingPage({ onSelectRole, theme, onToggleTheme }) {
    return (
        <AuroraBackground theme={theme}>
            <div className="landing-container" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                width: '100vw',
                backgroundColor: 'transparent',
                padding: '20px',
                color: 'var(--text-primary)'
            }}>
            {/* Theme Toggle Button */}
            <button 
                onClick={onToggleTheme}
                style={{
                    position: 'absolute',
                    top: '24px',
                    right: '24px',
                    background: 'rgba(19, 26, 46, 0.45)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '10px 18px',
                    borderRadius: '50px',
                    cursor: 'pointer',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'var(--transition-smooth)',
                    zIndex: 1000
                }}
            >
                {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
            {/* Header Brand */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-purple))',
                    borderRadius: 'var(--border-radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    margin: '0 auto 20px',
                    boxShadow: '0 0 20px var(--color-primary-glow)'
                }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                </div>
                <h1 style={{
                    fontFamily: 'Outfit',
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    lineHeight: '1.2'
                }}>
                    AgentSched <span style={{ color: 'var(--color-primary)' }}>AI</span>
                </h1>
                <p style={{
                    fontSize: '1rem',
                    color: 'var(--text-secondary)',
                    marginTop: '8px',
                    fontWeight: '500'
                }}>
                    Intelligent Agentic Appointment Scheduling Assistant
                </p>
            </div>

            {/* Selection Options */}
            <div className="grid grid-2" style={{ maxWidth: '800px', width: '100%' }}>
                {/* Patient Selection Card */}
                <div 
                    className="card feature-card" 
                    onClick={() => onSelectRole('patient')}
                    style={{
                        cursor: 'pointer',
                        padding: '40px 30px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderColor: 'var(--border-color)',
                        height: '240px'
                    }}
                >
                    <div className="card-icon-wrapper bg-blue" style={{ margin: '0 auto 20px', width: '56px', height: '56px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px' }}>Continue as Patient</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Book, reschedule, or cancel slots by chatting in conversational English with our AI.
                    </p>
                </div>

                {/* Doctor Selection Card */}
                <div 
                    className="card feature-card" 
                    onClick={() => onSelectRole('doctor')}
                    style={{
                        cursor: 'pointer',
                        padding: '40px 30px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderColor: 'var(--border-color)',
                        height: '240px'
                    }}
                >
                    <div className="card-icon-wrapper bg-indigo" style={{ margin: '0 auto 20px', width: '56px', height: '56px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="7" height="9"></rect>
                            <rect x="14" y="3" width="7" height="5"></rect>
                            <rect x="14" y="12" width="7" height="9"></rect>
                            <rect x="3" y="16" width="7" height="5"></rect>
                        </svg>
                    </div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: '700', marginBottom: '8px' }}>Continue as Doctor</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Monitor clinic statistics, browse patient lists, view schedule calendars, and manage records.
                    </p>
                </div>
            </div>
        </div>
        </AuroraBackground>
    );
}
