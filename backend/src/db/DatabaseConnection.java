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
        // 1. Fallback defaults
        config.put("PORT", "8080");
        config.put("DB_URL", "jdbc:mysql://localhost:3306/appointment_agent?useSSL=false&serverTimezone=UTC");
        config.put("DB_USER", "root");
        config.put("DB_PASSWORD", "");
        config.put("GROQ_API_KEY", "");
        config.put("GROQ_MODEL", "llama-3.3-70b-versatile");

        // 2. Read local .env file if it exists
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
            System.out.println("[DatabaseConnection] Loaded environment variables from local .env file.");
        } catch (IOException e) {
            // Quietly ignore in production Docker containers where .env is absent
        }

        // 3. Override keys using system environment variables (highest priority)
        String[] keysToCheck = {"PORT", "DB_URL", "DB_USER", "DB_PASSWORD", "GROQ_API_KEY", "GROQ_MODEL"};
        for (String key : keysToCheck) {
            String envVal = System.getenv(key);
            if (envVal != null && !envVal.isEmpty()) {
                config.put(key, envVal);
            }
        }

        // 4. Detect Railway default MySQL environment variables if DB_URL is not set or is pointing to localhost
        String dbUrl = config.get("DB_URL");
        if (dbUrl.contains("localhost") || dbUrl.isEmpty()) {
            String mysqlHost = System.getenv("MYSQLHOST");
            String mysqlPort = System.getenv("MYSQLPORT");
            String mysqlUser = System.getenv("MYSQLUSER");
            String mysqlPassword = System.getenv("MYSQLPASSWORD");
            String mysqlDatabase = System.getenv("MYSQLDATABASE");

            if (mysqlHost != null && !mysqlHost.isEmpty()) {
                String port = (mysqlPort != null && !mysqlPort.isEmpty()) ? mysqlPort : "3306";
                String dbName = (mysqlDatabase != null && !mysqlDatabase.isEmpty()) ? mysqlDatabase : "railway";
                String url = "jdbc:mysql://" + mysqlHost + ":" + port + "/" + dbName + "?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
                config.put("DB_URL", url);
                
                if (mysqlUser != null && !mysqlUser.isEmpty()) {
                    config.put("DB_USER", mysqlUser);
                }
                if (mysqlPassword != null && !mysqlPassword.isEmpty()) {
                    config.put("DB_PASSWORD", mysqlPassword);
                }
                System.out.println("[DatabaseConnection] Railway MySQL database detected. Dynamic JDBC URL: " + url);
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
        try {
            return DriverManager.getConnection(url, user, password);
        } catch (SQLException e) {
            System.err.println("[DatabaseConnection] CRITICAL ERROR: Failed to connect to MySQL database at: " + url + " (User: " + user + ")");
            System.err.println("[DatabaseConnection] Error details: " + e.getMessage());
            throw e;
        }
    }
}
