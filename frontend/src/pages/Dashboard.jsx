import React, { useState } from 'react';

export default function Dashboard({ appointments, analytics, onNavigate, onApplyQuickPrompt }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

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
            // Parse using slashes to enforce local browser time evaluation
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

    // Render Calendar cells
    const renderCalendarCells = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const cells = [];

        // Preceding padding empty days
        for (let i = 0; i < firstDay; i++) {
            cells.push(<div className="calendar-day empty" key={`empty-${i}`}></div>);
        }

        // Days of month
        for (let d = 1; d <= totalDays; d++) {
            const dayNumStr = String(d).padStart(2, '0');
            const monthNumStr = String(month + 1).padStart(2, '0');
            const dateString = `${year}-${monthNumStr}-${dayNumStr}`;

            const today = new Date();
            const isToday = (year === today.getFullYear() && month === today.getMonth() && d === today.getDate());
            const dayAppts = appointments.filter(a => a.appointmentDate === dateString);

            cells.push(
                <div 
                    className={`calendar-day ${isToday ? 'today' : ''}`} 
                    key={`day-${d}`}
                    onClick={() => {
                        onNavigate('chat');
                        onApplyQuickPrompt(`Check availability on ${dateString}`);
                    }}
                    style={{ cursor: 'pointer' }}
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onNavigate('history');
                                        // Zoom table view to target ID by filtering it
                                        onApplyQuickPrompt(`id: ${appt.appointmentId}`);
                                    }}
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

    const totalPriorities = normalPriorityCount + highPriorityCount;
    const normalPct = totalPriorities > 0 ? (normalPriorityCount / totalPriorities) * 100 : 50;
    const highPct = totalPriorities > 0 ? (highPriorityCount / totalPriorities) * 100 : 50;

    return (
        <div id="section-dashboard" className="content-section active">
            {/* Stats Overview */}
            <div className="grid grid-4">
                <div className="card stat-card">
                    <div className="stat-icon bg-blue">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                    </div>
                    <div className="stat-details">
                        <h3 id="stat-total-active">{totalActive}</h3>
                        <p>Active Appointments</p>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon bg-emerald">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 14 14"></polyline>
                        </svg>
                    </div>
                    <div className="stat-details">
                        <h3 id="stat-next-slot">{getNextSlot()}</h3>
                        <p>Next Scheduled Slot</p>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon bg-red">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    </div>
                    <div className="stat-details">
                        <h3 id="stat-total-cancelled">{totalCancelled}</h3>
                        <p>Cancelled Bookings</p>
                    </div>
                </div>

                <div className="card stat-card">
                    <div className="stat-icon bg-purple">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                    </div>
                    <div className="stat-details">
                        <h3 id="stat-high-priority">{highPriorityCount}</h3>
                        <p>High Priority Bookings</p>
                    </div>
                </div>
            </div>

            {/* Calendar & Chart Layout */}
            <div className="grid grid-2">
                {/* Calendar Card */}
                <div className="card calendar-card">
                    <div className="calendar-header">
                        <button id="calendar-prev-btn" className="btn btn-outline" onClick={handlePrevMonth}>&larr;</button>
                        <h3 id="calendar-month-title">{monthsNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                        <button id="calendar-next-btn" class="btn btn-outline" onClick={handleNextMonth}>&rarr;</button>
                    </div>
                    <div className="calendar-days-header">
                        <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                    </div>
                    <div className="calendar-grid" id="calendar-slots-grid">
                        {renderCalendarCells()}
                    </div>
                </div>

                {/* Distribution Charts */}
                <div className="card breakdown-card">
                    <h3>Distribution Analysis</h3>
                    <div className="breakdown-section">
                        <h4>Bookings by Staff Members</h4>
                        <div className="chart-bars" id="doctor-bar-chart">
                            {renderDoctorBars()}
                        </div>
                    </div>
                    <div className="breakdown-section">
                        <h4>Appointment Priorities</h4>
                        <div className="priority-visual" id="priority-progress-bar">
                            <div className="progress-bar-container">
                                <div className="progress-fill normal-fill" style={{ width: `${normalPct}%` }}></div>
                                <div className="progress-fill high-fill" style={{ width: `${highPct}%` }}></div>
                            </div>
                            <div className="legend">
                                <span><span className="dot normal"></span> Normal Priority ({normalPriorityCount})</span>
                                <span><span class="dot high"></span> High Priority ({highPriorityCount})</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
