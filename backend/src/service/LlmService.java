package service;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import db.DatabaseConnection;
import model.Patient;
import model.MedicalRecord;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDate;
import java.util.Objects;
import java.util.List;

public class LlmService {

    private final AppointmentService appointmentService;
    private final PatientService patientService;
    private final HttpClient httpClient;
    private final Gson gson;

    public LlmService() {
        this.appointmentService = new AppointmentService();
        this.patientService = new PatientService();
        this.httpClient = HttpClient.newHttpClient();
        this.gson = new Gson();
    }

    /**
     * Executes the Agentic AI loop.
     * Takes the conversation history (as JSON array string) and returns the new model message.
     */
    public String chat(String chatHistoryJson) {
        String apiKey = DatabaseConnection.get("GROQ_API_KEY");
        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.equals("your_groq_api_key_here")) {
            return gson.toJson(createErrorMessage("Error: Groq API Key is not configured. Please set GROQ_API_KEY in your environment variables."));
        }

        String model = DatabaseConnection.get("GROQ_MODEL");
        if (model == null || model.trim().isEmpty() || model.contains("gemini")) {
            model = "llama-3.3-70b-versatile"; // Default to Groq high-quality reasoning model
        }
        System.out.println("[GROQ AI CHAT] Calling Groq API using model: '" + model + "'");

        try {
            // Translate the Gemini chat history format from frontend into OpenAI/Groq format
            JsonArray messages = convertHistoryToGroq(chatHistoryJson, getSystemInstructionText());
            
            // Build the agent reasoning loop (max 5 iterations)
            int iterations = 0;
            while (iterations < 5) {
                iterations++;
                
                // Build OpenAI-compatible request payload
                JsonObject payload = new JsonObject();
                payload.addProperty("model", model);
                payload.add("messages", messages);
                payload.add("tools", getGroqToolsDeclaration());
                payload.addProperty("temperature", 0.1); // Low temp for reliable function calling

                String requestBody = gson.toJson(payload);

                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create("https://api.groq.com/openai/v1/chat/completions"))
                        .header("Content-Type", "application/json")
                        .header("Authorization", "Bearer " + apiKey)
                        .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();

                HttpResponse<String> response = null;
                int retryCount = 0;
                while (retryCount < 4) {
                    response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                    if (response.statusCode() != 503 && response.statusCode() != 429) {
                        break;
                    }
                    retryCount++;
                    if (retryCount >= 4) {
                        break;
                    }
                    
                    // Default exponential backoff (starting at 3s, then 5s, then 9s)
                    long sleepMs = (long) (Math.pow(2, retryCount) * 2000) + 1000;
                    
                    if (response.statusCode() == 429) {
                        // Try to parse the Retry-After header (in seconds) or check response body
                        String retryAfterHeader = response.headers().firstValue("retry-after").orElse(null);
                        if (retryAfterHeader != null) {
                            try {
                                double seconds = Double.parseDouble(retryAfterHeader);
                                sleepMs = (long) (seconds * 1000) + 500; // Add 500ms safety buffer
                                System.out.println("[GROQ API] Rate limited. Retry-After header says wait: " + seconds + "s. Sleeping for " + sleepMs + "ms...");
                            } catch (NumberFormatException ignored) {}
                        } else {
                            // Fallback: parse wait time from JSON body message if present
                            String body = response.body();
                            if (body != null && body.contains("Please try again in ")) {
                                int idx = body.indexOf("Please try again in ");
                                int endIdx = body.indexOf("s", idx + "Please try again in ".length());
                                if (idx != -1 && endIdx != -1) {
                                    try {
                                        String secStr = body.substring(idx + "Please try again in ".length(), endIdx).trim();
                                        double seconds = Double.parseDouble(secStr);
                                        sleepMs = (long) (seconds * 1000) + 1000; // Add 1s safety buffer
                                        System.out.println("[GROQ API] Rate limited. Parsed from body to wait: " + seconds + "s. Sleeping for " + sleepMs + "ms...");
                                    } catch (Exception ignored) {}
                                }
                            }
                        }
                    }
                    
                    System.out.println("[GROQ API] Received status code " + response.statusCode() + ". Retrying attempt " + retryCount + "/4 in " + (sleepMs / 1000.0) + " seconds...");
                    try {
                        Thread.sleep(sleepMs);
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                    }
                }

                if (response.statusCode() != 200) {
                    System.err.println("Groq API Error: " + response.statusCode() + " - " + response.body());
                    return gson.toJson(createErrorMessage("Error: Groq API returned status code " + response.statusCode() + ". Details: " + response.body()));
                }

                JsonObject responseJson = JsonParser.parseString(response.body()).getAsJsonObject();
                JsonArray choices = responseJson.getAsJsonArray("choices");
                if (choices == null || choices.isEmpty()) {
                    return gson.toJson(createErrorMessage("Error: Groq returned empty choices."));
                }

                JsonObject choice = choices.get(0).getAsJsonObject();
                JsonObject message = choice.getAsJsonObject("message");
                if (message == null) {
                    return gson.toJson(createErrorMessage("Error: Response message missing."));
                }

                // Check if the model requested any tool/function call
                if (message.has("tool_calls")) {
                    JsonArray toolCalls = message.getAsJsonArray("tool_calls");
                    if (toolCalls != null && !toolCalls.isEmpty()) {
                        JsonObject toolCall = toolCalls.get(0).getAsJsonObject();
                        String callId = toolCall.get("id").getAsString();
                        JsonObject function = toolCall.getAsJsonObject("function");
                        String functionName = function.get("name").getAsString();
                        
                        JsonObject args = new JsonObject();
                        if (function.has("arguments")) {
                            String argumentsStr = function.get("arguments").getAsString();
                            if (argumentsStr != null && !argumentsStr.trim().isEmpty()) {
                                try {
                                    args = JsonParser.parseString(argumentsStr).getAsJsonObject();
                                } catch (Exception e) {
                                    System.err.println("Failed to parse tool arguments: " + argumentsStr);
                                }
                            }
                        }

                        System.out.println("[GROQ AI AGENT] Tool call: " + functionName + " with args: " + args);

                        // Execute the backend Java function
                        String result = executeTool(functionName, args);

                        System.out.println("[GROQ AI AGENT] Result: " + result);

                        // Append assistant's tool call response to memory
                        messages.add(message);

                        // Append tool output response
                        JsonObject toolMsg = new JsonObject();
                        toolMsg.addProperty("role", "tool");
                        toolMsg.addProperty("tool_call_id", callId);
                        toolMsg.addProperty("content", result);
                        messages.add(toolMsg);

                        // Loop back to feed result into Llama
                        continue;
                    }
                }

                // If no tool call, it's a final reply text
                if (message.has("content") && !message.get("content").isJsonNull()) {
                    String finalReply = message.get("content").getAsString();
                    JsonObject finalMsg = new JsonObject();
                    finalMsg.addProperty("role", "model");
                    JsonArray finalParts = new JsonArray();
                    JsonObject textPart = new JsonObject();
                    textPart.addProperty("text", finalReply);
                    finalParts.add(textPart);
                    finalMsg.add("parts", finalParts);
                    return gson.toJson(finalMsg);
                }

                break;
            }

            return gson.toJson(createErrorMessage("Error: Maximum reasoning agent iterations exceeded."));
        } catch (IOException | InterruptedException e) {
            e.printStackTrace();
            return gson.toJson(createErrorMessage("Error: Network or thread interruption occurred: " + e.getMessage()));
        }
    }

    /**
     * Translates Gemini-format chatHistory (from frontend React) into standard OpenAI/Groq messages.
     * Prunes history to the last 8 messages to stay within the free tier's low TPM (Tokens Per Minute) limit.
     */
    private JsonArray convertHistoryToGroq(String chatHistoryJson, String systemInstruction) {
        JsonArray contents = JsonParser.parseString(chatHistoryJson).getAsJsonArray();
        JsonArray messages = new JsonArray();
        
        // 1. Add system prompt instruction
        JsonObject sysMsg = new JsonObject();
        sysMsg.addProperty("role", "system");
        sysMsg.addProperty("content", systemInstruction);
        messages.add(sysMsg);
        
        // 2. Map existing conversation history elements (limit to last 8 to optimize tokens)
        int startIndex = Math.max(0, contents.size() - 8);
        for (int i = startIndex; i < contents.size(); i++) {
            JsonObject item = contents.get(i).getAsJsonObject();
            String role = item.get("role").getAsString();
            
            String groqRole = "user";
            if ("model".equals(role)) {
                groqRole = "assistant";
            } else if ("system".equals(role)) {
                groqRole = "system";
            }
            
            JsonArray parts = item.getAsJsonArray("parts");
            if (parts != null && !parts.isEmpty()) {
                JsonObject firstPart = parts.get(0).getAsJsonObject();
                
                if (firstPart.has("text")) {
                    JsonObject msg = new JsonObject();
                    msg.addProperty("role", groqRole);
                    msg.addProperty("content", firstPart.get("text").getAsString());
                    messages.add(msg);
                } else if (firstPart.has("functionCall")) {
                    JsonObject msg = new JsonObject();
                    msg.addProperty("role", "assistant");
                    
                    JsonObject functionCall = firstPart.getAsJsonObject("functionCall");
                    String functionName = functionCall.get("name").getAsString();
                    JsonObject args = functionCall.getAsJsonObject("args");
                    
                    JsonArray toolCalls = new JsonArray();
                    JsonObject toolCall = new JsonObject();
                    toolCall.addProperty("id", "call_" + i);
                    toolCall.addProperty("type", "function");
                    
                    JsonObject functionObj = new JsonObject();
                    functionObj.addProperty("name", functionName);
                    functionObj.addProperty("arguments", args.toString());
                    
                    toolCall.add("function", functionObj);
                    toolCalls.add(toolCall);
                    
                    msg.add("tool_calls", toolCalls);
                    messages.add(msg);
                } else if (firstPart.has("functionResponse")) {
                    JsonObject msg = new JsonObject();
                    msg.addProperty("role", "tool");
                    msg.addProperty("tool_call_id", "call_" + (i - 1));
                    
                    JsonObject functionResponse = firstPart.getAsJsonObject("functionResponse");
                    JsonObject response = functionResponse.getAsJsonObject("response");
                    String result = response.get("result").getAsString();
                    
                    msg.addProperty("content", result);
                    messages.add(msg);
                }
            }
        }
        return messages;
    }

    /**
     * Maps Gemini function declarations into standard lowercase JSON schema format for Groq tools.
     */
    private JsonArray getGroqToolsDeclaration() {
        JsonArray geminiTools = getToolsDeclaration();
        JsonArray groqTools = new JsonArray();
        
        if (geminiTools.size() > 0) {
            JsonArray decls = geminiTools.get(0).getAsJsonObject().getAsJsonArray("functionDeclarations");
            for (int i = 0; i < decls.size(); i++) {
                JsonObject fnCopy = JsonParser.parseString(gson.toJson(decls.get(i))).getAsJsonObject();
                
                if (fnCopy.has("parameters")) {
                    JsonObject params = fnCopy.getAsJsonObject("parameters");
                    if (params.has("type")) {
                        params.addProperty("type", params.get("type").getAsString().toLowerCase());
                    }
                    if (params.has("properties")) {
                        JsonObject props = params.getAsJsonObject("properties");
                        for (String key : props.keySet()) {
                            JsonObject prop = props.getAsJsonObject(key);
                            if (prop.has("type")) {
                                prop.addProperty("type", prop.get("type").getAsString().toLowerCase());
                            }
                        }
                    }
                }
                
                JsonObject tool = new JsonObject();
                tool.addProperty("type", "function");
                tool.add("function", fnCopy);
                groqTools.add(tool);
            }
        }
        return groqTools;
    }

    private String getSystemInstructionText() {
        String dateStr = LocalDate.now().toString();
        String dayOfWeek = LocalDate.now().getDayOfWeek().toString();

        return "You are an intelligent, reasoning-based Agentic AI Appointment Scheduling Assistant called AgentSched AI.\n" +
                "You assist patients with booking, rescheduling, cancelling, and checking appointments.\n" +
                "CRITICAL INFORMATION:\n" +
                "- Today is " + dayOfWeek + ", " + dateStr + ". Keep this reference in mind for date keywords like 'tomorrow' (" + LocalDate.now().plusDays(1).toString() + "), 'next Monday', 'Friday afternoon' etc.\n" +
                "- Available Doctors: Dr. Smith (Cardiologist), Dr. Patel (Dentist), Dr. Adams (Pediatrician), and 'General Practitioner' (default).\n" +
                "- Work hours: 09:00 to 17:00 (5:00 PM) at 30-minute intervals.\n\n" +
                "PATIENT REGISTRATION WORKFLOW:\n" +
                "Before calling bookAppointment, you MUST check if the patient profile exists using getPatientByEmail(email).\n" +
                "1. If getPatientByEmail returns NOT_FOUND, you MUST call createPatientProfile(fullName, phoneNumber, email) first to register them before booking.\n" +
                "2. If getPatientByEmail returns a profile, continue directly to book the appointment.\n\n" +
                "AGENT RULES & PROTOCOL:\n" +
                "1. Understand Goal: Analyze user input to identify intent (book, reschedule, cancel, query).\n" +
                "2. Gather Details: To book, you need: Patient Name, Phone Number, Email, Date, Time, Doctor (default: General Practitioner), and optional Purpose/Priority.\n" +
                "   If any booking information is missing, ask the user politely.\n" +
                "3. Locate Appointment: To reschedule or cancel, you must know the appointment ID. Call listAppointments() first to see if you can find their booking by name, email, or details. If multiple or none match, ask the user for their Appointment ID or confirmation.\n" +
                "4. Check Availability first: Always check availability (checkAvailability) before confirming a booking or rescheduling. If the slot is unavailable, ALWAYS call findAlternativeSlots() automatically and recommend those specific slots to the user.\n" +
                "5. Never access databases directly: Always call the provided backend function tools.\n" +
                "6. Confirm actions: After booking, rescheduling, or cancelling, read the tool's success output and present it clearly to the patient, including the Appointment ID and summary of notifications sent.\n" +
                "Keep your conversational response natural, concise, helpful, and professional.";
    }

    /**
     * Executes the java service tool based on the function call name and args.
     */
    private String executeTool(String name, JsonObject args) {
        try {
            switch (name) {
                case "checkAvailability":
                    String date = args.get("date").getAsString();
                    String time = args.get("time").getAsString();
                    String docName = args.has("doctorName") ? args.get("doctorName").getAsString() : "";
                    return appointmentService.checkAvailability(date, time, docName);

                case "bookAppointment":
                    String patientName = args.get("patientName").getAsString();
                    String phone = args.get("phoneNumber").getAsString();
                    String email = args.get("email").getAsString();
                    String bDate = args.get("date").getAsString();
                    String bTime = args.get("time").getAsString();
                    String purpose = args.has("purpose") ? args.get("purpose").getAsString() : "Routine Checkup";
                    String bDoc = args.has("doctorName") ? args.get("doctorName").getAsString() : "General Practitioner";
                    String priority = args.has("priority") ? args.get("priority").getAsString() : "NORMAL";
                    
                    String bookRes = appointmentService.bookAppointment(patientName, phone, email, bDate, bTime, purpose, bDoc, priority);
                    if (bookRes.startsWith("Success:")) {
                        // Extract generated ID
                        int idStart = bookRes.indexOf("Appointment ID: ") + "Appointment ID: ".length();
                        int idEnd = bookRes.indexOf(",", idStart);
                        if (idStart > 0 && idEnd > idStart) {
                            String idStr = bookRes.substring(idStart, idEnd).trim();
                            try {
                                int apptId = Integer.parseInt(idStr);
                                Patient p = patientService.getPatientByEmail(email);
                                if (p != null) {
                                    patientService.linkAppointmentToPatient(apptId, p.getPatientId());
                                }
                            } catch (Exception e) {
                                System.err.println("Failed to link appointment to patient: " + e.getMessage());
                            }
                        }
                    }
                    return bookRes;

                case "rescheduleAppointment":
                    int apptId = args.get("appointmentId").getAsInt();
                    String rDate = args.get("newDate").getAsString();
                    String rTime = args.get("newTime").getAsString();
                    return appointmentService.rescheduleAppointment(apptId, rDate, rTime);

                case "cancelAppointment":
                    int cId = args.get("appointmentId").getAsInt();
                    return appointmentService.cancelAppointment(cId);

                case "findAlternativeSlots":
                    String aDate = args.get("date").getAsString();
                    String aTime = args.get("time").getAsString();
                    String aDoc = args.has("doctorName") ? args.get("doctorName").getAsString() : "";
                    return appointmentService.findAlternativeSlots(aDate, aTime, aDoc);

                case "listAppointments":
                    return gson.toJson(appointmentService.getAllAppointments());

                case "getPatientByEmail":
                    String pEmail = args.get("email").getAsString();
                    Patient patient = patientService.getPatientByEmail(pEmail);
                    if (patient == null) {
                        return "{\"status\":\"NOT_FOUND\"}";
                    }
                    return gson.toJson(patient);

                case "createPatientProfile":
                    Patient newPat = new Patient();
                    newPat.setFullName(args.get("fullName").getAsString());
                    newPat.setPhoneNumber(args.get("phoneNumber").getAsString());
                    newPat.setEmail(args.get("email").getAsString());
                    if (args.has("dateOfBirth")) newPat.setDateOfBirth(args.get("dateOfBirth").getAsString());
                    if (args.has("gender")) newPat.setGender(args.get("gender").getAsString());
                    if (args.has("address")) newPat.setAddress(args.get("address").getAsString());
                    
                    int pId = patientService.createPatient(newPat);
                    return "{\"status\":\"SUCCESS\",\"patientId\":" + pId + "}";

                default:
                    return "Error: Unknown tool function name '" + name + "'.";
            }
        } catch (Exception e) {
            e.printStackTrace();
            return "Error while executing tool " + name + ": " + e.getMessage();
        }
    }

    /**
     * Declares tools/functions available to the model.
     */
    private JsonArray getToolsDeclaration() {
        JsonArray tools = new JsonArray();
        JsonObject toolWrapper = new JsonObject();
        JsonArray functionDeclarations = new JsonArray();

        // 1. checkAvailability
        JsonObject checkAvail = new JsonObject();
        checkAvail.addProperty("name", "checkAvailability");
        checkAvail.addProperty("description", "Checks availability of a slot for a specific doctor. Returns available/unavailable status.");
        JsonObject caParams = new JsonObject();
        caParams.addProperty("type", "OBJECT");
        JsonObject caProps = new JsonObject();
        caProps.add("date", createStringParam("The date of interest (YYYY-MM-DD)."));
        caProps.add("time", createStringParam("The time of interest (HH:MM in 24h format)."));
        caProps.add("doctorName", createStringParam("Optional name of the doctor (e.g. Dr. John, Dr. Smith). Defaults to 'General Practitioner'."));
        caParams.add("properties", caProps);
        JsonArray caReq = new JsonArray();
        caReq.add("date");
        caReq.add("time");
        caParams.add("required", caReq);
        checkAvail.add("parameters", caParams);
        functionDeclarations.add(checkAvail);

        // 2. bookAppointment
        JsonObject bookAppt = new JsonObject();
        bookAppt.addProperty("name", "bookAppointment");
        bookAppt.addProperty("description", "Books a new appointment. Checks availability first before performing this action.");
        JsonObject baParams = new JsonObject();
        baParams.addProperty("type", "OBJECT");
        JsonObject baProps = new JsonObject();
        baProps.add("patientName", createStringParam("The full name of the patient."));
        baProps.add("phoneNumber", createStringParam("Patient phone number."));
        baProps.add("email", createStringParam("Patient email address."));
        baProps.add("date", createStringParam("Date of appointment (YYYY-MM-DD)."));
        baProps.add("time", createStringParam("Time of appointment (HH:MM in 24h format)."));
        baProps.add("purpose", createStringParam("Optional reason for appointment (e.g., consultation, teeth cleaning)."));
        baProps.add("doctorName", createStringParam("Optional doctor name. Defaults to 'General Practitioner'. Available doctors include Dr. Smith, Dr. Patel, Dr. Adams."));
        baProps.add("priority", createStringParam("Optional priority level: NORMAL or HIGH. Defaults to NORMAL."));
        baParams.add("properties", baProps);
        JsonArray baReq = new JsonArray();
        baReq.add("patientName");
        baReq.add("phoneNumber");
        baReq.add("email");
        baReq.add("date");
        baReq.add("time");
        baParams.add("required", baReq);
        bookAppt.add("parameters", baParams);
        functionDeclarations.add(bookAppt);

        // 3. rescheduleAppointment
        JsonObject resched = new JsonObject();
        resched.addProperty("name", "rescheduleAppointment");
        resched.addProperty("description", "Updates/moves an existing active appointment to a new date and time.");
        JsonObject rParams = new JsonObject();
        rParams.addProperty("type", "OBJECT");
        JsonObject rProps = new JsonObject();
        rProps.add("appointmentId", createIntegerParam("The unique ID of the appointment to reschedule."));
        rProps.add("newDate", createStringParam("New appointment date (YYYY-MM-DD)."));
        rProps.add("newTime", createStringParam("New appointment time (HH:MM in 24h format)."));
        rParams.add("properties", rProps);
        JsonArray rReq = new JsonArray();
        rReq.add("appointmentId");
        rReq.add("newDate");
        rReq.add("newTime");
        rParams.add("required", rReq);
        resched.add("parameters", rParams);
        functionDeclarations.add(resched);

        // 4. cancelAppointment
        JsonObject cancel = new JsonObject();
        cancel.addProperty("name", "cancelAppointment");
        cancel.addProperty("description", "Cancels an existing appointment by ID.");
        JsonObject cParams = new JsonObject();
        cParams.addProperty("type", "OBJECT");
        JsonObject cProps = new JsonObject();
        cProps.add("appointmentId", createIntegerParam("The ID of the appointment to cancel."));
        cParams.add("properties", cProps);
        JsonArray cReq = new JsonArray();
        cReq.add("appointmentId");
        cParams.add("required", cReq);
        cancel.add("parameters", cParams);
        functionDeclarations.add(cancel);

        // 5. findAlternativeSlots
        JsonObject findAlt = new JsonObject();
        findAlt.addProperty("name", "findAlternativeSlots");
        findAlt.addProperty("description", "Searches and suggests alternative slots for a doctor on a specific date when the requested slot is busy.");
        JsonObject faParams = new JsonObject();
        faParams.addProperty("type", "OBJECT");
        JsonObject faProps = new JsonObject();
        faProps.add("date", createStringParam("The date (YYYY-MM-DD)."));
        faProps.add("time", createStringParam("The busy/requested time (HH:MM) to find slots close to."));
        faProps.add("doctorName", createStringParam("Optional doctor name. Defaults to 'General Practitioner'."));
        faParams.add("properties", faProps);
        JsonArray faReq = new JsonArray();
        faReq.add("date");
        faReq.add("time");
        faParams.add("required", faReq);
        findAlt.add("parameters", faParams);
        functionDeclarations.add(findAlt);

        // 6. listAppointments
        JsonObject listAppts = new JsonObject();
        listAppts.addProperty("name", "listAppointments");
        listAppts.addProperty("description", "Lists all scheduled appointments. Use this to locate appointments, search for a patient's booking, or view existing slots.");
        JsonObject laParams = new JsonObject();
        laParams.addProperty("type", "OBJECT");
        laParams.add("properties", new JsonObject());
        listAppts.add("parameters", laParams);
        functionDeclarations.add(listAppts);

        toolWrapper.add("functionDeclarations", functionDeclarations);
        tools.add(toolWrapper);

        // 7. getPatientByEmail
        JsonObject getPat = new JsonObject();
        getPat.addProperty("name", "getPatientByEmail");
        getPat.addProperty("description", "Looks up a patient profile by email. Returns profile details or NOT_FOUND.");
        JsonObject gpParams = new JsonObject();
        gpParams.addProperty("type", "OBJECT");
        JsonObject gpProps = new JsonObject();
        gpProps.add("email", createStringParam("The patient's email address."));
        gpParams.add("properties", gpProps);
        JsonArray gpReq = new JsonArray();
        gpReq.add("email");
        gpParams.add("required", gpReq);
        getPat.add("parameters", gpParams);
        functionDeclarations.add(getPat);

        // 8. createPatientProfile
        JsonObject createPat = new JsonObject();
        createPat.addProperty("name", "createPatientProfile");
        createPat.addProperty("description", "Registers a new patient profile in the database.");
        JsonObject cpParams = new JsonObject();
        cpParams.addProperty("type", "OBJECT");
        JsonObject cpProps = new JsonObject();
        cpProps.add("fullName", createStringParam("The patient's full name."));
        cpProps.add("phoneNumber", createStringParam("The patient's phone number."));
        cpProps.add("email", createStringParam("The patient's email address."));
        cpProps.add("dateOfBirth", createStringParam("Optional date of birth (YYYY-MM-DD)."));
        cpProps.add("gender", createStringParam("Optional gender."));
        cpProps.add("address", createStringParam("Optional residential address."));
        cpParams.add("properties", cpProps);
        JsonArray cpReq = new JsonArray();
        cpReq.add("fullName");
        cpReq.add("phoneNumber");
        cpReq.add("email");
        cpParams.add("required", cpReq);
        createPat.add("parameters", cpParams);
        functionDeclarations.add(createPat);

        return tools;
    }

    private JsonObject createStringParam(String desc) {
        JsonObject obj = new JsonObject();
        obj.addProperty("type", "STRING");
        obj.addProperty("description", desc);
        return obj;
    }

    private JsonObject createIntegerParam(String desc) {
        JsonObject obj = new JsonObject();
        obj.addProperty("type", "INTEGER");
        obj.addProperty("description", desc);
        return obj;
    }

    private JsonObject getSystemInstruction() {
        JsonObject sys = new JsonObject();
        JsonArray parts = new JsonArray();
        JsonObject part = new JsonObject();
        part.addProperty("text", getSystemInstructionText());
        parts.add(part);
        sys.add("parts", parts);
        return sys;
    }

    private JsonObject createErrorMessage(String errorMsg) {
        JsonObject responseObj = new JsonObject();
        responseObj.addProperty("role", "model");
        JsonArray parts = new JsonArray();
        JsonObject textPart = new JsonObject();
        textPart.addProperty("text", errorMsg);
        parts.add(textPart);
        responseObj.add("parts", parts);
        return responseObj;
    }
}
