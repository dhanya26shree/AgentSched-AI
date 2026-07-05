package service;

import db.DatabaseConnection;
import model.Appointment;

import java.sql.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

public class AppointmentService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm[:ss]");

    /**
     * Checks if a specific slot is available for a given doctor.
     * If doctorName is null or empty, defaults to "General Practitioner".
     */
    public String checkAvailability(String dateStr, String timeStr, String doctorName) {
        if (doctorName == null || doctorName.trim().isEmpty()) {
            doctorName = "General Practitioner";
        }
        
        LocalDate date;
        LocalTime time;
        try {
            date = LocalDate.parse(dateStr, DATE_FORMATTER);
            time = parseTime(timeStr);
        } catch (DateTimeParseException e) {
            return "Error: Invalid date format (" + dateStr + ") or time format (" + timeStr + "). Please use YYYY-MM-DD and HH:MM.";
        }

        // Check if date is in the past
        if (date.isBefore(LocalDate.now())) {
            return "Unavailable: The date " + dateStr + " is in the past. Appointments can only be booked for today or future dates.";
        }

        boolean available = isSlotAvailable(date, time, doctorName, -1);
        if (available) {
            return "Available: The slot at " + timeStr + " on " + dateStr + " is available for Dr. " + doctorName + ".";
        } else {
            return "Unavailable: The slot at " + timeStr + " on " + dateStr + " is already booked for Dr. " + doctorName + ".";
        }
    }

    /**
     * Books a new appointment in the database.
     */
    public String bookAppointment(String patientName, String phoneNumber, String email, 
                                  String dateStr, String timeStr, String purpose, 
                                  String doctorName, String priority) {
        if (patientName == null || patientName.trim().isEmpty()) {
            return "Error: Patient name is required.";
        }
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) {
            return "Error: Phone number is required.";
        }
        if (email == null || email.trim().isEmpty()) {
            return "Error: Email is required.";
        }
        if (doctorName == null || doctorName.trim().isEmpty()) {
            doctorName = "General Practitioner";
        }
        if (priority == null || priority.trim().isEmpty()) {
            priority = "NORMAL";
        }

        LocalDate date;
        LocalTime time;
        try {
            date = LocalDate.parse(dateStr, DATE_FORMATTER);
            time = parseTime(timeStr);
        } catch (DateTimeParseException e) {
            return "Error: Invalid date format (" + dateStr + ") or time format (" + timeStr + "). Please use YYYY-MM-DD and HH:MM.";
        }

        // Validate past dates
        if (date.isBefore(LocalDate.now())) {
            return "Error: Cannot book an appointment in the past. Date requested: " + dateStr;
        }

        // Check availability
        if (!isSlotAvailable(date, time, doctorName, -1)) {
            List<String> alternatives = getAlternativeSlots(date, time, doctorName);
            return "Conflict: The slot at " + timeStr + " on " + dateStr + " is already booked for Dr. " + doctorName + 
                   ". Here are some nearby available slots: " + String.join(", ", alternatives);
        }

        String sql = "INSERT INTO appointments (patient_name, phone_number, email, appointment_date, appointment_time, purpose, status, doctor_name, priority) " +
                     "VALUES (?, ?, ?, ?, ?, ?, 'BOOKED', ?, ?)";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            
            stmt.setString(1, patientName);
            stmt.setString(2, phoneNumber);
            stmt.setString(3, email);
            stmt.setDate(4, Date.valueOf(date));
            stmt.setTime(5, Time.valueOf(time));
            stmt.setString(6, purpose);
            stmt.setString(7, doctorName);
            stmt.setString(8, priority);

            int affectedRows = stmt.executeUpdate();
            if (affectedRows > 0) {
                try (ResultSet generatedKeys = stmt.getGeneratedKeys()) {
                    if (generatedKeys.next()) {
                        int id = generatedKeys.getInt(1);
                        sendMockNotifications(patientName, phoneNumber, email, dateStr, timeStr, doctorName, "BOOKED");
                        return "Success: Appointment booked successfully! Appointment ID: " + id + 
                               ", Patient: " + patientName + ", Doctor: Dr. " + doctorName + 
                               ", Slot: " + dateStr + " at " + timeStr + ".";
                    }
                }
            }
            return "Error: Failed to create appointment in database.";
        } catch (SQLException e) {
            e.printStackTrace();
            return "Error: Database error occurred: " + e.getMessage();
        }
    }

    /**
     * Reschedules an existing appointment.
     */
    public String rescheduleAppointment(int appointmentId, String newDateStr, String newTimeStr) {
        LocalDate newDate;
        LocalTime newTime;
        try {
            newDate = LocalDate.parse(newDateStr, DATE_FORMATTER);
            newTime = parseTime(newTimeStr);
        } catch (DateTimeParseException e) {
            return "Error: Invalid date format (" + newDateStr + ") or time format (" + newTimeStr + "). Please use YYYY-MM-DD and HH:MM.";
        }

        // Validate past dates
        if (newDate.isBefore(LocalDate.now())) {
            return "Error: Cannot reschedule to a past date: " + newDateStr;
        }

        // Retrieve the current appointment details
        Appointment appt = getAppointmentById(appointmentId);
        if (appt == null) {
            return "Error: Appointment not found with ID: " + appointmentId;
        }

        if (appt.getStatus().equals("CANCELLED")) {
            return "Error: Cannot reschedule a cancelled appointment. Please book a new one instead.";
        }

        // Check if the slot is available (ignoring current appointment ID in slot checks)
        if (!isSlotAvailable(newDate, newTime, appt.getDoctorName(), appointmentId)) {
            List<String> alternatives = getAlternativeSlots(newDate, newTime, appt.getDoctorName());
            return "Conflict: The slot at " + newTimeStr + " on " + newDateStr + " is already booked for Dr. " + appt.getDoctorName() + 
                   ". Nearby alternatives for Dr. " + appt.getDoctorName() + ": " + String.join(", ", alternatives);
        }

        String sql = "UPDATE appointments SET appointment_date = ?, appointment_time = ?, status = 'RESCHEDULED' WHERE appointment_id = ?";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setDate(1, Date.valueOf(newDate));
            stmt.setTime(2, Time.valueOf(newTime));
            stmt.setInt(3, appointmentId);

            int affectedRows = stmt.executeUpdate();
            if (affectedRows > 0) {
                sendMockNotifications(appt.getPatientName(), appt.getPhoneNumber(), appt.getEmail(), newDateStr, newTimeStr, appt.getDoctorName(), "RESCHEDULED");
                return "Success: Appointment " + appointmentId + " successfully rescheduled to " + newDateStr + " at " + newTimeStr + ".";
            }
            return "Error: Failed to update appointment in database.";
        } catch (SQLException e) {
            e.printStackTrace();
            return "Error: Database error occurred: " + e.getMessage();
        }
    }

    /**
     * Cancels an appointment.
     */
    public String cancelAppointment(int appointmentId) {
        Appointment appt = getAppointmentById(appointmentId);
        if (appt == null) {
            return "Error: Appointment not found with ID: " + appointmentId;
        }

        if (appt.getStatus().equals("CANCELLED")) {
            return "Info: Appointment " + appointmentId + " is already cancelled.";
        }

        String sql = "UPDATE appointments SET status = 'CANCELLED' WHERE appointment_id = ?";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, appointmentId);

            int affectedRows = stmt.executeUpdate();
            if (affectedRows > 0) {
                sendMockNotifications(appt.getPatientName(), appt.getPhoneNumber(), appt.getEmail(), 
                                       appt.getAppointmentDate().toString(), appt.getAppointmentTime().toString(), 
                                       appt.getDoctorName(), "CANCELLED");
                return "Success: Appointment " + appointmentId + " has been successfully cancelled.";
            }
            return "Error: Failed to cancel appointment.";
        } catch (SQLException e) {
            e.printStackTrace();
            return "Error: Database error occurred: " + e.getMessage();
        }
    }

    /**
     * Suggests alternative slots around a given time for a specific doctor.
     */
    public String findAlternativeSlots(String dateStr, String timeStr, String doctorName) {
        if (doctorName == null || doctorName.trim().isEmpty()) {
            doctorName = "General Practitioner";
        }

        LocalDate date;
        LocalTime time;
        try {
            date = LocalDate.parse(dateStr, DATE_FORMATTER);
            time = parseTime(timeStr);
        } catch (DateTimeParseException e) {
            return "Error: Invalid date format (" + dateStr + ") or time format (" + timeStr + "). Please use YYYY-MM-DD and HH:MM.";
        }

        List<String> slots = getAlternativeSlots(date, time, doctorName);
        if (slots.isEmpty()) {
            return "No alternative slots available for Dr. " + doctorName + " on " + dateStr + " during standard business hours.";
        }
        return "Suggested alternative slots for Dr. " + doctorName + " on " + dateStr + ": " + String.join(", ", slots);
    }

    /**
     * Lists all appointments (upcoming first).
     */
    public List<Appointment> getAllAppointments() {
        List<Appointment> list = new ArrayList<>();
        String sql = "SELECT * FROM appointments ORDER BY appointment_date ASC, appointment_time ASC";

        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            while (rs.next()) {
                list.add(mapResultSetToAppointment(rs));
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return list;
    }

    /**
     * Checks if a slot is available (ignoring a specific appointment ID to allow rescheduling checks).
     */
    private boolean isSlotAvailable(LocalDate date, LocalTime time, String doctorName, int ignoreId) {
        String sql = "SELECT COUNT(*) FROM appointments WHERE appointment_date = ? AND appointment_time = ? " +
                     "AND doctor_name = ? AND status != 'CANCELLED' AND appointment_id != ?";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setDate(1, Date.valueOf(date));
            stmt.setTime(2, Time.valueOf(time));
            stmt.setString(3, doctorName);
            stmt.setInt(4, ignoreId);

            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return rs.getInt(1) == 0;
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return false;
    }

    /**
     * Finds 3-4 alternative slots on the same day during business hours (9 AM - 5 PM).
     */
    private List<String> getAlternativeSlots(LocalDate date, LocalTime requestedTime, String doctorName) {
        List<String> alternatives = new ArrayList<>();
        
        // Define operational hours: 09:00 to 17:00 (5:00 PM) at 30 min intervals
        LocalTime start = LocalTime.of(9, 0);
        LocalTime end = LocalTime.of(17, 0);
        
        // Find available slots
        LocalTime current = start;
        while (!current.isAfter(end)) {
            // Check if slot is available
            if (isSlotAvailable(date, current, doctorName, -1)) {
                // If it is in the past for today, skip it
                if (date.equals(LocalDate.now()) && current.isBefore(LocalTime.now())) {
                    current = current.plusMinutes(30);
                    continue;
                }
                alternatives.add(current.toString());
            }
            current = current.plusMinutes(30);
        }

        // Filter to get closest slots to requestedTime
        if (alternatives.size() > 4) {
            alternatives.sort((s1, s2) -> {
                LocalTime t1 = LocalTime.parse(s1);
                LocalTime t2 = LocalTime.parse(s2);
                long diff1 = Math.abs(java.time.Duration.between(requestedTime, t1).toMinutes());
                long diff2 = Math.abs(java.time.Duration.between(requestedTime, t2).toMinutes());
                return Long.compare(diff1, diff2);
            });
            return alternatives.subList(0, 4);
        }
        
        return alternatives;
    }

    public Appointment getAppointmentById(int id) {
        String sql = "SELECT * FROM appointments WHERE appointment_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, id);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToAppointment(rs);
                }
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
        return null;
    }

    private Appointment mapResultSetToAppointment(ResultSet rs) throws SQLException {
        return new Appointment(
            rs.getInt("appointment_id"),
            rs.getString("patient_name"),
            rs.getString("phone_number"),
            rs.getString("email"),
            rs.getString("appointment_date"),
            rs.getString("appointment_time"),
            rs.getString("purpose"),
            rs.getString("status"),
            rs.getString("doctor_name"),
            rs.getString("priority"),
            rs.getTimestamp("created_at")
        );
    }

    /**
     * Custom parsing for HH:mm / HH:mm:ss formats.
     */
    private LocalTime parseTime(String timeStr) {
        // Strip seconds if format contains it, normalize to HH:mm
        if (timeStr.length() > 5) {
            timeStr = timeStr.substring(0, 5);
        }
        return LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"));
    }

    /**
     * Mocks Email and SMS Confirmations
     */
    private void sendMockNotifications(String patientName, String phone, String email, 
                                        String date, String time, String doctorName, String status) {
        System.out.println("=================================================");
        System.out.println("[MOCK EMAIL SENT] To: " + email);
        System.out.println("Subject: Appointment " + status + " - AgentSched AI");
        System.out.println("Dear " + patientName + ", your appointment with Dr. " + doctorName + 
                           " on " + date + " at " + time + " is " + status + ".");
        System.out.println("-------------------------------------------------");
        System.out.println("[MOCK SMS SENT] To: " + phone);
        System.out.println("AgentSched: Appointment with Dr. " + doctorName + " on " + date + " at " + time + " is now " + status + ".");
        System.out.println("=================================================");
    }

    /**
     * Aggregates statistics for the dashboard analytics.
     */
    public String getAnalyticsJson() {
        com.google.gson.JsonObject analytics = new com.google.gson.JsonObject();
        
        int totalActive = 0;
        int totalCancelled = 0;
        com.google.gson.JsonObject statusMap = new com.google.gson.JsonObject();
        com.google.gson.JsonObject doctorMap = new com.google.gson.JsonObject();
        com.google.gson.JsonObject priorityMap = new com.google.gson.JsonObject();
        
        String sqlStatus = "SELECT status, COUNT(*) as cnt FROM appointments GROUP BY status";
        String sqlDoctor = "SELECT doctor_name, COUNT(*) as cnt FROM appointments WHERE status != 'CANCELLED' GROUP BY doctor_name";
        String sqlPriority = "SELECT priority, COUNT(*) as cnt FROM appointments WHERE status != 'CANCELLED' GROUP BY priority";

        try (Connection conn = DatabaseConnection.getConnection()) {
            // Get Status breakdown
            try (PreparedStatement stmt = conn.prepareStatement(sqlStatus);
                 ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    String status = rs.getString("status");
                    int cnt = rs.getInt("cnt");
                    statusMap.addProperty(status, cnt);
                    if ("CANCELLED".equals(status)) {
                        totalCancelled += cnt;
                    } else {
                        totalActive += cnt;
                    }
                }
            }
            
            // Get Doctor breakdown
            try (PreparedStatement stmt = conn.prepareStatement(sqlDoctor);
                 ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    doctorMap.addProperty(rs.getString("doctor_name"), rs.getInt("cnt"));
                }
            }
            
            // Get Priority breakdown
            try (PreparedStatement stmt = conn.prepareStatement(sqlPriority);
                 ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    priorityMap.addProperty(rs.getString("priority"), rs.getInt("cnt"));
                }
            }
            
        } catch (SQLException e) {
            e.printStackTrace();
        }
        
        analytics.addProperty("totalActiveAppointments", totalActive);
        analytics.addProperty("totalCancelledAppointments", totalCancelled);
        analytics.add("statusBreakdown", statusMap);
        analytics.add("doctorBreakdown", doctorMap);
        analytics.add("priorityBreakdown", priorityMap);
        
        return new com.google.gson.Gson().toJson(analytics);
    }
}
