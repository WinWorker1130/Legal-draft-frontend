import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faQuestionCircle, faComment, faTrash } from "@fortawesome/free-solid-svg-icons";
import { AppContext } from "../context/AppContext";
import { API_URL } from "../utils/utils";
import ConfirmationModal from "./ConfirmationModal.tsx";
import LoadingAnimation from "./LoadingAnimation.tsx";
import "../styles/Sidebar.css";

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
  const { 
    isNewChat, setNewChat,
    setCurResult, 
    chatHistories, fetchChatHistories, loadChatHistory,
    setCurrentChatHistory, deleteChatHistory
  } = useContext(AppContext);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [historyCroup, setHistoryGroup] = useState<ChatHistoryGroups>();
  const [modalOpen, setModalOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();
  // Group chat histories by date - memoized with useCallback to prevent recreation on every render
  const groupChatHistoriesByDate = useCallback(() => {
    // Only log in development to avoid console spam
    if (process.env.NODE_ENV !== 'production') {
      console.log("groupChatHistoriesByDate called, chatHistories length:", 
        Array.isArray(chatHistories) ? chatHistories.length : 'not an array');
    }
    
    // Skip processing if chatHistories is not valid
    if (!chatHistories || !Array.isArray(chatHistories) || chatHistories.length === 0) {
      // Only set empty groups if historyCroup is undefined (initial state)
      if (!historyCroup) {
        setHistoryGroup({
          today: [],
          yesterday: [],
          previousWeek: [],
          older: []
        });
      }
      return;
    }
    
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
    
    // Process each chat history
    chatHistories.forEach((chat: ChatHistory) => {
      const chatDate = new Date(chat.updatedAt);
      chatDate.setHours(0, 0, 0, 0);
      
      if (chatDate.getTime() === today.getTime()) {
        groups.today.push(chat);
      } else if (chatDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(chat);
      } else if (chatDate >= oneWeekAgo) {
        groups.previousWeek.push(chat);
      } else {
        groups.older.push(chat);
      }
    });
    
    // Only update state if the groups have actually changed
    const hasChanged = !historyCroup || 
      groups.today.length !== historyCroup.today.length ||
      groups.yesterday.length !== historyCroup.yesterday.length ||
      groups.previousWeek.length !== historyCroup.previousWeek.length ||
      groups.older.length !== historyCroup.older.length;
    
    if (hasChanged) {
      setHistoryGroup(groups);
    }
  }, [chatHistories, historyCroup]);

  // Handle delete button click
  const handleDeleteClick = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation(); // Prevent triggering the chat selection
    setChatToDelete(chatId);
    setModalOpen(true);
  };
  
  // Handle confirm delete in modal
  const handleConfirmDelete = async () => {
    console.log("Confirming delete for chat ID:", chatToDelete);
    if (chatToDelete) {
      setIsDeleting(true); // Show loading animation
      try {
        console.log("Calling deleteChatHistory with ID:", chatToDelete);
        const success = await deleteChatHistory(chatToDelete);
        console.log("Delete operation result:", success);
        if (success) {
          console.log("Delete was successful, updating UI");
          // If the deleted chat was selected, reset selection
          if (chatToDelete === selectedChatId) {
            console.log("Resetting selected chat ID as it was deleted");
            setSelectedChatId(null);
          }
        } else {
          console.error("Delete operation failed");
        }
      } catch (error) {
        console.error("Error during deletion:", error);
      } finally {
        setIsDeleting(false); // Hide loading animation
      }
    } else {
      console.error("No chat ID to delete");
    }
    setModalOpen(false);
    setChatToDelete(null);
  };
  
  // Handle cancel delete in modal
  const handleCancelDelete = () => {
    setModalOpen(false);
    setChatToDelete(null);
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
  
  // Memoize the chat history IDs to detect actual data changes
  const chatHistoryIds = useMemo(() => {
    return Array.isArray(chatHistories) 
      ? chatHistories.map(chat => chat._id).join(',')
      : '';
  }, [chatHistories]);
  
  // Update history groups when chatHistories changes (using the memoized IDs)
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log("Sidebar: chatHistories changed, regrouping");
    }
    groupChatHistoriesByDate();
  }, [chatHistoryIds, groupChatHistoriesByDate]);

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
                        >
                          <div 
                            className="chat-item-content"
                            onClick={() => handleChatHistorySelect(chat._id)}
                          >
                            {chat.title}
                          </div>
                          <button 
                            className="delete-chat-button"
                            onClick={(e) => handleDeleteClick(e, chat._id)}
                            aria-label="Delete chat"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
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
                        >
                          <div 
                            className="chat-item-content"
                            onClick={() => handleChatHistorySelect(chat._id)}
                          >
                            <FontAwesomeIcon icon={faQuestionCircle} className="mr-2" />
                            {chat.title}
                          </div>
                          <button 
                            className="delete-chat-button"
                            onClick={(e) => handleDeleteClick(e, chat._id)}
                            aria-label="Delete chat"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
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
                        >
                          <div 
                            className="chat-item-content"
                            onClick={() => handleChatHistorySelect(chat._id)}
                          >
                            <FontAwesomeIcon icon={faQuestionCircle} className="mr-2" />
                            {chat.title}
                          </div>
                          <button 
                            className="delete-chat-button"
                            onClick={(e) => handleDeleteClick(e, chat._id)}
                            aria-label="Delete chat"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
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
                        >
                          <div 
                            className="chat-item-content"
                            onClick={() => handleChatHistorySelect(chat._id)}
                          >
                            <FontAwesomeIcon icon={faQuestionCircle} className="mr-2" />
                            {chat.title}
                          </div>
                          <button 
                            className="delete-chat-button"
                            onClick={(e) => handleDeleteClick(e, chat._id)}
                            aria-label="Delete chat"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
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
      
      {/* Loading overlay */}
      {isDeleting && (
        <LoadingAnimation 
          title="Deleting Chat" 
          subtitle="Please wait while the chat history is being deleted..." 
        />
      )}
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalOpen}
        message="Are you sure you want to delete this chat history? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
};

export default Sidebar;
