import React, { useState } from 'react';
import DashboardCard from '../components/DashboardCard';

export default function DoctorDashboard({ 
    activeTab, 
    appointments, 
    analytics, 
    systemDate, 
    onCancelAppointment 
}) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDateFilter, setSelectedDateFilter] = useState('');
    
    // States for selected patient details drawer
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [loadingRecords, setLoadingRecords] = useState(false);

    const monthsNames = [
        "January", "February", "March", "April", "May", "June", 
        "July", "August", "September", "October", "November", "December"
    ];

    // Compute stats
    const totalActive = analytics.totalActiveAppointments || 0;
    const totalCancelled = analytics.totalCancelledAppointments || 0;
    const highPriorityCount = analytics.priorityBreakdown?.HIGH || 0;
    const normalPriorityCount = analytics.priorityBreakdown?.NORMAL || 0;

    // Next scheduled slot calculation
    const getNextSlot = () => {
        const futureAppts = appointments.filter(a => {
            if (a.status === 'CANCELLED') return false;
            const datePart = a.appointmentDate.replace(/-/g, '/');
            const apptDate = new Date(`${datePart} ${a.appointmentTime}`);
            const fakeCurrentTime = new Date();
            return apptDate >= fakeCurrentTime;
        });

        if (futureAppts.length > 0) {
            const next = futureAppts[0];
            return `${next.appointmentDate} @ ${next.appointmentTime.substring(0, 5)}`;
        }
        return "None Scheduled";
    };

    // Calendar Navigation
    const handlePrevMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    };

    // Renders calendar cells
    const renderCalendarCells = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const cells = [];

        for (let i = 0; i < firstDay; i++) {
            cells.push(<div className="calendar-day empty" key={`empty-${i}`}></div>);
        }

        for (let d = 1; d <= totalDays; d++) {
            const dayNumStr = String(d).padStart(2, '0');
            const monthNumStr = String(month + 1).padStart(2, '0');
            const dateString = `${year}-${monthNumStr}-${dayNumStr}`;

            const today = new Date();
            const isToday = (year === today.getFullYear() && month === today.getMonth() && d === today.getDate());
            const dayAppts = appointments.filter(a => a.appointmentDate === dateString);

            cells.push(
                <div 
                    className={`calendar-day ${isToday ? 'today' : ''} ${selectedDateFilter === dateString ? 'selected-day' : ''}`} 
                    key={`day-${d}`}
                    onClick={() => {
                        if (selectedDateFilter === dateString) {
                            setSelectedDateFilter('');
                        } else {
                            setSelectedDateFilter(dateString);
                        }
                    }}
                    style={{ cursor: 'pointer', border: selectedDateFilter === dateString ? '2px solid var(--color-primary)' : '1px solid var(--border-color)' }}
                >
                    <span className="calendar-day-num">{d}</span>
                    <div className="calendar-dot-container">
                        {dayAppts.map((appt, aIdx) => {
                            let dotClass = "booked";
                            if (appt.status === "CANCELLED") dotClass = "cancelled";
                            if (appt.status === "RESCHEDULED") dotClass = "rescheduled";
                            if (appt.priority === "HIGH" && appt.status !== "CANCELLED") dotClass = "high";

                            const tooltip = `${appt.patientName} (${appt.appointmentTime.substring(0, 5)}) - Dr. ${appt.doctorName}`;

                            return (
                                <span 
                                    className={`calendar-dot ${dotClass}`} 
                                    key={aIdx} 
                                    title={tooltip}
                                ></span>
                            );
                        })}
                    </div>
                </div>
            );
        }

        return cells;
    };

    // Render Staff Progress Bars
    const renderDoctorBars = () => {
        const docs = analytics.doctorBreakdown || {};
        const keys = Object.keys(docs);

        if (keys.length === 0) {
            return <p className="empty-state">No appointments recorded yet.</p>;
        }

        let maxVal = 0;
        keys.forEach(k => maxVal = Math.max(maxVal, docs[k]));

        return keys.map((k, idx) => {
            const val = docs[k];
            const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
            return (
                <div className="bar-row" key={idx}>
                    <span className="bar-label" title={k}>
                        {k.startsWith("Dr.") ? k : "Dr. " + k}
                    </span>
                    <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="bar-value">{val}</span>
                </div>
            );
        });
    };

    // Fetch and open patient profile details drawer
    const handleViewRecords = async (email, patientName, phoneNumber) => {
        setLoadingRecords(true);
        try {
            const res = await fetch("/api/patients?email=" + encodeURIComponent(email));
            if (res.ok) {
                const patientData = await res.json();
                setSelectedPatient(patientData);
            } else {
                // Fallback to minimal profile if not registered in patients table yet
                setSelectedPatient({
                    fullName: patientName,
                    email: email,
                    phoneNumber: phoneNumber,
                    dateOfBirth: 'N/A',
                    gender: 'N/A',
                    address: 'N/A'
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingRecords(false);
        }
    };

    // Filter appointments for Doctor tables
    const getFilteredAppointments = (onlyToday = false, onlyActive = false) => {
        return appointments.filter(appt => {
            if (onlyToday && appt.appointmentDate !== systemDate) {
                return false;
            }
            if (onlyActive && appt.status === 'CANCELLED') {
                return false;
            }
            if (selectedDateFilter && appt.appointmentDate !== selectedDateFilter) {
                return false;
            }

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
    };

    const renderDoctorSection = () => {
        if (activeTab === 'stats') {
            const totalPriorities = normalPriorityCount + highPriorityCount;
            const normalPct = totalPriorities > 0 ? (normalPriorityCount / totalPriorities) * 100 : 50;
            const highPct = totalPriorities > 0 ? (highPriorityCount / totalPriorities) * 100 : 50;

            return (
                <>
                    {/* Stats Overview */}
                    <div className="grid grid-4">
                        <DashboardCard title="Active Appointments" value={totalActive} iconBg="bg-blue">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                        </DashboardCard>

                        <DashboardCard title="Next Scheduled Slot" value={getNextSlot()} iconBg="bg-emerald">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 14 14"></polyline>
                            </svg>
                        </DashboardCard>

                        <DashboardCard title="Cancelled Bookings" value={totalCancelled} iconBg="bg-red">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                        </DashboardCard>

                        <DashboardCard title="High Priority Bookings" value={highPriorityCount} iconBg="bg-purple">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            </svg>
                        </DashboardCard>
                    </div>

                    {/* Calendar & Charts */}
                    <div className="grid grid-2">
                        {/* Calendar */}
                        <div className="card calendar-card">
                            <div className="calendar-header">
                                <button className="btn btn-outline" onClick={handlePrevMonth}>&larr;</button>
                                <h3>{monthsNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                                <button className="btn btn-outline" onClick={handleNextMonth}>&rarr;</button>
                            </div>
                            <div className="calendar-days-header">
                                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                            </div>
                            <div className="calendar-grid">
                                {renderCalendarCells()}
                            </div>
                            {selectedDateFilter && (
                                <div style={{ marginTop: '12px', textAlign: 'center', fontSize: '0.85rem' }}>
                                    Filtering records by: <strong>{selectedDateFilter}</strong>
                                    <button 
                                        onClick={() => setSelectedDateFilter('')}
                                        style={{ background: 'none', border: 'none', color: 'var(--color-primary)', marginLeft: '8px', cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        Clear Filter
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Breakdown Metrics */}
                        <div className="card breakdown-card">
                            <h3>Distribution Analysis</h3>
                            <div className="breakdown-section">
                                <h4>Bookings by Staff Members</h4>
                                <div className="chart-bars">
                                    {renderDoctorBars()}
                                </div>
                            </div>
                            <div className="breakdown-section">
                                <h4>Appointment Priorities</h4>
                                <div className="priority-visual">
                                    <div className="progress-bar-container">
                                        <div className="progress-fill normal-fill" style={{ width: `${normalPct}%` }}></div>
                                        <div className="progress-fill high-fill" style={{ width: `${highPct}%` }}></div>
                                    </div>
                                    <div className="legend">
                                        <span><span className="dot normal"></span> Normal Priority ({normalPriorityCount})</span>
                                        <span><span className="dot high"></span> High Priority ({highPriorityCount})</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            );
        }

        // Appointments Table View (Today, Records, or Med History)
        const onlyToday = activeTab === 'today';
        const onlyActive = activeTab === 'records';
        const apptsList = getFilteredAppointments(onlyToday, onlyActive);

        return (
            <div className="card table-card" style={{ padding: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                    <h3 style={{ margin: '0' }}>
                        {activeTab === 'today' && `Today's Appointments (${systemDate})`}
                        {activeTab === 'records' && 'Patient Records Directory'}
                        {activeTab === 'med-history' && 'Medical History logs'}
                    </h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="text" 
                            className="search-input" 
                            placeholder="Search patients, contact details..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ margin: '0', width: '250px' }}
                        />
                        <button className="btn btn-secondary" onClick={() => { setSearchQuery(''); setSelectedDateFilter(''); }}>
                            Clear
                        </button>
                    </div>
                </div>

                <div className="table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Patient Name</th>
                                <th>Contact details</th>
                                <th>Doctor assigned</th>
                                <th>Appt Date</th>
                                <th>Time Slot</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {apptsList.length === 0 ? (
                                <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '20px' }}>
                                        No appointments matching requirements.
                                    </td>
                                </tr>
                            ) : (
                                apptsList.map((appt, idx) => {
                                    const isPast = appt.appointmentDate < systemDate && appt.status !== 'CANCELLED';
                                    let statusClass = "booked";
                                    let displayStatus = appt.status;
                                    if (isPast) {
                                        statusClass = "completed";
                                        displayStatus = "COMPLETED";
                                    } else {
                                        if (appt.status === "CANCELLED") statusClass = "cancelled";
                                        if (appt.status === "RESCHEDULED") statusClass = "rescheduled";
                                    }
                                    const priorityClass = appt.priority === "HIGH" ? "priority-high" : "priority-normal";

                                    return (
                                        <tr key={appt.appointmentId || idx}>
                                            <td><strong>{appt.appointmentId}</strong></td>
                                            <td>
                                                <button 
                                                    style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer', padding: '0', textAlign: 'left' }}
                                                    onClick={() => handleViewRecords(appt.email, appt.patientName, appt.phoneNumber)}
                                                    title="Inspect Patient Details"
                                                >
                                                    {appt.patientName}
                                                </button>
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                📞 {appt.phoneNumber}<br />
                                                ✉️ {appt.email}
                                            </td>
                                            <td>Dr. {appt.doctorName}</td>
                                            <td>{appt.appointmentDate}</td>
                                            <td><strong>{appt.appointmentTime.substring(0, 5)}</strong></td>
                                            <td><span className={`pill ${statusClass}`}>{displayStatus}</span></td>
                                            <td><span className={`pill ${priorityClass}`}>{appt.priority}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button 
                                                        className="btn btn-secondary" 
                                                        style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                                        onClick={() => handleViewRecords(appt.email, appt.patientName, appt.phoneNumber)}
                                                    >
                                                        Details Log
                                                    </button>
                                                    {appt.status !== 'CANCELLED' && !isPast && (
                                                        <button 
                                                            className="btn btn-outline" 
                                                            style={{ padding: '4px 8px', fontSize: '0.7rem', borderColor: 'var(--color-red)', color: 'var(--color-red)' }}
                                                            onClick={() => onCancelAppointment(appt.appointmentId)}
                                                        >
                                                            Cancel
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="doctor-portal-layout" style={{ position: 'relative' }}>
            {renderDoctorSection()}

            {/* Sliding Drawer for Patient Info & Clinical Logs */}
            {selectedPatient && (
                <div 
                    className="drawer-overlay"
                    style={{
                        position: 'fixed',
                        top: '0',
                        right: '0',
                        width: '400px',
                        height: '100vh',
                        backgroundColor: 'var(--bg-secondary)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        borderLeft: '1px solid var(--border-color)',
                        boxShadow: '-5px 0 25px rgba(0,0,0,0.5)',
                        zIndex: '9999',
                        padding: '30px',
                        overflowY: 'auto',
                        transition: 'transform 0.3s ease-in-out',
                        color: 'var(--text-primary)'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
                        <h3 style={{ margin: '0', color: 'var(--color-primary)' }}>Patient File Details</h3>
                        <button 
                            className="btn btn-outline" 
                            onClick={() => setSelectedPatient(null)}
                            style={{ padding: '4px 10px', fontSize: '0.8rem', borderRadius: '50%' }}
                        >
                            &times;
                        </button>
                    </div>

                    {/* Patient Information */}
                    <div style={{ marginBottom: '25px' }}>
                        <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Patient Info</h4>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                            <p><strong>Name:</strong> {selectedPatient.fullName}</p>
                            <p><strong>Email:</strong> {selectedPatient.email}</p>
                            <p><strong>Phone:</strong> {selectedPatient.phoneNumber}</p>
                            <p><strong>DOB:</strong> {selectedPatient.dateOfBirth}</p>
                            <p><strong>Gender:</strong> {selectedPatient.gender}</p>
                            <p><strong>Address:</strong> {selectedPatient.address}</p>
                        </div>
                    </div>

                    {/* Booking logs/History */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                        <h4 style={{ color: 'var(--text-primary)', marginBottom: '12px' }}>Appointment History</h4>
                        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            {appointments
                                .filter(a => a.email.toLowerCase() === selectedPatient.email.toLowerCase())
                                .map((appt, idx) => {
                                    const isPast = appt.appointmentDate < systemDate && appt.status !== 'CANCELLED';
                                    let statusClass = "booked";
                                    let displayStatus = appt.status;
                                    if (isPast) {
                                        statusClass = "completed";
                                        displayStatus = "COMPLETED";
                                    } else {
                                        if (appt.status === "CANCELLED") statusClass = "cancelled";
                                        if (appt.status === "RESCHEDULED") statusClass = "rescheduled";
                                    }
                                    return (
                                        <div 
                                            key={idx} 
                                            style={{ 
                                                padding: '10px', 
                                                backgroundColor: 'var(--bg-primary)', 
                                                border: '1px solid var(--border-color)', 
                                                borderRadius: 'var(--border-radius-sm)',
                                                marginBottom: '8px',
                                                fontSize: '0.8rem' 
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <strong>Dr. {appt.doctorName}</strong>
                                                <span className={`pill ${statusClass}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>{displayStatus}</span>
                                            </div>
                                            <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                                                {appt.appointmentDate} at {appt.appointmentTime.substring(0, 5)}
                                            </p>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
