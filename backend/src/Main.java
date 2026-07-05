import controller.ApiHandler;
import db.DatabaseConnection;

import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;

public class Main {

    public static void main(String[] args) {
        // Load configuration
        String portStr = DatabaseConnection.get("PORT");
        int port;
        try {
            port = Integer.parseInt(portStr);
        } catch (NumberFormatException e) {
            port = 8080;
        }

        System.out.println("=================================================");
        System.out.println("    Starting AgentSched AI Backend Server...     ");
        System.out.println("=================================================");
        
        try {
            // Initialize HttpServer on all interfaces
            HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
            
            // Map root and API paths to the unified ApiHandler
            server.createContext("/", new ApiHandler());
            
            server.setExecutor(null); // default executor
            server.start();
            
            System.out.println("Server is running and listening on port: " + port);
            System.out.println("Navigate to http://localhost:" + port + " to access AgentSched AI");
            System.out.println("Press Ctrl+C to terminate the server");
            System.out.println("=================================================");
            
        } catch (IOException e) {
            System.err.println("Failed to start HTTP server: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
