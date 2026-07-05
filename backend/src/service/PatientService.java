package service;

import db.DatabaseConnection;
import model.Patient;
import model.MedicalRecord;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class PatientService {

    public PatientService() {}

    /**
     * Creates a new patient profile. If the email already exists, returns the existing patient ID.
     */
    public int createPatient(Patient patient) {
        // First check if they already exist
        Patient existing = getPatientByEmail(patient.getEmail());
        if (existing != null) {
            return existing.getPatientId();
        }

        String sql = "INSERT INTO patients (full_name, phone_number, email, date_of_birth, gender, address) VALUES (?, ?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            
            stmt.setString(1, patient.getFullName());
            stmt.setString(2, patient.getPhoneNumber());
            stmt.setString(3, patient.getEmail());
            
            if (patient.getDateOfBirth() != null && !patient.getDateOfBirth().isEmpty()) {
                stmt.setDate(4, Date.valueOf(patient.getDateOfBirth()));
            } else {
                stmt.setNull(4, Types.DATE);
            }
            
            stmt.setString(5, patient.getGender());
            stmt.setString(6, patient.getAddress());

            stmt.executeUpdate();

            try (ResultSet rs = stmt.getGeneratedKeys()) {
                if (rs.next()) {
                    return rs.getInt(1);
                }
            }
        } catch (SQLException e) {
            System.err.println("Error creating patient profile: " + e.getMessage());
            e.printStackTrace();
        }
        return -1;
    }

    /**
     * Retrieve patient by email.
     */
    public Patient getPatientByEmail(String email) {
        String sql = "SELECT * FROM patients WHERE LOWER(email) = LOWER(?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setString(1, email.trim());
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToPatient(rs);
                }
            }
        } catch (SQLException e) {
            System.err.println("Error fetching patient by email: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }

    /**
     * Retrieve patient by ID.
     */
    public Patient getPatientById(int patientId) {
        String sql = "SELECT * FROM patients WHERE patient_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, patientId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToPatient(rs);
                }
            }
        } catch (SQLException e) {
            System.err.println("Error fetching patient by ID: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }

    /**
     * Registers a new medical file upload entry in the database.
     */
    public int uploadMedicalRecord(int patientId, String fileName, String fileType, String filePath, String remarks) {
        String sql = "INSERT INTO medical_records (patient_id, file_name, file_type, file_path, remarks) VALUES (?, ?, ?, ?, ?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            
            stmt.setInt(1, patientId);
            stmt.setString(2, fileName);
            stmt.setString(3, fileType);
            stmt.setString(4, filePath);
            stmt.setString(5, remarks);

            stmt.executeUpdate();

            try (ResultSet rs = stmt.getGeneratedKeys()) {
                if (rs.next()) {
                    return rs.getInt(1);
                }
            }
        } catch (SQLException e) {
            System.err.println("Error logging medical record: " + e.getMessage());
            e.printStackTrace();
        }
        return -1;
    }

    /**
     * Retrieves all medical records associated with a patient.
     */
    public List<MedicalRecord> getMedicalRecords(int patientId) {
        List<MedicalRecord> list = new ArrayList<>();
        String sql = "SELECT * FROM medical_records WHERE patient_id = ? ORDER BY uploaded_at DESC";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, patientId);
            try (ResultSet rs = stmt.executeQuery()) {
                while (rs.next()) {
                    list.add(mapResultSetToRecord(rs));
                }
            }
        } catch (SQLException e) {
            System.err.println("Error fetching medical records: " + e.getMessage());
            e.printStackTrace();
        }
        return list;
    }

    /**
     * Retrieves a single medical record entry by ID (for file downloads).
     */
    public MedicalRecord getMedicalRecordById(int recordId) {
        String sql = "SELECT * FROM medical_records WHERE record_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, recordId);
            try (ResultSet rs = stmt.executeQuery()) {
                if (rs.next()) {
                    return mapResultSetToRecord(rs);
                }
            }
        } catch (SQLException e) {
            System.err.println("Error fetching medical record by ID: " + e.getMessage());
            e.printStackTrace();
        }
        return null;
    }

    /**
     * Dynamically link an appointment to a patient ID.
     */
    public boolean linkAppointmentToPatient(int appointmentId, int patientId) {
        String sql = "UPDATE appointments SET patient_id = ? WHERE appointment_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement stmt = conn.prepareStatement(sql)) {
            
            stmt.setInt(1, patientId);
            stmt.setInt(2, appointmentId);
            return stmt.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("Error linking appointment to patient: " + e.getMessage());
            e.printStackTrace();
        }
        return false;
    }

    private Patient mapResultSetToPatient(ResultSet rs) throws SQLException {
        Date dob = rs.getDate("date_of_birth");
        String dobStr = dob != null ? dob.toString() : null;
        return new Patient(
            rs.getInt("patient_id"),
            rs.getString("full_name"),
            rs.getString("phone_number"),
            rs.getString("email"),
            dobStr,
            rs.getString("gender"),
            rs.getString("address"),
            rs.getTimestamp("created_at").toString()
        );
    }

    private MedicalRecord mapResultSetToRecord(ResultSet rs) throws SQLException {
        return new MedicalRecord(
            rs.getInt("record_id"),
            rs.getInt("patient_id"),
            rs.getString("file_name"),
            rs.getString("file_type"),
            rs.getString("file_path"),
            rs.getString("remarks"),
            rs.getTimestamp("uploaded_at").toString()
        );
    }
}
