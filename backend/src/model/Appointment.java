package model;

import java.sql.Timestamp;

public class Appointment {
    private int appointmentId;
    private String patientName;
    private String phoneNumber;
    private String email;
    private String appointmentDate;
    private String appointmentTime;
    private String purpose;
    private String status;
    private String doctorName;
    private String priority;
    private Timestamp createdAt;

    // Constructors
    public Appointment() {}

    public Appointment(int appointmentId, String patientName, String phoneNumber, String email, 
                       String appointmentDate, String appointmentTime, String purpose, 
                       String status, String doctorName, String priority, Timestamp createdAt) {
        this.appointmentId = appointmentId;
        this.patientName = patientName;
        this.phoneNumber = phoneNumber;
        this.email = email;
        this.appointmentDate = appointmentDate;
        this.appointmentTime = appointmentTime;
        this.purpose = purpose;
        this.status = status;
        this.doctorName = doctorName;
        this.priority = priority;
        this.createdAt = createdAt;
    }

    // Getters and Setters
    public int getAppointmentId() { return appointmentId; }
    public void setAppointmentId(int appointmentId) { this.appointmentId = appointmentId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAppointmentDate() { return appointmentDate; }
    public void setAppointmentDate(String appointmentDate) { this.appointmentDate = appointmentDate; }

    public String getAppointmentTime() { return appointmentTime; }
    public void setAppointmentTime(String appointmentTime) { this.appointmentTime = appointmentTime; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getPriority() { return priority; }
    public void setPriority(String priority) { this.priority = priority; }

    public Timestamp getCreatedAt() { return createdAt; }
    public void setCreatedAt(Timestamp createdAt) { this.createdAt = createdAt; }

    @Override
    public String toString() {
        return "Appointment{" +
                "id=" + appointmentId +
                ", name='" + patientName + '\'' +
                ", date='" + appointmentDate + '\'' +
                ", time='" + appointmentTime + '\'' +
                ", doctor='" + doctorName + '\'' +
                ", status='" + status + '\'' +
                '}';
    }
}
