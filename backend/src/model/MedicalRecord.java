package model;

public class MedicalRecord {
    private int recordId;
    private int patientId;
    private String fileName;
    private String fileType;
    private String filePath;
    private String remarks;
    private String uploadedAt;

    public MedicalRecord() {}

    public MedicalRecord(int recordId, int patientId, String fileName, String fileType, String filePath, String remarks, String uploadedAt) {
        this.recordId = recordId;
        this.patientId = patientId;
        this.fileName = fileName;
        this.fileType = fileType;
        this.filePath = filePath;
        this.remarks = remarks;
        this.uploadedAt = uploadedAt;
    }

    // Getters and Setters
    public int getRecordId() { return recordId; }
    public void setRecordId(int recordId) { this.recordId = recordId; }

    public int getPatientId() { return patientId; }
    public void setPatientId(int patientId) { this.patientId = patientId; }

    public String getFileName() { return fileName; }
    public void setFileName(String fileName) { this.fileName = fileName; }

    public String getFileType() { return fileType; }
    public void setFileType(String fileType) { this.fileType = fileType; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(String uploadedAt) { this.uploadedAt = uploadedAt; }
}
