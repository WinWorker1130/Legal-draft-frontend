import React, { useState, useRef, useEffect, useContext } from "react";
import "../styles/AskAnything.css";
import LoadingAnimation from "./LoadingAnimation.tsx";
import DocumentViewer from "./DocumentViewer.tsx";
import { API_URL } from "../utils/utils.js";
import { AppContext } from "../context/AppContext";

interface Reference {
  fileName: string;
  pageNumber: number;
  startChar?: number;
  endChar?: number;
  excerpt: string;
}

interface SourceDocument {
  filename: string;
  source?: 's3' | 'local';
  s3Key?: string;
}

interface Message {
  id: number;
  type: "system" | "user" | "assistant";
  content: string;
  confidence?: number;
  fileName?: string;
  isLegalDraft?: boolean;  // Field to identify legal drafts
  draftContent?: string;   // Field to store the JSON draft content
  isExpanded?: boolean;    // New field to track if a long message is expanded
  sourceFiles?: string[];  // Field to store source file names used for legal drafts
  sourceDocuments?: SourceDocument[];  // Field to store detailed source document info
}

// Component to display legal drafts in a split view
const LegalDraftView: React.FC<{ draftContent: string }> = ({ 
  draftContent 
}) => {
  return (
    <div className="legal-draft-container">
      <div className="legal-draft-answer">
        <div>Here is your draft:</div>
      </div>
      <div className="legal-draft-json">
        <pre>{draftContent}</pre>
      </div>
    </div>
  );
};

const AskAnything: React.FC = () => {
  const { 
    isNewChat, setAskPatient, curPatient, setNewChat,
    currentChatHistory, setCurrentChatHistory, loadChatHistory,
    fetchChatHistories
  } = useContext(AppContext);

  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentFileNameRef = useRef<string>("");
  const [componentLoading, setComponentLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<SourceDocument | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [chatHistoryId, setChatHistoryId] = useState<string | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const chatId = searchParams.get('chat');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setComponentLoading(false);
    }, 1500); // 1.5 seconds delay

    return () => clearTimeout(timer);
  }, []);

  // Handle new chat initialization
  useEffect(() => {
    console.log("New chat effect running, isNewChat:", isNewChat);
    
    // Only run this effect when isNewChat is true
    if (isNewChat) {
      console.log("Initializing new chat");
      // This is a new chat initiated by the "New Chat" button
      setChatHistoryId(null);
      // Reset messages to just the welcome message
      setMessages([
        {
          id: 1,
          type: "system",
          content: `Hi, I'm your legal assistant, how can I help you today?`,
        },
      ]);
      
      // Refresh chat histories to ensure sidebar is up to date
      fetchChatHistories();
      setNewChat(false);
    }
    
    // Add event listener for URL changes that don't have a chat parameter
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlChatId = params.get('chat');
      
      // Only reset if there's no chat ID in the URL
      if (!urlChatId) {
        console.log("URL changed to no chat ID, resetting to welcome message");
        setChatHistoryId(null);
        setMessages([
          {
            id: 1,
            type: "system",
            content: `Hi, I'm your legal assistant, how can I help you today?`,
          },
        ]);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isNewChat, fetchChatHistories, setNewChat]);

  // Effect to monitor and load chat history when currentChatHistory changes
  useEffect(() => {
    console.log("currentChatHistory changed:", currentChatHistory);
    if (currentChatHistory && currentChatHistory.messages && currentChatHistory.messages.length > 0) {
      console.log("Setting messages from currentChatHistory:", currentChatHistory.messages);
      setMessages(currentChatHistory.messages.map((msg, index) => ({
        id: index + 1,
        type: msg.role as "system" | "user" | "assistant",
        content: msg.content,
        isLegalDraft: msg.isLegalDraft || false,
        draftContent: msg.draftContent || null,
        sourceFiles: msg.sourceFiles || [],
        sourceDocuments: msg.sourceDocuments || []
      })));
      
      // Also update chatHistoryId
      if (currentChatHistory._id) {
        console.log("Setting chatHistoryId from currentChatHistory:", currentChatHistory._id);
        setChatHistoryId(currentChatHistory._id);
      }
    }
  }, [currentChatHistory]);

  // Debug flag - set to false to disable debug logs
  const DEBUG = false;

  // Effect to handle URL changes and direct chat ID loading
  useEffect(() => {
    const loadChatFromUrl = async () => {
      // Only log if debug is enabled
      if (DEBUG) {
        console.log("loadChatFromUrl called, chatId:", chatId, "previous chatHistoryId:", chatHistoryId);
      }
      
      // Only load chat history if chatId is not null and different from current chatHistoryId
      if (chatId !== null && chatId !== chatHistoryId) {
        if (DEBUG) {
          console.log("Loading chat history for chatId:", chatId);
        }
        setChatHistoryId(chatId);
        
        try {
          if (DEBUG) {
            console.log("Fetching chat history from API...");
          }
          const response = await fetch(`${API_URL}/chat-history/conversation/${chatId}`);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch chat history: ${response.status}`);
          }
          
          const history = await response.json();
          
          if (DEBUG) {
            console.log("Received chat history from API");
          }
          
          if (history && history.messages && history.messages.length > 0) {
            // Create a new array to ensure React detects the change
            const newMessages = history.messages.map((msg, index) => ({
              id: index + 1,
              type: msg.role as "system" | "user" | "assistant",
              content: msg.content,
              isLegalDraft: msg.isLegalDraft || false,
              draftContent: msg.draftContent || null,
              sourceFiles: msg.sourceFiles || [],
              sourceDocuments: msg.sourceDocuments || []
            }));
            
            setMessages(newMessages);
            
            // Also update the context with a new object to ensure React detects the change
            const updatedHistory = JSON.parse(JSON.stringify(history));
            setCurrentChatHistory(updatedHistory);
          } else {
            if (DEBUG) {
              console.log("No messages found in chat history or history is null");
            }
            // Set a default message if no messages found
            setMessages([
              {
                id: 1,
                type: "system",
                content: "No messages found in this chat history.",
              },
            ]);
          }
        } catch (error) {
          console.error("Error loading chat history:", error);
          // Show error message to user
          setMessages([
            {
              id: 1,
              type: "system",
              content: "Error loading chat history. Please try again.",
            },
          ]);
        }
      }
    };
    
    loadChatFromUrl();
    
    // Add event listener for URL changes
    window.addEventListener('popstate', loadChatFromUrl);
    
    // Clean up event listener
    return () => {
      window.removeEventListener('popstate', loadChatFromUrl);
    };
  }, [chatId, API_URL, setCurrentChatHistory, chatHistoryId]);

  const createMarkup = (content: string, fileName: string | undefined) => {
    if (!content) return { __html: "" };

    const processedContent = content.replace(
      /(?:\(page\s*(\d+)\)|\(p\.?\s*(\d+)\)|\((\d+)\))/gi,
      (_, p1, p2, p3) => {
        const pageNum = p1 || p2 || p3;
        return `<span>${pageNum}</span>`;
      }
    );

    return { __html: processedContent };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("response === ");
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      type: "user",
      content: inputMessage,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputMessage("");
    setIsLoading(true);

    // Always send the message to the backend, even for greetings
    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage,
          patientName: selectedPatient,
          chatHistoryId: chatHistoryId
        }),
      });

      
      const data = await response.json();
      console.log("response === ", data.sourceFiles || []);

      // Convert sourceFiles to sourceDocuments if needed
      const sourceDocuments = data.sourceDocuments || 
        (data.sourceFiles ? data.sourceFiles.map(filename => ({
          filename,
          source: 'local'
        })) : []);

      const assistantMessage: Message = {
        id: messages.length + 2,
        type: "assistant",
        content: data.content,
        confidence: data.confidence,
        fileName: data.fileName,
        isLegalDraft: data.isLegalDraft || false,
        draftContent: data.draftContent || null,
        sourceFiles: data.sourceFiles || [],
        sourceDocuments: sourceDocuments
      };
      
      // Log source files if available
      if (sourceDocuments.length > 0) {
        console.log('Draft created using knowledge from:', sourceDocuments.map(doc => doc.filename).join(', '));
      }

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Update chatHistoryId if it's a new conversation
      if (data.chatHistoryId && !chatHistoryId) {
        setChatHistoryId(data.chatHistoryId);
        // Update URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.set('chat', data.chatHistoryId);
        window.history.pushState({}, '', url);
        
        // Refresh chat histories to show the new chat in the sidebar
        fetchChatHistories();
      }
    } catch (error) {
      console.error("Error:", error);
      const errorMessage: Message = {
        id: messages.length + 2,
        type: "assistant",
        content: "Sorry, there was an error processing your request.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (message: Message) => {
    if (message.type === "assistant" && message.fileName) {
      currentFileNameRef.current = message.fileName;
    }

    return (
      <div className={`message ${message.type}`}>
        <div className="message-content">
          {message.type === "assistant" && (
            <div className="assistant-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
            </div>
          )}
          {message.type === "user" && (
            <div className="user-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
          <div className="message-bubble">
            {message.isLegalDraft && message.content ? (
              <div>
                <div 
                  className="legal-draft-message"
                  onClick={() => {
                    setSelectedDraft(message.content || null);
                    setPdfUrl(null); // Clear any PDF that might be showing
                  }}
                >
                  Here is your draft: <span className="view-draft-link">(Click to view)</span>
                </div>
                {(message.sourceDocuments && message.sourceDocuments.length > 0) ? (
                  <div className="source-files">
                    <small>Sources: </small>
                    {message.sourceDocuments.map((doc, index) => (
                      <span 
                        key={index} 
                        className="source-document-link"
                        onClick={() => {
                          setSelectedDocument(doc);
                          setPdfUrl(null); // Clear any PDF that might be showing
                          setSelectedDraft(null); // Clear any draft that might be showing
                        }}
                      >
                        {doc.filename}
                        {doc.source === 's3' && <small> (S3)</small>}
                      </span>
                    ))}
                  </div>
                ) : (message.sourceFiles && message.sourceFiles.length > 0) && (
                  <div className="source-files">
                    <small>Sources: </small>
                    {message.sourceFiles.map((file, index) => (
                      <span 
                        key={index} 
                        className="source-document-link"
                        onClick={() => {
                          setSelectedDocument({
                            filename: file,
                            source: 'local'
                          });
                          setPdfUrl(null); // Clear any PDF that might be showing
                          setSelectedDraft(null); // Clear any draft that might be showing
                        }}
                      >
                        {file}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="message-content-text"
                dangerouslySetInnerHTML={createMarkup(
                  message.content,
                  message.fileName
                )}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {componentLoading ? (
        <LoadingAnimation
          title="Loading Chat"
          subtitle="Preparing your chat experience..."
        />
      ) : (
        <div className={`ask-anything-container ${pdfUrl ? "with-pdf" : ""}`}>
          {selectedDocument ? (
            <div className="pdf-section">
              <DocumentViewer 
                filename={selectedDocument.filename} 
                source={selectedDocument.source}
                s3Key={selectedDocument.s3Key}
                onClose={() => setSelectedDocument(null)} 
              />
            </div>
          ) : selectedDraft ? (
            <div className="pdf-section">
              <div className="pdf-header">
                <h3>Legal Draft</h3>
                <button className="close-pdf" onClick={() => setSelectedDraft(null)}>
                  ×
                </button>
              </div>
              <div className="draft-container">
                <pre>{selectedDraft}</pre>
                <div className="draft-footer">
                  <div className="last-edited">Last edited just now</div>
                  <button 
                    className="copy-button"
                    onClick={() => copyToClipboard(selectedDraft || '')}
                  >
                    {copySuccess ? (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="pdf-section">
              <div className="pdf-placeholder">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{color: "white"}}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 style={{color: "white"}}>There is nothing to display</h3>
              </div>
            </div>
          )}
          <div className="chat-section">
            <div className="chat-header">
              <h1>Ask Anything</h1>
              <p>Ask questions about anything</p>
            </div>
            <div className="chat-window">
              <div className="messages-container">
                {messages.map((message) => (
                  <div key={message.id}>{renderMessage(message)}</div>
                ))}
                {isLoading && (
                  <div className="message assistant">
                    <div className="message-content">
                      <div className="assistant-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 16v-4" />
                          <path d="M12 8h.01" />
                        </svg>
                      </div>
                      <div className="message-bubble">
                        <div className="llm-analyzing-spinner">
                          <div className="spinner-bars" aria-label="Loading">
                            <div className="spinner-bar bar1"></div>
                            <div className="spinner-bar bar2"></div>
                            <div className="spinner-bar bar3"></div>
                            <div className="spinner-bar bar4"></div>
                            <div className="spinner-bar bar5"></div>
                            <div className="spinner-bar bar6"></div>
                            <div className="spinner-bar bar7"></div>
                            <div className="spinner-bar bar8"></div>
                            <div className="spinner-bar bar9"></div>
                            <div className="spinner-bar bar10"></div>
                            <div className="spinner-bar bar11"></div>
                            <div className="spinner-bar bar12"></div>
                          </div>
                          <span className="analyzing-text">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSubmit} className="input-container">
                <textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (!e.shiftKey) {
                        e.preventDefault(); // Prevent default to avoid adding a newline
                        handleSubmit(e); // Submit the form
                      }
                      // If Shift+Enter, do nothing and let the default behavior (new line) occur
                    }
                  }}
                  placeholder="Type your question..."
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AskAnything;
