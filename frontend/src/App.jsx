import React, { useState, useEffect } from 'react';
import LandingPage from './pages/LandingPage';
import PatientPortal from './pages/PatientPortal';
import DoctorDashboard from './pages/DoctorDashboard';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import AuroraBackground from './components/ui/aurora-background';
import './styles/styles.css';

export default function App() {
    const [role, setRole] = useState('none'); // 'none' (landing), 'patient', or 'doctor'
    const [activeTab, setActiveTab] = useState('none');
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleToggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };
    const [appointments, setAppointments] = useState([]);
    const [analytics, setAnalytics] = useState({
        totalActiveAppointments: 0,
        totalCancelledAppointments: 0,
        statusBreakdown: {},
        doctorBreakdown: {},
        priorityBreakdown: {}
    });
    const [messages, setMessages] = useState([
        {
            role: "model",
            parts: [{ text: "Hello! I am **AgentSched AI**, your agentic scheduling assistant. How can I help you today?" }]
        }
    ]);
    const [typing, setTyping] = useState(false);
    const [systemDate, setSystemDate] = useState(() => {
        const d = new Date();
        const offset = d.getTimezoneOffset();
        const localDate = new Date(d.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().split('T')[0];
    });
    const [clockText, setClockText] = useState('Syncing clock...');
    const [searchFilterText, setSearchFilterText] = useState('');
    const [isOnline, setIsOnline] = useState(true);

    // Initial Fetch
    useEffect(() => {
        fetchData();
        setupClock();
    }, []);

    // Setup Real-time Clock
    const setupClock = () => {
        const updateTime = () => {
            const currentFakeTime = new Date();
            
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            
            const dayName = days[currentFakeTime.getDay()];
            const monthName = months[currentFakeTime.getMonth()];
            const date = currentFakeTime.getDate();
            const year = currentFakeTime.getFullYear();
            
            let hrs = currentFakeTime.getHours();
            let mins = currentFakeTime.getMinutes();
            const ampm = hrs >= 12 ? 'PM' : 'AM';
            hrs = hrs % 12;
            hrs = hrs ? hrs : 12;
            mins = mins < 10 ? '0' + mins : mins;

            setClockText(`${dayName}, ${monthName} ${date}, ${year} - ${hrs}:${mins} ${ampm}`);
            
            const offset = currentFakeTime.getTimezoneOffset();
            const localDate = new Date(currentFakeTime.getTime() - (offset * 60 * 1000));
            setSystemDate(localDate.toISOString().split('T')[0]);
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    };

    // Fetch records
    const fetchData = async () => {
        try {
            const [apptsRes, analyticsRes] = await Promise.all([
                fetch("/api/appointments"),
                fetch("/api/analytics")
            ]);

            if (apptsRes.ok) {
                const apptsData = await apptsRes.json();
                setAppointments(apptsData);
            }
            if (analyticsRes.ok) {
                const analyticsData = await analyticsRes.json();
                setAnalytics(analyticsData);
            }
            setIsOnline(true);
        } catch (e) {
            console.error("Failed to connect to backend REST APIs:", e);
            setIsOnline(false);
        }
    };

    // Patient selection handles routing
    const handleSelectRole = (newRole) => {
        setRole(newRole);
        if (newRole === 'patient') {
            setActiveTab('chat');
        } else if (newRole === 'doctor') {
            setActiveTab('stats');
        }
        fetchData();
    };

    const handleSwitchRole = () => {
        setRole('none');
        setActiveTab('none');
    };

    // Send chat prompt to backend API
    const handleSendMessage = async (text) => {
        const updatedMessages = [...messages, { role: "user", parts: [{ text }] }];
        setMessages(updatedMessages);
        setTyping(true);

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedMessages)
            });

            setTyping(false);

            if (res.ok) {
                const responseData = await res.json();
                setMessages(prev => [...prev, responseData]);
                fetchData();
            } else {
                setMessages(prev => [...prev, {
                    role: "model",
                    parts: [{ text: "Error: Failed to communicate with the Java backend server." }]
                }]);
            }
        } catch (e) {
            console.error(e);
            setTyping(false);
            setMessages(prev => [...prev, {
                role: "model",
                parts: [{ text: "Error: Network connection failure. Please make sure the backend Java process is running." }]
            }]);
        }
    };

    // Doctor direct cancel action sent programmatically to chatbot in the background
    const handleCancelAppointment = async (id) => {
        setTyping(true);
        const command = `Cancel appointment ID ${id}`;
        const updatedMessages = [...messages, { role: "user", parts: [{ text: command }] }];
        
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedMessages)
            });

            setTyping(false);

            if (res.ok) {
                const responseData = await res.json();
                // Append command and AI output silently to message history
                setMessages(prev => [...prev, { role: "user", parts: [{ text: command }] }, responseData]);
                
                // Reload analytics and list
                fetchData();
            }
        } catch (e) {
            console.error("Failed to execute background cancel call:", e);
            setTyping(false);
        }
    };

    const handleApplyQuickPrompt = (promptText) => {
        setSearchFilterText(promptText);
        const input = document.getElementById("chat-input");
        if (input) {
            input.value = promptText;
            input.focus();
        }
    };

    const getPageTitle = () => {
        if (role === 'patient') {
            switch (activeTab) {
                case 'chat': return "AI Scheduling Assistant";
                case 'appointments': return "My Appointments";
                case 'history': return "My Medical History";
                default: return "Patient Portal";
            }
        } else if (role === 'doctor') {
            switch (activeTab) {
                case 'stats': return "Dashboard Stats";
                case 'today': return "Today's Schedule";
                case 'records': return "Patient Records";
                case 'med-history': return "Medical History";
                default: return "Doctor Dashboard";
            }
        }
        return "AgentSched AI";
    };

    // Render landing page if no role selected
    if (role === 'none') {
        return <LandingPage onSelectRole={handleSelectRole} theme={theme} onToggleTheme={handleToggleTheme} />;
    }

    return (
        <AuroraBackground theme={theme}>
            <div className="app-container">
                {/* Sidebar Navigation */}
                <Sidebar 
                    role={role} 
                    activeTab={activeTab} 
                    onTabChange={setActiveTab} 
                    isOnline={isOnline} 
                    onSwitchRole={handleSwitchRole} 
                />

                {/* Main Content Area */}
                <main className="main-content">
                    <Navbar pageTitle={getPageTitle()} clockText={clockText} theme={theme} onToggleTheme={handleToggleTheme} />

                    {role === 'patient' ? (
                        <PatientPortal 
                            activeTab={activeTab}
                            messages={messages}
                            onSendMessage={handleSendMessage}
                            typing={typing}
                            systemDate={systemDate}
                            appointments={appointments}
                            onNavigate={setActiveTab}
                            onApplyQuickPrompt={handleApplyQuickPrompt}
                        />
                    ) : (
                        <DoctorDashboard 
                            activeTab={activeTab}
                            appointments={appointments}
                            analytics={analytics}
                            systemDate={systemDate}
                            onCancelAppointment={handleCancelAppointment}
                        />
                    )}
                </main>
            </div>
        </AuroraBackground>
    );
}
