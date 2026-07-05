import React, { useState, useEffect, useRef } from 'react';

export default function Chat({ messages, onSendMessage, typing, systemDate }) {
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef(null);

    const presetQueries = [
        { label: "Is tomorrow at 2 PM available?", query: "Is tomorrow at 2 PM available?" },
        { label: "Book a dental slot tomorrow", query: "I want to book an appointment with Dr. Patel tomorrow at 2 PM. My name is Alice, phone 555-0101, email alice@example.com" },
        { label: "Show my appointments", query: "Show all my scheduled appointments" },
        { label: "Reschedule appointment ID 1", query: "Reschedule my appointment with ID 1 to Friday afternoon at 4 PM" },
        { label: "Cancel appointment ID 1", query: "Cancel my appointment with ID 1" }
    ];

    const suggestionChips = [
        { label: "Check Dr. Smith's availability", query: "Is Dr. Smith available tomorrow at 10 AM?" },
        { label: "Book new slot", query: "Book an appointment for Alice tomorrow at 3 PM with Dr. Smith. Phone: 555-1234, email: alice@gmail.com" },
        { label: "Show existing bookings", query: "List all active appointments" }
    ];

    // Scroll to bottom whenever messages list or typing state changes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing]);

    const handleSend = () => {
        const text = inputValue.trim();
        if (!text) return;
        onSendMessage(text);
        setInputValue('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    const handlePresetClick = (query) => {
        setInputValue(query);
    };

    // Helper to format simple markdown (**bold**, - bullets, `code`, and newlines)
    const formatMarkdown = (text) => {
        if (!text) return '';
        
        let html = text;
        // Bold **text**
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Bullet lists
        html = html.replace(/^\s*-\s+(.*?)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*?<\/li>)/gs, '<ul>$1</ul>');
        html = html.replace(/<\/ul>\s*<ul>/g, ''); // Clean double lists

        // Code blocks `code`
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');
        
        // Newlines to <br> (skipping inside lists)
        html = html.split('\n').map(line => {
            if (line.trim().startsWith('<ul>') || line.trim().startsWith('<li>') || line.trim().startsWith('</ul>')) {
                return line;
            }
            return line + '<br>';
        }).join('');

        return html;
    };

    // Helper to inject the custom "AI Action" badges
    const getActionBadge = (text) => {
        if (text.includes("Success: Appointment booked")) {
            return { label: "checkAvailability() -> bookAppointment()", type: "success" };
        } else if (text.includes("Success: Appointment") && text.includes("rescheduled")) {
            return { label: "listAppointments() -> rescheduleAppointment()", type: "success" };
        } else if (text.includes("Success: Appointment") && text.includes("cancelled")) {
            return { label: "listAppointments() -> cancelAppointment()", type: "success" };
        } else if (text.includes("Conflict:")) {
            return { label: "checkAvailability() -> findAlternativeSlots()", type: "conflict" };
        }
        return null;
    };

    return (
        <div id="section-chat" className="content-section active">
            <div className="chat-layout">
                {/* Left: Guidelines & Presets */}
                <div className="chat-sidebar">
                    <div className="sidebar-section">
                        <h3>System Context</h3>
                        <div className="info-card">
                            <p><strong>Assigned:</strong> AgentSched AI</p>
                            <p><strong>Model:</strong> Llama 3.3 (Groq)</p>
                            <p><strong>Today's Date:</strong> <span id="chat-system-date">{systemDate}</span></p>
                        </div>
                    </div>
                    <div className="sidebar-section">
                        <h3>Quick Commands</h3>
                        <div className="preset-queries">
                            {presetQueries.map((item, idx) => (
                                <button 
                                    className="btn btn-outline preset-btn" 
                                    key={idx} 
                                    onClick={() => handlePresetClick(item.query)}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Chat Box */}
                <div className="chat-container">
                    <div className="chat-messages" id="chat-messages-box">
                        {messages.map((msg, index) => {
                            // Extract text
                            const text = msg.parts?.[0]?.text || '';
                            const actionBadge = msg.role === 'model' ? getActionBadge(text) : null;

                            return (
                                <div className={`message ${msg.role === 'model' ? 'model' : 'user'}`} key={index}>
                                    <div className="message-content">
                                        <div dangerouslySetInnerHTML={{ __html: formatMarkdown(text) }} />
                                        
                                        {/* Suggestions for first bubble */}
                                        {index === 0 && (
                                            <div className="suggestions-grid">
                                                {suggestionChips.map((chip, cIdx) => (
                                                    <div 
                                                        className="suggestion-chip" 
                                                        key={cIdx} 
                                                        onClick={() => handlePresetClick(chip.query)}
                                                    >
                                                        {chip.label}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* AI Action Badge */}
                                        {actionBadge && (
                                            <div className={`agent-badge ${actionBadge.type}`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style={{ marginRight: '4px', display: 'inline-block', verticalAlign: 'middle' }}>
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                                AI Action: {actionBadge.label}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Typing Indicator */}
                    {typing && (
                        <div className="typing-indicator" id="chat-typing" style={{ display: 'flex' }}>
                            <span></span><span></span><span></span>
                            <small>AgentSched AI is planning & reasoning...</small>
                        </div>
                    )}

                    {/* Chat Input */}
                    <div className="chat-input-area">
                        <input 
                            type="text" 
                            id="chat-input" 
                            placeholder="Type a message (e.g. 'I want an appointment tomorrow at 2 PM')" 
                            autoComplete="off"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                        <button id="chat-send-btn" className="btn btn-primary" onClick={handleSend}>
                            <span>Send</span>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="btn-icon">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
