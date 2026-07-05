import React, { useState } from 'react';
import Chat from './Chat';

export default function PatientPortal({ 
    activeTab, 
    messages, 
    onSendMessage, 
    typing, 
    systemDate, 
    appointments, 
    onNavigate, 
    onApplyQuickPrompt 
}) {
    const [patientQuery, setPatientQuery] = useState('');
    const [searchedKey, setSearchedKey] = useState('');
    const [patientInfo, setPatientInfo] = useState(null);

    const handleSearch = async (e) => {
        e.preventDefault();
        const query = patientQuery.trim().toLowerCase();
        
        try {
            // 1. Try to fetch patient profile by email
            const res = await fetch("/api/patients?email=" + encodeURIComponent(query));
            if (res.ok) {
                const data = await res.json();
                setPatientInfo(data);
                setSearchedKey(query);
                return;
            }
            
            // 2. Fallback: Search in appointments list by name, phone, or email
            const matchedAppt = appointments.find(a => 
                a.email.toLowerCase() === query || 
                a.phoneNumber === query || 
                a.patientName.toLowerCase() === query
            );
            
            if (matchedAppt) {
                setSearchedKey(matchedAppt.email.toLowerCase());
                setPatientInfo(null);
            } else {
                // If neither patient profile nor appointment exists, set searchedKey to display no-results view
                setSearchedKey(query);
                setPatientInfo(null);
            }
        } catch (err) {
            console.error("Error searching patient data:", err);
            setSearchedKey(query);
            setPatientInfo(null);
        }
    };

    const handleClear = () => {
        setPatientQuery('');
        setSearchedKey('');
        setPatientInfo(null);
    };

    // Filter appointments only matching search key to hide other patient records
    const myAppointments = appointments.filter(appt => {
        if (!searchedKey) return false;
        return (
            appt.email.toLowerCase().includes(searchedKey) ||
            appt.phoneNumber.toLowerCase().includes(searchedKey) ||
            appt.patientName.toLowerCase().includes(searchedKey)
        );
    });

    const renderPatientSection = () => {
        if (activeTab === 'chat') {
            return (
                <Chat 
                    messages={messages} 
                    onSendMessage={onSendMessage} 
                    typing={typing} 
                    systemDate={systemDate} 
                />
            );
        }

        // Render My Appointments or Medical History tab
        return (
            <div className="card table-card" style={{ padding: '30px' }}>
                <h3 style={{ marginBottom: '15px' }}>
                    {activeTab === 'appointments' ? 'My Scheduled Appointments' : 'My Medical History Log'}
                </h3>
                
                {!searchedKey ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🔍</div>
                        <h4>Retrieve Patient Records</h4>
                        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '8px auto 20px' }}>
                            Please verify your details by typing your registered email address, phone number, or patient name to view bookings.
                        </p>
                        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', justifyContent: 'center', maxWidth: '450px', margin: '0 auto' }}>
                            <input 
                                type="text" 
                                className="search-input" 
                                placeholder="Enter email or phone number..." 
                                value={patientQuery}
                                onChange={(e) => setPatientQuery(e.target.value)}
                                style={{ flex: '1', margin: '0' }}
                                required
                            />
                            <button className="btn btn-primary" type="submit">Search Records</button>
                        </form>
                    </div>
                ) : (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                {patientInfo ? (
                                    <h4 style={{ margin: '0 0 4px 0', color: 'var(--color-primary)' }}>
                                        Welcome back, {patientInfo.fullName}!
                                    </h4>
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', margin: '0' }}>
                                        Showing results matching: <strong>"{searchedKey}"</strong>
                                    </p>
                                )}
                            </div>
                            <button className="btn btn-outline" onClick={handleClear} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                                Search Different Patient
                            </button>
                        </div>

                        {/* Patient Profile Detail Card */}
                        {patientInfo && (
                            <div className="card" style={{ padding: '15px 20px', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', marginBottom: '20px', fontSize: '0.85rem' }}>
                                <h5 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>
                                    Patient Profile Details
                                </h5>
                                <div className="grid grid-4" style={{ gap: '15px' }}>
                                    <div><strong>Email:</strong> <span style={{ color: 'var(--text-secondary)' }}>{patientInfo.email}</span></div>
                                    <div><strong>Phone:</strong> <span style={{ color: 'var(--text-secondary)' }}>{patientInfo.phoneNumber}</span></div>
                                    <div><strong>Date of Birth:</strong> <span style={{ color: 'var(--text-secondary)' }}>{patientInfo.dateOfBirth || 'N/A'}</span></div>
                                    <div><strong>Address:</strong> <span style={{ color: 'var(--text-secondary)' }}>{patientInfo.address || 'N/A'}</span></div>
                                </div>
                            </div>
                        )}

                        <div className="table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Patient Name</th>
                                        <th>Contact Details</th>
                                        <th>Assigned Doctor</th>
                                        <th>Appt Date</th>
                                        <th>Time Slot</th>
                                        <th>Status</th>
                                        <th>Priority</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {myAppointments.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                                                No scheduled appointments found for this profile.<br />
                                                <button 
                                                    className="btn btn-primary" 
                                                    style={{ marginTop: '12px', padding: '6px 15px', fontSize: '0.8rem' }}
                                                    onClick={() => onNavigate('chat')}
                                                >
                                                    Book a Slot with AI Assistant
                                                </button>
                                            </td>
                                        </tr>
                                    ) : (
                                        myAppointments
                                            .filter(appt => {
                                                if (activeTab === 'appointments') {
                                                    return appt.status !== 'CANCELLED';
                                                }
                                                return true;
                                            })
                                            .map((appt, idx) => {
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
                                                                        onClick={() => {
                                                                            onNavigate('chat');
                                                                            onApplyQuickPrompt(`Cancel my appointment with ID ${appt.appointmentId}`);
                                                                        }}
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button 
                                                                        className="btn btn-secondary" 
                                                                        style={{ padding: '4px 8px', fontSize: '0.75rem', marginLeft: '8px' }}
                                                                        onClick={() => {
                                                                            onNavigate('chat');
                                                                            onApplyQuickPrompt(`Reschedule my appointment with ID ${appt.appointmentId} to tomorrow at `);
                                                                        }}
                                                                    >
                                                                        Reschedule
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
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
                )}
            </div>
        );
    };

    return (
        <div className="patient-portal-layout">
            {renderPatientSection()}
        </div>
    );
}
