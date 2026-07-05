import React from 'react';

export default function DashboardCard({ title, value, iconBg, children }) {
    return (
        <div className="card stat-card">
            <div className={`stat-icon ${iconBg}`}>
                {children}
            </div>
            <div className="stat-details">
                <h3>{value}</h3>
                <p>{title}</p>
            </div>
        </div>
    );
}
