import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQuestionCircle, faComment } from "@fortawesome/free-solid-svg-icons";
import { AppContext } from "../context/AppContext";
import { API_URL } from "../utils/utils";

interface ChatHistory {
  _id: string;
  patientId: string;
  title: string;
  messages: any[];
  createdAt: string;
  updatedAt: string;
}

interface ChatHistoryGroups {
  today: ChatHistory[];
  yesterday: ChatHistory[];
  previousWeek: ChatHistory[];
  older: ChatHistory[];
}

const Sidebar: React.FC = () => {
  const { patients, fetchPatients } = useContext(AppContext);
  const { 
    isNewChat, setNewChat,
    curPatient, setCurPatient, 
    setCurResult, 
    chatHistories, fetchChatHistories, loadChatHistory,
    setCurrentChatHistory
  } = useContext(AppContext);

  const [isPatientListOpen, setIsPatientListOpen] = useState<boolean>(() => {
    const savedState = localStorage.getItem("patientToggle");
    if (savedState === "true") return true;
    else return false;
  });
  const [isManagementOpen, setIsManagementOpen] = useState<boolean>(() => {
    const savedState = localStorage.getItem("resultToggle");
    return savedState === "true";
  });
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [historyCroup, setHistoryGroup] = useState<ChatHistoryGroups>();

  const navigate = useNavigate();
  // Group chat histories by date
  const groupChatHistoriesByDate = () => {
    console.log("groupChatHistoriesByDate called, chatHistories:", chatHistories);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const groups: ChatHistoryGroups = {
      today: [],
      yesterday: [],
      previousWeek: [],
      older: []
    };
    
    if (chatHistories && Array.isArray(chatHistories)) {
      console.log("Processing chat histories array, length:", chatHistories.length);
      
      chatHistories.forEach((chat: ChatHistory) => {
        console.log("Processing chat:", chat._id, chat.title);
        const chatDate = new Date(chat.updatedAt);
        chatDate.setHours(0, 0, 0, 0);
        
        if (chatDate.getTime() === today.getTime()) {
          console.log("Adding to today:", chat.title);
          groups.today.push(chat);
        } else if (chatDate.getTime() === yesterday.getTime()) {
          console.log("Adding to yesterday:", chat.title);
          groups.yesterday.push(chat);
        } else if (chatDate >= oneWeekAgo) {
          console.log("Adding to previous week:", chat.title);
          groups.previousWeek.push(chat);
        } else {
          console.log("Adding to older:", chat.title);
          groups.older.push(chat);
        }
      });
    } else {
      console.warn("chatHistories is not an array or is null:", chatHistories);
    }
    
    console.log("Final groups:", {
      today: groups.today.length,
      yesterday: groups.yesterday.length,
      previousWeek: groups.previousWeek.length,
      older: groups.older.length
    });
    
    setHistoryGroup(groups);
  };

  const handleChatHistorySelect = async (chatHistoryId) => {
    console.log("Chat history item clicked, ID:", chatHistoryId, "Previous selected ID:", selectedChatId);
    
    // Check if we're selecting the same chat history
    if (chatHistoryId === selectedChatId) {
      console.log("Same chat history selected, forcing reload");
      // Force a reload of the same chat history
      try {
        // Directly fetch the chat history from the API
        console.log("Re-fetching chat history from API");
        const response = await fetch(`${API_URL}/chat-history/conversation/${chatHistoryId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch chat history: ${response.status}`);
        }
        
        const chatHistory = await response.json();
        console.log("Re-received chat history from API:", chatHistory);
        
        // Set the current chat history in the context
        console.log("Re-setting currentChatHistory in context");
        // Create a new object to ensure React detects the change
        const updatedChatHistory = JSON.parse(JSON.stringify(chatHistory));
        setCurrentChatHistory && setCurrentChatHistory(updatedChatHistory);
        
        // Force a reload by dispatching popstate
        console.log("Dispatching popstate event for same chat");
        window.dispatchEvent(new Event('popstate'));
      } catch (error) {
        console.error("Error re-fetching chat history:", error);
      }
      return;
    }
    
    // Set the selected chat ID
    setSelectedChatId(chatHistoryId);
    
    try {
      // Directly fetch the chat history from the API
      console.log("Fetching chat history directly from API");
      const response = await fetch(`${API_URL}/chat-history/conversation/${chatHistoryId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chat history: ${response.status}`);
      }
      
      const chatHistory = await response.json();
      console.log("Received chat history from API:", chatHistory);
      
      if (chatHistory) {
        setCurResult("ask");
        
        // Set the current chat history in the context
        console.log("Setting currentChatHistory in context");
        // Create a new object to ensure React detects the change
        const updatedChatHistory = JSON.parse(JSON.stringify(chatHistory));
        setCurrentChatHistory && setCurrentChatHistory(updatedChatHistory);
        
        // Check if we're already on the ask page
        const currentPath = window.location.pathname;
        const isOnAskPage = currentPath === "/ask";
        
        if (isOnAskPage) {
          // If already on the ask page, update the URL without navigation
          console.log("Already on ask page, updating URL");
          const url = new URL(window.location.href);
          url.searchParams.set('chat', chatHistoryId);
          window.history.pushState({}, '', url);
          
          // Force a reload by dispatching popstate
          console.log("Dispatching popstate event");
          window.dispatchEvent(new Event('popstate'));
        } else {
          // Navigate to the chat with the chat history ID
          console.log("Navigating to ask page with chat ID");
          navigate(`/ask?chat=${chatHistoryId}`);
        }
      }
    } catch (error) {
      console.error("Error in handleChatHistorySelect:", error);
    }
  };

  useEffect(() => {
    groupChatHistoriesByDate();
    setCurResult("ask");
    setNewChat(true);
    const savedState = localStorage.getItem("isOpen");

    setIsPatientListOpen(false); // Sync state on initial render

    const result = localStorage.getItem("isOpen");

    if (savedState !== null) {
      setIsManagementOpen(result === "true"); // Sync state on initial render
    }

    const setResult = localStorage.getItem("selectedResult");
    setCurResult(String(setResult));
    
    // Initialize selected chat ID from URL
    const searchParams = new URLSearchParams(window.location.search);
    const chatId = searchParams.get('chat');
    if (chatId) {
      setSelectedChatId(chatId);
    }
  }, []);

  // Fetch chat histories when component loads
  useEffect(() => {
    console.log("Sidebar: Fetching chat histories on mount");
    fetchChatHistories();
  }, [fetchChatHistories]);
  
  // Update history groups when chatHistories changes
  useEffect(() => {
    console.log("Sidebar: chatHistories changed, regrouping");
    groupChatHistoriesByDate();
  }, [chatHistories]);

  const handleNewChat = () => {
    groupChatHistoriesByDate()
    setCurResult("ask");
    setNewChat(true)
    
    // Reset selected chat ID
    setSelectedChatId(null);
    
    // Reset current chat history in the context
    setCurrentChatHistory && setCurrentChatHistory(null);
    // Force a reload of the AskAnything component by adding new=true parameter to the URL
    window.location.href = "/ask";
    
    // Refresh chat histories to ensure sidebar is up to date
    fetchChatHistories();
    console.log("sidebar === ", isNewChat)
  };

  return (
    <div className="sidebar">
      {/* New Chat Button */}
      <div className="new-chat-button-container">
        <button className="new-chat-button" onClick={handleNewChat}>
          <FontAwesomeIcon icon={faComment} className="mr-2" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Chat History Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">CHAT HISTORY</div>
        <ul className="sidebar-menu">
          <div className="chat-history-list">
            {/* Group chat histories by date */}
            {(() => {
              // Check if there are any chat histories
              const hasHistories = 
                historyCroup && historyCroup.today.length > 0 || 
                historyCroup && historyCroup.yesterday.length > 0 || 
                historyCroup && historyCroup.previousWeek.length > 0 || 
                historyCroup && historyCroup.older.length > 0;
              
              if (!hasHistories) {
                return (
                  <div className="no-chat-history">
                    <p>No chat history yet</p>
                  </div>
                );
              }
              
              return (
                <>
                  {historyCroup.today.length > 0 && (
                    <>
                      <div className="chat-history-date-header">Today</div>
                      {historyCroup.today.map(chat => (
                        <li
                          key={chat._id}
                          className={`sidebar-menu-item chat-history-item ${chat._id === selectedChatId ? 'selected' : ''}`}
                          onClick={() => handleChatHistorySelect(chat._id)}
                        >
                          {chat.title}
                        </li>
                      ))}
                    </>
                  )}
                  
                  {historyCroup && historyCroup.yesterday.length > 0 && (
                    <>
                      <div className="chat-history-date-header">Yesterday</div>
                      {historyCroup.yesterday.map(chat => (
                        <li
                          key={chat._id}
                          className={`sidebar-menu-item chat-history-item ${chat._id === selectedChatId ? 'selected' : ''}`}
                          onClick={() => handleChatHistorySelect(chat._id)}
                        >
                          <FontAwesomeIcon icon={faQuestionCircle} className="mr-2" />
                          {chat.title}
                        </li>
                      ))}
                    </>
                  )}
                  
                  {historyCroup.previousWeek.length > 0 && (
                    <>
                      <div className="chat-history-date-header">Previous 7 Days</div>
                      {historyCroup.previousWeek.map(chat => (
                        <li
                          key={chat._id}
                          className={`sidebar-menu-item chat-history-item ${chat._id === selectedChatId ? 'selected' : ''}`}
                          onClick={() => handleChatHistorySelect(chat._id)}
                        >
                          <FontAwesomeIcon icon={faQuestionCircle} className="mr-2" />
                          {chat.title}
                        </li>
                      ))}
                    </>
                  )}
                  
                  {historyCroup.older.length > 0 && (
                    <>
                      <div className="chat-history-date-header">Older</div>
                      {historyCroup.older.map(chat => (
                        <li
                          key={chat._id}
                          className={`sidebar-menu-item chat-history-item ${chat._id === selectedChatId ? 'selected' : ''}`}
                          onClick={() => handleChatHistorySelect(chat._id)}
                        >
                          <FontAwesomeIcon icon={faQuestionCircle} className="mr-2" />
                          {chat.title}
                        </li>
                      ))}
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </ul>
      </div>
    </div>
  );
};

export default Sidebar;
