# AgentSched AI - Intelligent Agentic AI Appointment Scheduling Assistant

**AgentSched AI** is a complete, intelligent, agent-driven appointment scheduling assistant. Rather than functioning like a rigid chatbot, it utilizes **Google Gemini** with native **Function Calling** to reason, plan, and autonomously coordinate scheduling operations against a backend Java layer and MySQL database.

---

## 🚀 Key Features

1. **Agentic Conversational Control**: Users speak naturally (e.g., *"Move my booking to next Tuesday afternoon"*). The agent decides which Java tools to execute, processes the outputs, and continues its reasoning loop.
2. **Automated Conflict Resolution**: If a requested slot is occupied, the assistant automatically invokes the backend alternative slot finder and proposes nearby available options (30-minute intervals).
3. **Analytics Dashboard**: Aggregated appointment graphs (active counts, cancellation logs, doctor distributions, priority ratios).
4. **Mock Alerts**: Real-time mock console updates for Email and SMS confirmations when appointments are booked, rescheduled, or cancelled.
5. **Multi-Staff Support**: Supports scheduling with specific doctors: Dr. Smith (Cardiologist), Dr. Patel (Dentist), Dr. Adams (Pediatrician), or the General Practitioner (default).

---

## 🛠️ Tech Stack & Constraints

- **Frontend**: Single-Page App (HTML5, Vanilla CSS3, Javascript ES6). Responsive, sleek dark-mode healthcare aesthetics.
- **Backend**: Core Java 17. Built utilizing Java's lightweight `com.sun.net.httpserver.HttpServer`.
- **Database**: MySQL with pure JDBC integration (no ORM or heavy database frameworks).
- **AI Core**: Google Gemini API via HTTP Client.
- **Constraints Met**: Zero Spring Boot, zero Maven/Gradle build configurations, zero Docker/Kubernetes containerization.

---

## 📂 Project Directory Structure

```
e:\AgentSched AI\
├── lib/                             # Compiled Java dependencies (Auto-downloaded)
│   ├── mysql-connector-j-8.4.0.jar  # MySQL JDBC Driver
│   └── gson-2.11.0.jar              # JSON serialization helper
├── src/                             # Backend Java codebase
│   ├── Main.java                    # Entry point; sets up HTTP routing
│   ├── db/
│   │   └── DatabaseConnection.java  # Connection manager and env loader
│   ├── model/
│   │   └── Appointment.java         # Entity representation class
│   ├── service/
│   │   ├── AppointmentService.java  # The Java Tool Layer (DB CRUD & Logic)
│   │   └── GeminiService.java       # AI Agent Reasoning Loop & tool caller
│   └── controller/
│       └── ApiHandler.java          # REST API controller & static file server
├── public/                          # Web UI assets
│   ├── index.html                   # HTML interface
│   ├── css/
│   │   └── styles.css               # Theme and styling rules
│   └── js/
│       └── app.js                   # State, API integrations, calendar & charts
├── schema.sql                       # Database initialization scripts
├── .env                             # Environment configuration parameters
├── run.bat                          # Build and run execution batch file
└── README.md                        # Documentation
```

---

## ⚙️ Setup and Installation

### 1. Database Setup
Create the MySQL database and table using the provided schema.
Open your MySQL client or Terminal and execute:
```sql
SOURCE schema.sql;
```
This initializes the database `appointment_agent` and table `appointments`.

### 2. Configuration Settings (`.env`)
Configure your database credentials and Gemini API Key in the `.env` file at the project root:
```ini
# HTTP Server Port
PORT=8080

# MySQL Database Configuration
DB_URL=jdbc:mysql://localhost:3306/appointment_agent?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password

# Gemini API Configuration
GEMINI_API_KEY=your_google_gemini_api_key
```
*Note: Make sure to get your Gemini API Key from [Google AI Studio](https://aistudio.google.com/).*

### 3. Build & Run
Double-click `run.bat` or run it from Command Prompt / PowerShell:
```cmd
.\run.bat
```
This batch file will:
1. Verify Java compilation tooling is set up (`javac`).
2. Compile all source files into the `bin/` output folder with correct dependencies in the classpath.
3. Start the HTTP backend server.

---

## 💻 Usage

Once the server has started, navigate to:
👉 **[http://localhost:8080](http://localhost:8080)**

### Conversational Examples to Try:
- *"Is tomorrow at 2 PM available?"*
- *"Book an appointment tomorrow at 2 PM. My name is Alice, email alice@example.com, phone 555-0101."*
- Try booking a conflicting appointment at the same slot and watch the AI recommend alternatives:
  - *"Book an appointment tomorrow at 2 PM for Bob (bob@example.com, phone 555-0202)."* (The agent will automatically list nearby times).
- *"List all appointments."*
- *"Move my appointment with ID 1 to Tuesday at 10 AM."*
- *"Cancel appointment ID 1."*
