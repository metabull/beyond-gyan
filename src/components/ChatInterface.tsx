import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import CreditsDisplay from './CreditsDisplay';
import DocumentSidebar from './DocumentSidebar';
import type { Document } from '../utils/apiService';
import { getBeyondSdk } from '../utils/beyondSdk';
import { apiService } from '../utils/apiService';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatInterfaceProps {
  userEmail: string;
  onSignOut: () => void;
  documents: Document[];
  onDocumentAdded: (document: Document) => void;
  onDocumentDeleted: (documentId: string) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  userEmail, 
  onSignOut, 
  documents, 
  onDocumentAdded,
  onDocumentDeleted
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: Message = {
      id: '1',
      content: `🤖 **Welcome to your AI-powered Document Knowledge Base!**

I'm your intelligent document assistant with access to permanently stored content on Irys. Here's what I can help you with:

📚 **Document Analysis**: Ask me questions about any documents you've added - I have access to their full content, not just summaries

🔍 **Deep Research**: I can analyze, compare, and find connections across all your stored documents  

📝 **Content Creation**: Request summaries, newsletters, reports, or insights based on your document collection

🎯 **Smart Search**: Ask about specific topics and I'll reference relevant information from your documents with citations

**Current Status**: ${documents.length > 0 ? `I have access to ${documents.length} document(s) in your knowledge base` : 'No documents added yet - use the sidebar to start building your knowledge base!'}

Try asking: "What are the main topics covered in my documents?" or "Summarize the key insights from my stored content"`,
      role: 'assistant',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, [userEmail, documents.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const generateMessageId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || loading) return;

    const userMessage: Message = {
      id: generateMessageId(),
      content: inputValue.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      // Get enhanced context from backend API
      console.log('🤖 Getting enhanced document context from backend...');
      const contextData = await apiService.sendChatMessage(userMessage.content, documents.length > 0);

      console.log('📚 Backend provided context for', contextData.documentsUsed, 'documents');
      console.log('📝 System prompt length:', contextData.systemPrompt.length, 'characters');

      // Get initialized Beyond SDK
      const beyond = await getBeyondSdk();

      // Import CHAT_MODELS from the SDK
      const { CHAT_MODELS } = await import('@Beyond-Network-AI/beyond-ai');

      // Create comprehensive prompt with system context + user message
      const messages = [
        {
          role: 'system' as const,
          content: contextData.systemPrompt
        },
        {
          role: 'user' as const,
          content: userMessage.content
        }
      ];

      console.log('🚀 Sending to Beyond AI with full document context...');

      // Send to Beyond AI with enhanced context
      const response = await beyond.chat.createCompletion({
        model: CHAT_MODELS.LLAMA_8B,
        messages: messages,
        temperature: 0.7,
        stream: true
      });

      let aiResponseContent = '';
      if ('content' in response) {
        aiResponseContent = response.content;
      } else {
        aiResponseContent = response.choices[0]?.message?.content || 'No response generated';
      }

      const aiMessage: Message = {
        id: generateMessageId(),
        content: aiResponseContent,
        role: 'assistant',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

      // Log success
      console.log('✅ AI response generated using', contextData.documentsUsed, 'documents');

    } catch (err: any) {
      console.error('❌ Chat error:', err);
      let errorMessage = `Sorry, I encountered an error: ${err.message || 'Unknown error'}. Please ensure you're authenticated and try again.`;

      // Handle specific error cases
      if (err.message && err.message.includes("Monthly usage limit exceeded")) {
        errorMessage = "You do not have enough credits to use Beyond AI Agent / chat feature.";
      } else if (err.message && err.message.includes("429")) {
        errorMessage = "You do not have enough credits to use Beyond AI Agent / chat feature.";
      } else if (err.message && err.message.includes("insufficient")) {
        errorMessage = "You do not have enough credits to use Beyond AI Agent / chat feature.";
      }
      const errorMessageObject: Message = {
        id: generateMessageId(),
        content: errorMessage,
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessageObject]);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentAdded = (document: Document) => {
    onDocumentAdded(document);

    // Add confirmation message
    const confirmationMessage: Message = {
      id: generateMessageId(),
      content: `✅ **Document "${document.title}" successfully added to your knowledge base!**

🌐 **Permanently stored on Irys**: [View Document](${document.irysUrl})

🤖 **I now have full access to this content** and can:
- Answer detailed questions about the document
- Quote specific sections and provide citations
- Compare it with your other stored documents
- Include it in summaries and analysis
- Use it to provide context-aware responses

Try asking me: "What is this document about?" or "How does this relate to my other documents?"`,
      role: 'assistant',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, confirmationMessage]);
  };

  const handleSignOut = async () => {
    try {
      // Get initialized Beyond SDK
      const beyond = await getBeyondSdk();
      await beyond.auth.email.signOut();
      onSignOut();
    } catch (err) {
      console.error('Sign out error:', err);
      onSignOut(); // Sign out anyway
    }
  };

  return (
    <div className="chat-interface-with-sidebar">
      <header className="chat-header">
        <div className="header-brand">
          <img src="/logo.svg" alt="Beyond Gyan Logo" className="header-logo" />
          <div className="user-info">
            <h2>Beyond Gyan</h2>
            <p className="subtitle">Powered by IRYS</p>
          </div>
        </div>
        <div className="header-actions">
          <CreditsDisplay />
          <button onClick={handleSignOut} className="sign-out-button">
            Sign Out
          </button>
        </div>
      </header>

      <div className="chat-main-content">
        <div className="chat-section">
          <div className="chat-messages">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {loading && (
              <div className="message-bubble assistant">
                <div className="message-content">
                  <div className="message-text">
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} className="chat-input-form">
            <div className="chat-input-container">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  documents.length > 0 
                    ? `Ask me anything about your ${documents.length} stored document(s)...`
                    : "Add documents first, then ask me anything about them..."
                }
                disabled={loading}
                className="chat-input"
              />
              <button 
                type="submit" 
                disabled={!inputValue.trim() || loading}
                className="send-button"
              >
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </form>
        </div>

        <div className="sidebar-section">
          <DocumentSidebar 
            documents={documents}
            onDocumentAdded={handleDocumentAdded} 
            onDocumentDeleted={onDocumentDeleted} 
          />
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;