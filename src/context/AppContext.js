import React, { createContext, useState, useEffect } from 'react';
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

    const fetchChatHistories = async (patientId) => {
        console.log("fetchChatHistories called, patientId:", patientId);
        try {
            // If patientId is provided, fetch chat histories for that patient
            // Otherwise, fetch all chat histories
            const url = patientId 
                ? `${API_URL}/chat-history/${patientId}` 
                : `${API_URL}/chat-history`;
            
            console.log("Fetching chat histories from URL:", url);
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch chat histories: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Received chat histories from API:", data);
            
            if (Array.isArray(data)) {
                setChatHistories(data);
                console.log("Chat histories set in state, count:", data.length);
            } else {
                console.warn("API returned non-array data for chat histories:", data);
                setChatHistories([]);
            }
        } catch (error) {
            console.error("Error fetching chat histories:", error);
            setChatHistories([]);
        }
    };

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
            currentChatHistory, setCurrentChatHistory, loadChatHistory
        }}>
            {props.children}
        </AppContext.Provider>
    );
};
