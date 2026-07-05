import React from 'react';

export default function Home({ onNavigate }) {
    const doctors = [
        { initials: 'GP', name: 'General Practitioner', specialty: 'Family Medicine', bg: 'bg-blue' },
        { initials: 'DS', name: 'Dr. Smith', specialty: 'Cardiology', bg: 'bg-indigo' },
        { initials: 'DP', name: 'Dr. Patel', specialty: 'Dentistry', bg: 'bg-emerald' },
        { initials: 'DA', name: 'Dr. Adams', specialty: 'Pediatrics', bg: 'bg-purple' }
    ];

    return (
        <div id="section-home" className="content-section active">
            {/* Hero Card */}
            <div className="hero-card">
                <div className="hero-body">
                    <h2>Welcome to AgentSched AI</h2>
                    <p>Experience the next generation of medical scheduling. Powered by Groq Llama, our autonomous AI agent plans, reasons, and executes appointment booking directly via conversational English.</p>
                    <div className="hero-actions-container">
                        <button className="btn btn-primary" onClick={() => onNavigate('chat')}>
                            Chat with AI Agent
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="btn-icon">
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                                <polyline points="12 5 19 12 12 19"></polyline>
                            </svg>
                        </button>
                        <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>
                            View Live Dashboard
                        </button>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="floating-card c1">
                        <span className="card-icon">📅</span>
                        <div>
                            <h4>Instant Booking</h4>
                            <p>Just say the date & time</p>
                        </div>
                    </div>
                    <div className="floating-card c2">
                        <span className="card-icon">🧠</span>
                        <div>
                            <h4>Agentic Planning</h4>
                            <p>Suggests alternatives if busy</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feature Cards Grid */}
            <div className="grid grid-3">
                <div className="card feature-card">
                    <div className="card-icon-wrapper bg-blue">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                    </div>
                    <h3>Conversational Scheduling</h3>
                    <p>Book, reschedule, or cancel bookings in plain English. No complex forms or calendars needed.</p>
                </div>
                <div className="card feature-card">
                    <div className="card-icon-wrapper bg-indigo">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                            <polyline points="2 17 12 22 22 17"></polyline>
                            <polyline points="2 12 12 17 22 12"></polyline>
                        </svg>
                    </div>
                    <h3>Intelligent Tools Layer</h3>
                    <p>The AI dynamically invokes backend Java APIs to query availability and write to MySQL JDBC database.</p>
                </div>
                <div className="card feature-card">
                    <div className="card-icon-wrapper bg-emerald">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <h3>Alternative Slot Recommender</h3>
                    <p>Conflicting schedules trigger a smart scanner that recommends the closest available slots automatically.</p>
                </div>
            </div>

            {/* Doctors Grid */}
            <div className="section-header-inline">
                <h2>Available Medical Staff</h2>
                <span className="badge">4 Active</span>
            </div>
            <div className="grid grid-4" id="doctors-list">
                {doctors.map((doc, idx) => (
                    <div className="card doctor-card" key={idx}>
                        <div className={`doc-avatar ${doc.bg}`}>{doc.initials}</div>
                        <div className="doc-info">
                            <h4>{doc.name}</h4>
                            <p className="specialty">{doc.specialty}</p>
                            <span className="status-pill online">Available</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
