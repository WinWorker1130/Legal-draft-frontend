import React, { createContext, useState, useEffect, useCallback } from 'react';
import { API_URL } from '../utils/utils';

export const AppContext = createContext();

export const AppContextProvider = (props) => {
    const [patients, setPatients] = useState([]);
    const [isNewChat, setNewChat] = useState(false);
    const [curPatient, setCurPatient] = useState();
    const [curResult, setCurResult] = useState();
    const [askPatient, setAskPatient] = useState();
    const [chatHistories, setChatHistories] = useState([]);
    const [currentChatHistory, setCurrentChatHistory] = useState(null);

    const fetchPatients = async () => {
        try {
            const response = await fetch(`${API_URL}/patients`);
            const data = await response.json();
            setPatients(data.map((patient) => patient));
        } catch (error) {
            console.error("Error fetching patients:", error);
        }
    };

    // Memoize fetchChatHistories to prevent it from being recreated on every render
    const fetchChatHistories = useCallback(async (patientId) => {
        // Only log in development to avoid console spam
        if (process.env.NODE_ENV !== 'production') {
            console.log("fetchChatHistories called, patientId:", patientId);
        }
        
        try {
            // If patientId is provided, fetch chat histories for that patient
            // Otherwise, fetch all chat histories
            const url = patientId 
                ? `${API_URL}/chat-history/patient/${patientId}` 
                : `${API_URL}/chat-history`;
            
            if (process.env.NODE_ENV !== 'production') {
                console.log("Fetching chat histories from URL:", url);
            }
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch chat histories: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (process.env.NODE_ENV !== 'production') {
                console.log("Received chat histories from API, count:", 
                    Array.isArray(data) ? data.length : 'not an array');
            }
            
            if (Array.isArray(data)) {
                // Compare with current chatHistories to avoid unnecessary updates
                const currentIds = chatHistories.map(chat => chat._id).sort().join(',');
                const newIds = data.map(chat => chat._id).sort().join(',');
                
                // Only update if the IDs have changed
                if (currentIds !== newIds) {
                    setChatHistories(data);
                    if (process.env.NODE_ENV !== 'production') {
                        console.log("Chat histories updated in state, count:", data.length);
                    }
                } else if (process.env.NODE_ENV !== 'production') {
                    console.log("Chat histories unchanged, skipping state update");
                }
            } else {
                console.warn("API returned non-array data for chat histories:", data);
                setChatHistories([]);
            }
        } catch (error) {
            console.error("Error fetching chat histories:", error);
            setChatHistories([]);
        }
    }, [API_URL, chatHistories]);

    const loadChatHistory = async (chatHistoryId) => {
        try {
            const response = await fetch(`${API_URL}/chat-history/conversation/${chatHistoryId}`);
            const data = await response.json();
            setCurrentChatHistory(data);
            return data;
        } catch (error) {
            console.error("Error loading chat history:", error);
            return null;
        }
    };

    const deleteChatHistory = async (chatHistoryId) => {
        try {
            console.log("Deleting chat history with ID:", chatHistoryId);
            console.log("DELETE request URL:", `${API_URL}/chat-history/${chatHistoryId}`);
            
            const response = await fetch(`${API_URL}/chat-history/${chatHistoryId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            console.log("DELETE response status:", response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response text:", errorText);
                throw new Error(`Failed to delete chat history: ${response.status} - ${errorText}`);
            }
            
            const responseData = await response.json();
            console.log("DELETE response data:", responseData);
            
            // Update local state by removing the deleted chat
            setChatHistories(prevHistories => {
                console.log("Updating chat histories state, removing ID:", chatHistoryId);
                return prevHistories.filter(chat => chat._id !== chatHistoryId);
            });
            
            // If the current chat was deleted, reset current chat history
            if (currentChatHistory && currentChatHistory._id === chatHistoryId) {
                console.log("Resetting current chat history as it was deleted");
                setCurrentChatHistory(null);
                // Redirect to new chat if needed
                if (window.location.pathname === '/ask') {
                    console.log("Redirecting to new chat");
                    window.location.href = '/ask';
                }
            }
            
            console.log("Chat history deleted successfully");
            return true;
        } catch (error) {
            console.error("Error deleting chat history:", error);
            return false;
        }
    };

    useEffect(() => {
        fetchPatients();
    }, []);

    return (
        <AppContext.Provider value={{
            isNewChat, setNewChat,
            patients, fetchPatients, 
            curPatient, setCurPatient, 
            curResult, setCurResult, 
            askPatient, setAskPatient,
            chatHistories, setChatHistories, fetchChatHistories,
            currentChatHistory, setCurrentChatHistory, loadChatHistory,
            deleteChatHistory
        }}>
            {props.children}
        </AppContext.Provider>
    );
};
