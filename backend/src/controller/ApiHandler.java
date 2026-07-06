package controller;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonArray;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import service.AppointmentService;
import service.LlmService;
import service.PatientService;
import model.Patient;
import model.MedicalRecord;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.Base64;

public class ApiHandler implements HttpHandler {

    private final AppointmentService appointmentService;
    private final LlmService llmService;
    private final PatientService patientService;
    private final Gson gson;

    public ApiHandler() {
        this.appointmentService = new AppointmentService();
        this.llmService = new LlmService();
        this.patientService = new PatientService();
        this.gson = new Gson();
    }

    @Override
    public void handle(HttpExchange exchange) throws IOException {
        String method = exchange.getRequestMethod();
        String path = exchange.getRequestURI().getPath();

        System.out.println("[HTTP SERVER] Request: " + method + " " + path);

        // CORS Headers
        exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");

        if ("OPTIONS".equalsIgnoreCase(method)) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        try {
            if (path.startsWith("/api/")) {
                handleApiRequest(exchange, method, path);
            } else {
                handleStaticFileRequest(exchange, path);
            }
        } catch (Exception e) {
            e.printStackTrace();
            sendError(exchange, 500, "Internal Server Error: " + e.getMessage());
        }
    }

    private void handleApiRequest(HttpExchange exchange, String method, String path) throws IOException {
        if ("/api/chat".equals(path) && "POST".equalsIgnoreCase(method)) {
            // Read chat history payload
            String requestBody = readRequestBody(exchange);
            System.out.println("[API /api/chat] Received history length: " + requestBody.length());
            
            // Execute agentic loop
            String responseJson = llmService.chat(requestBody);
            
            sendJsonResponse(exchange, 200, responseJson);
        } else if ("/api/debug-db".equals(path) && "GET".equalsIgnoreCase(method)) {
            JsonObject debugObj = new JsonObject();
            JsonArray envKeys = new JsonArray();
            for (String key : System.getenv().keySet()) {
                envKeys.add(key);
            }
            debugObj.add("envKeys", envKeys);
            
            String mysqlUrl = System.getenv("MYSQL_URL");
            if (mysqlUrl != null) {
                int atIdx = mysqlUrl.lastIndexOf('@');
                if (atIdx > 0) {
                    int colonIdx = mysqlUrl.indexOf(':', 8);
                    if (colonIdx > 0 && colonIdx < atIdx) {
                        debugObj.addProperty("rawMysqlUrlMasked", mysqlUrl.substring(0, colonIdx) + ":***" + mysqlUrl.substring(atIdx));
                    } else {
                        debugObj.addProperty("rawMysqlUrlMasked", "present_but_unparseable_creds");
                    }
                } else {
                    // Safe to show raw because there is no @ symbol (no embedded username/password)
                    debugObj.addProperty("rawMysqlUrlMasked", mysqlUrl);
                }
            } else {
                debugObj.addProperty("rawMysqlUrlMasked", "null");
            }
            
            debugObj.addProperty("resolvedDbUrl", db.DatabaseConnection.get("DB_URL"));
            debugObj.addProperty("resolvedDbUser", db.DatabaseConnection.get("DB_USER"));
            
            if (mysqlUrl != null && !mysqlUrl.isEmpty()) {
                try {
                    String cleanUrl = mysqlUrl;
                    if (cleanUrl.startsWith("mysql://")) {
                        cleanUrl = cleanUrl.substring(8);
                    } else if (cleanUrl.startsWith("jdbc:mysql://")) {
                        cleanUrl = cleanUrl.substring(13);
                    }
                    
                    String hostPart = cleanUrl;
                    int atIdx = cleanUrl.lastIndexOf('@');
                    debugObj.addProperty("testParseAtIdx", atIdx);
                    
                    if (atIdx > 0) {
                        hostPart = cleanUrl.substring(atIdx + 1);
                    }
                    
                    int slashIdx = hostPart.indexOf('/');
                    debugObj.addProperty("testParseSlashIdx", slashIdx);
                    if (slashIdx > 0) {
                        String hostPort = hostPart.substring(0, slashIdx);
                        String dbName = hostPart.substring(slashIdx + 1);
                        int qIdx = dbName.indexOf('?');
                        if (qIdx > 0) {
                            dbName = dbName.substring(0, qIdx);
                        }
                        String host = hostPort;
                        String port = "3306";
                        int hostColonIdx = hostPort.indexOf(':');
                        if (hostColonIdx > 0) {
                            host = hostPort.substring(0, hostColonIdx);
                            port = hostPort.substring(hostColonIdx + 1);
                        }
                        String jdbcUrl = "jdbc:mysql://" + host + ":" + port + "/" + dbName + "?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
                        debugObj.addProperty("testParseJdbcUrlResult", jdbcUrl);
                    }
                } catch (Exception e) {
                    debugObj.addProperty("testParseException", e.getMessage());
                }
            }
            
            try (java.sql.Connection conn = db.DatabaseConnection.getConnection()) {
                debugObj.addProperty("dbConnected", true);
                debugObj.addProperty("dbMetadata", conn.getMetaData().getDatabaseProductVersion());
            } catch (Exception e) {
                debugObj.addProperty("dbConnected", false);
                debugObj.addProperty("connectionError", e.getMessage());
                StringWriter sw = new StringWriter();
                e.printStackTrace(new PrintWriter(sw));
                debugObj.addProperty("connectionStackTrace", sw.toString());
            }
            sendJsonResponse(exchange, 200, gson.toJson(debugObj));
        } else if ("/api/appointments".equals(path) && "GET".equalsIgnoreCase(method)) {
            // Fetch list of appointments
            String json = gson.toJson(appointmentService.getAllAppointments());
            sendJsonResponse(exchange, 200, json);
        } else if ("/api/analytics".equals(path) && "GET".equalsIgnoreCase(method)) {
            // Fetch statistics
            String json = appointmentService.getAnalyticsJson();
            sendJsonResponse(exchange, 200, json);
        } else if ("/api/patients".equals(path) && "GET".equalsIgnoreCase(method)) {
            String query = exchange.getRequestURI().getQuery();
            String email = getQueryParam(query, "email");
            if (email == null) {
                sendError(exchange, 400, "Missing required query parameter: email");
                return;
            }
            Patient patient = patientService.getPatientByEmail(email);
            if (patient == null) {
                sendJsonResponse(exchange, 404, "{\"message\":\"Patient not found\"}");
            } else {
                sendJsonResponse(exchange, 200, gson.toJson(patient));
            }
        } else if ("/api/medical-records".equals(path) && "GET".equalsIgnoreCase(method)) {
            String query = exchange.getRequestURI().getQuery();
            String pIdStr = getQueryParam(query, "patientId");
            if (pIdStr == null) {
                sendError(exchange, 400, "Missing required query parameter: patientId");
                return;
            }
            int patientId = Integer.parseInt(pIdStr);
            List<MedicalRecord> records = patientService.getMedicalRecords(patientId);
            sendJsonResponse(exchange, 200, gson.toJson(records));
        } else if ("/api/medical-records/upload".equals(path) && "POST".equalsIgnoreCase(method)) {
            String body = readRequestBody(exchange);
            JsonObject json = JsonParser.parseString(body).getAsJsonObject();
            int patientId = json.get("patientId").getAsInt();
            String fileName = json.get("fileName").getAsString();
            String fileType = json.get("fileType").getAsString();
            String fileBase64 = json.get("fileBase64").getAsString();
            String remarks = json.has("remarks") ? json.get("remarks").getAsString() : "";

            byte[] fileBytes = Base64.getDecoder().decode(fileBase64);
            Path uploadDir = Paths.get("uploads", "medical_records");
            Files.createDirectories(uploadDir);

            String uniqueName = UUID.randomUUID().toString() + "_" + fileName;
            Path filePath = uploadDir.resolve(uniqueName);
            Files.write(filePath, fileBytes);

            int recordId = patientService.uploadMedicalRecord(patientId, fileName, fileType, filePath.toString(), remarks);
            if (recordId > 0) {
                sendJsonResponse(exchange, 200, "{\"success\":true,\"recordId\":" + recordId + "}");
            } else {
                sendError(exchange, 500, "Failed to log medical record in database");
            }
        } else if ("/api/medical-records/download".equals(path) && "GET".equalsIgnoreCase(method)) {
            String query = exchange.getRequestURI().getQuery();
            String rIdStr = getQueryParam(query, "recordId");
            if (rIdStr == null) {
                sendError(exchange, 400, "Missing required query parameter: recordId");
                return;
            }
            int recordId = Integer.parseInt(rIdStr);
            MedicalRecord record = patientService.getMedicalRecordById(recordId);
            if (record == null) {
                sendError(exchange, 404, "Record not found");
                return;
            }
            Path pathFile = Paths.get(record.getFilePath());
            if (!Files.exists(pathFile)) {
                sendError(exchange, 404, "File does not exist on disk");
                return;
            }
            byte[] fileBytes = Files.readAllBytes(pathFile);
            exchange.getResponseHeaders().add("Content-Type", record.getFileType());
            exchange.getResponseHeaders().add("Content-Disposition", "attachment; filename=\"" + record.getFileName() + "\"");
            exchange.sendResponseHeaders(200, fileBytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(fileBytes);
            }
        } else {
            sendError(exchange, 404, "API endpoint not found");
        }
    }

    private void handleStaticFileRequest(HttpExchange exchange, String path) throws IOException {
        // Default root to index.html
        if ("/".equals(path)) {
            path = "/index.html";
        }

        // Keep it safe, don't allow directory traversal
        if (path.contains("..")) {
            sendError(exchange, 403, "Forbidden");
            return;
        }

        Path filePath = Paths.get("public" + path);
        if (!Files.exists(filePath) || Files.isDirectory(filePath)) {
            sendError(exchange, 404, "File Not Found: " + path);
            return;
        }

        // Guess Content-Type
        String contentType = guessContentType(path);
        exchange.getResponseHeaders().add("Content-Type", contentType);

        byte[] fileBytes = Files.readAllBytes(filePath);
        exchange.sendResponseHeaders(200, fileBytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(fileBytes);
        }
    }

    private String guessContentType(String path) {
        if (path.endsWith(".html")) return "text/html; charset=utf-8";
        if (path.endsWith(".css")) return "text/css; charset=utf-8";
        if (path.endsWith(".js")) return "application/javascript; charset=utf-8";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".ico")) return "image/x-icon";
        return "application/octet-stream";
    }

    private String readRequestBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody();
             BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        }
    }

    private void sendJsonResponse(HttpExchange exchange, int status, String jsonResponse) throws IOException {
        byte[] responseBytes = jsonResponse.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, responseBytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(responseBytes);
        }
    }

    private void sendError(HttpExchange exchange, int status, String message) throws IOException {
        String json = "{\"error\":\"" + message.replace("\"", "\\\"") + "\"}";
        sendJsonResponse(exchange, status, json);
    }

    private String getQueryParam(String query, String name) {
        if (query == null || name == null) return null;
        String[] pairs = query.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf("=");
            if (idx > 0) {
                String key = pair.substring(0, idx);
                String val = pair.substring(idx + 1);
                if (name.equalsIgnoreCase(key)) {
                    try {
                        return java.net.URLDecoder.decode(val, StandardCharsets.UTF_8.toString());
                    } catch (UnsupportedEncodingException e) {
                        return val;
                    }
                }
            }
        }
        return null;
    }
}
