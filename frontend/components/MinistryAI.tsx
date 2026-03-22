import React, { useState, useRef, useEffect } from 'react';
import { generateMinistryChatResponse, ChatMessage } from '../services/geminiService';
import { Sparkles, Loader2, X, Send, User, Bot } from 'lucide-react';

interface MinistryAIProps {
  onClose: () => void;
}

const MinistryAI: React.FC<MinistryAIProps> = ({ onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Real data state
  const [attData, setAttData] = useState<any[]>([]);
  const [sData, setSData] = useState<any[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const { analyticsService } = await import('../services/analyticsService');
        const attendance = await analyticsService.fetchAttendanceAnalytics();
        const souls = await analyticsService.fetchSoulWinningAnalytics();
        
        setAttData(attendance || []);
        setSData(souls || []);

        setLoading(true);
        const result = await generateMinistryChatResponse(attendance || [], souls || [], []);
        
        setMessages([{ role: 'model', text: result }]);
      } catch (e) {
        console.error(e);
        setMessages([{ role: 'model', text: "Hello! I encountered an error loading your data, but I'm still here to help answer questions if I can." }]);
      }
      setLoading(false);
      setIsInitializing(false);
    };

    initializeChat();
  }, []);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    const newMessages: ChatMessage[] = [...messages, { role: 'user', text: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const responseText = await generateMinistryChatResponse(attData, sData, messages, userMessage);
      setMessages([...newMessages, { role: 'model', text: responseText }]);
    } catch (error) {
       setMessages([...newMessages, { role: 'model', text: "Sorry, I ran into an error generating a response. Please try again." }]);
    }
    
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-ministry-card w-full max-w-3xl rounded-3xl border border-ministry-neon/50 shadow-2xl flex flex-col h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white rounded-t-3xl">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-ministry-neon to-ministry-orange p-2 rounded-xl">
               <Sparkles className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-ministry-text">Ministry AI Insights</h2>
              <p className="text-sm text-gray-500">Intelligent Data Assistant</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
          {isInitializing ? (
            <div className="flex flex-col items-center justify-center h-full">
               <Loader2 className="w-12 h-12 text-ministry-orange animate-spin mb-4" />
               <p className="text-gray-500 animate-pulse">Analyzing dashboard data & generating summary...</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  <div className={`flex-shrink-0 flex items-end ${msg.role === 'user' ? 'ml-3' : 'mr-3'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-ministry-neon' : 'bg-gradient-to-br from-gray-700 to-gray-900'}`}>
                      {msg.role === 'user' ? <User className="w-4 h-4 text-black" /> : <Bot className="w-4 h-4 text-white" />}
                    </div>
                  </div>

                  <div className={`rounded-2xl p-4 shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-ministry-neon/20 border border-ministry-neon/30 text-gray-800' 
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}>
                    {msg.role === 'model' ? (
                       <div className="prose prose-sm max-w-none whitespace-pre-line leading-relaxed">
                         {msg.text}
                       </div>
                    ) : (
                       <p className="whitespace-pre-wrap">{msg.text}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {loading && !isInitializing && (
            <div className="flex justify-start">
               <div className="flex bg-white rounded-2xl p-4 shadow-sm border border-gray-200 ml-11">
                 <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200 rounded-b-3xl">
          <form onSubmit={handleSendMessage} className="flex space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask a question about your ministry data..."
              className="flex-1 bg-gray-100 border-none rounded-2xl px-5 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-ministry-neon/50"
              disabled={loading || isInitializing}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading || isInitializing}
              className="bg-ministry-neon flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
            >
              <Send className="w-5 h-5 text-black ml-1" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default MinistryAI;