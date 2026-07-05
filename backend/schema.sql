-- Schema for AgentSched AI - Appointment Scheduling Assistant

CREATE TABLE IF NOT EXISTS appointments (
    appointment_id INT AUTO_INCREMENT PRIMARY KEY,
    patient_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(100) NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    purpose VARCHAR(255) NULL,
    status VARCHAR(20) DEFAULT 'BOOKED', -- BOOKED, RESCHEDULED, CANCELLED
    doctor_name VARCHAR(100) DEFAULT 'General Practitioner', -- Bonus Feature: Doctor Selection
    priority VARCHAR(20) DEFAULT 'NORMAL', -- Bonus Feature: Priority Booking
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
