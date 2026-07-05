import React, { useState } from 'react';

export default function History({ appointments, onNavigate, onApplyQuickPrompt, searchFilterText, onClearSearch }) {
    const [searchQuery, setSearchQuery] = useState(searchFilterText || '');

    // Allow search query to be controlled externally (e.g. from calendar click)
    React.useEffect(() => {
        if (searchFilterText !== undefined) {
            setSearchQuery(searchFilterText);
        }
    }, [searchFilterText]);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        if (!val) {
            onClearSearch();
        }
    };

    // Filter appointments
    const filteredAppointments = appointments.filter(appt => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;

        if (query.startsWith("id:")) {
            const idQuery = query.replace("id:", "").trim();
            return String(appt.appointmentId) === idQuery;
        }

        return (
            appt.patientName.toLowerCase().includes(query) ||
            appt.phoneNumber.toLowerCase().includes(query) ||
            appt.email.toLowerCase().includes(query) ||
            appt.doctorName.toLowerCase().includes(query) ||
            appt.status.toLowerCase().includes(query) ||
            appt.priority.toLowerCase().includes(query) ||
            appt.appointmentDate.includes(query)
        );
    });

    const triggerCancel = (id) => {
        onNavigate('chat');
        onApplyQuickPrompt(`Cancel my appointment with ID ${id}`);
    };

    const triggerReschedule = (id) => {
        onNavigate('chat');
        onApplyQuickPrompt(`Reschedule my appointment with ID ${id} to tomorrow at `);
    };

    return (
        <div id="section-history" className="content-section active">
            <div className="card table-card">
                {/* Search Action Bar */}
                <div className="table-actions">
                    <input 
                        type="text" 
                        id="search-filter" 
                        className="search-input" 
                        placeholder="Filter by patient name, doctor, status..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                    />
                    <button 
                        className="btn btn-secondary" 
                        id="refresh-table-btn"
                        onClick={() => {
                            setSearchQuery('');
                            onClearSearch();
                        }}
                    >
                        Refresh Table
                    </button>
                </div>

                {/* Table Layout */}
                <div className="table-container">
                    <table className="data-table" id="appointments-data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Patient</th>
                                <th>Contact</th>
                                <th>Doctor</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody id="appointments-table-body">
                            {filteredAppointments.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="text-center py-4">
                                        No appointments match your search criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredAppointments.map((appt, idx) => {
                                    let statusClass = "booked";
                                    if (appt.status === "CANCELLED") statusClass = "cancelled";
                                    if (appt.status === "RESCHEDULED") statusClass = "rescheduled";

                                    const priorityClass = appt.priority === "HIGH" ? "priority-high" : "priority-normal";

                                    return (
                                        <tr key={appt.appointmentId || idx}>
                                            <td><strong>{appt.appointmentId}</strong></td>
                                            <td><strong>{appt.patientName}</strong></td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                📞 {appt.phoneNumber}<br />
                                                ✉️ {appt.email}
                                            </td>
                                            <td>Dr. {appt.doctorName}</td>
                                            <td>{appt.appointmentDate}</td>
                                            <td><strong>{appt.appointmentTime.substring(0, 5)}</strong></td>
                                            <td><span className={`pill ${statusClass}`}>{appt.status}</span></td>
                                            <td><span className={`pill ${priorityClass}`}>{appt.priority}</span></td>
                                            <td>
                                                {appt.status !== 'CANCELLED' ? (
                                                    <>
                                                        <button 
                                                            className="btn btn-outline" 
                                                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                                            onClick={() => triggerCancel(appt.appointmentId)}
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button 
                                                            className="btn btn-secondary" 
                                                            style={{ padding: '4px 8px', fontSize: '0.75rem', marginLeft: '8px' }}
                                                            onClick={() => triggerReschedule(appt.appointmentId)}
                                                        >
                                                            Reschedule
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-muted" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                                                        No Actions
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
