package db;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

public class DatabaseConnection {
    private static final Map<String, String> config = new HashMap<>();

    static {
        loadEnv();
        try {
            // Explicitly load MySQL JDBC Driver
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("MySQL Driver not found in classpath. Ensure mysql-connector-j jar is present.");
            e.printStackTrace();
        }
    }

    private static void loadEnv() {
        // Default fallbacks
        config.put("PORT", "8080");
        config.put("DB_URL", "jdbc:mysql://localhost:3306/appointment_agent?useSSL=false&serverTimezone=UTC");
        config.put("DB_USER", "root");
        config.put("DB_PASSWORD", "");
        config.put("GEMINI_API_KEY", "");
        config.put("GEMINI_MODEL", "gemini-2.5-flash");
        config.put("GROQ_API_KEY", "");
        config.put("GROQ_MODEL", "llama-3.3-70b-specdec");

        try (BufferedReader reader = new BufferedReader(new FileReader(".env"))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#")) {
                    continue;
                }
                int eqIdx = line.indexOf('=');
                if (eqIdx > 0) {
                    String key = line.substring(0, eqIdx).trim();
                    String val = line.substring(eqIdx + 1).trim();
                    config.put(key, val);
                }
            }
        } catch (IOException e) {
            System.out.println("No .env file found or couldn't be read. Using default configuration and system env variables.");
        }

        // Allow system properties or environment variables to override
        for (String key : config.keySet()) {
            String envVal = System.getenv(key);
            if (envVal != null && !envVal.isEmpty()) {
                config.put(key, envVal);
            }
        }
    }

    public static String get(String key) {
        return config.getOrDefault(key, "");
    }

    public static Connection getConnection() throws SQLException {
        String url = get("DB_URL");
        String user = get("DB_USER");
        String password = get("DB_PASSWORD");
        return DriverManager.getConnection(url, user, password);
    }
}
