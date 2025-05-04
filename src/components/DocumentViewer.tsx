import React, { useState, useEffect } from 'react';
import '../styles/DocumentViewer.css';
import { API_URL } from '../utils/utils.js';

interface DocumentViewerProps {
  filename: string;
  onClose: () => void;
  source?: 's3' | 'local';
  s3Key?: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  filename, 
  onClose,
  source = 'local',
  s3Key
}) => {
  const [document, setDocument] = useState<{
    content: string;
    filename: string;
    path: string;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Build the URL with query parameters for S3 if needed
        let url = `${API_URL}/documents/${encodeURIComponent(filename)}`;
        
        if (source === 's3') {
          url += `?source=s3`;
          if (s3Key) {
            url += `&key=${encodeURIComponent(s3Key)}`;
          }
        }
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'error') {
          throw new Error(data.message);
        }
        
        setDocument(data);
      } catch (error) {
        console.error('Error fetching document:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocument();
  }, [filename]);

  return (
    <div className="document-viewer">
      <div className="document-header">
        <h3>{filename}</h3>
        <button className="close-document" onClick={onClose}>×</button>
      </div>
      
      <div className="document-content">
        {loading ? (
          <div className="document-loading">
            <div className="spinner"></div>
            <p>Loading document...</p>
          </div>
        ) : error ? (
          <div className="document-error">
            <p>Error loading document: {error}</p>
          </div>
        ) : document ? (
          <div 
            className="document-html"
            dangerouslySetInnerHTML={{ __html: document.content }}
          />
        ) : (
          <div className="document-error">
            <p>No document content available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;
