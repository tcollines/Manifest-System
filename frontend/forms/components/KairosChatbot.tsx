import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Loader2, MapPin, Upload, Camera, ArrowUp, Plus } from 'lucide-react';
import type { Form, FormField, AnswerValue } from '../types/forms.types';
import PhoneField from './fields/PhoneField';

type Sender = 'bot' | 'user';
interface ChatMessage {
  id: string;
  sender: Sender;
  content: React.ReactNode;
}

interface KairosChatbotProps {
  form: Form;
  onSubmit: (answers: Record<string, AnswerValue>) => void;
  submitting: boolean;
}

const formatValueForDisplay = (val: AnswerValue, field: FormField): React.ReactNode => {
  if (val === null || val === undefined || val === '') return 'Skipped';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'object' && 'lat' in val) {
    return <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Location Captured</div>;
  }
  if (field.type === 'file' || field.type === 'image') {
    if (typeof val === 'string' && val.startsWith('data:image')) {
       return <img src={val} alt="uploaded" className="w-32 h-32 object-cover rounded-lg" />;
    }
    return <div className="flex items-center gap-1"><Upload className="w-3 h-3" /> File Uploaded</div>;
  }
  return String(val);
};

const KairosChatbot: React.FC<KairosChatbotProps> = ({ form, onSubmit, submitting }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [isTyping, setIsTyping] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const addBotMessage = (content: React.ReactNode) => {
    setMessages(prev => [...prev, { id: Math.random().toString(), sender: 'bot', content }]);
  };

  const addUserMessage = (content: React.ReactNode) => {
    setMessages(prev => [...prev, { id: Math.random().toString(), sender: 'user', content }]);
  };

  useEffect(() => {
    if (hasStarted) return;
    setHasStarted(true);

    let cancelled = false;
    const start = async () => {
      setIsTyping(true);
      await new Promise(r => setTimeout(r, 800));
      if (cancelled) return;
      setIsTyping(false);
      
      addBotMessage(
        <span>Hi! I'm <strong>Kairos</strong>. I'll be guiding you through "{form.title}".</span>
      );
      
      if (form.description) {
        setIsTyping(true);
        await new Promise(r => setTimeout(r, 1000));
        if (cancelled) return;
        setIsTyping(false);
        addBotMessage(form.description);
      }

      if (form.fields.length > 0) {
        askNextQuestion(0);
      } else {
        addBotMessage("This form has no questions!");
      }
    };
    start();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  const askNextQuestion = async (index: number) => {
    const nextField = form.fields[index];
    if (!nextField) return;
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 800));
    setIsTyping(false);
    
    let msg = nextField.ai_question || nextField.label;
    if (nextField.required && !nextField.ai_question) msg += " *";
    
    if (nextField.description && !nextField.ai_question) {
       addBotMessage(
         <div>
           <p>{msg}</p>
           <p className="text-sm text-gray-500 mt-1">{nextField.description}</p>
         </div>
       );
    } else {
       addBotMessage(msg);
    }
  };

  const handleAnswer = async (val: AnswerValue) => {
    const field = form.fields[currentFieldIndex];
    
    if (field.required) {
      const isGpsValue = val !== null && typeof val === 'object' && !Array.isArray(val);
      const empty = !isGpsValue && (val === null || val === undefined || val === '' || (Array.isArray(val) && val.length === 0));
      if (empty) return; 
    }

    const nextAnswers = { ...answers, [field.id]: val };
    setAnswers(nextAnswers);
    addUserMessage(formatValueForDisplay(val, field));
    
    const nextIdx = currentFieldIndex + 1;
    setCurrentFieldIndex(nextIdx);
    
    if (nextIdx >= form.fields.length) {
       setIsTyping(true);
       await new Promise(r => setTimeout(r, 800));
       setIsTyping(false);
       addBotMessage("All done! I'm submitting your answers now...");
       onSubmit(nextAnswers);
    } else {
       askNextQuestion(nextIdx);
    }
  };

  const field = form.fields[currentFieldIndex];
  const isFinished = currentFieldIndex >= form.fields.length;

  return (
    <div className="flex flex-col h-[100dvh] bg-transparent font-sans text-gray-900 max-w-2xl mx-auto relative overflow-hidden">
      
      {/* Ultra Minimal Header */}
      <header className="shrink-0 h-16 flex items-center justify-center px-6 z-10 relative">
        <span className="text-[13px] font-semibold text-gray-400 tracking-wide uppercase">{form.title}</span>
      </header>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-40 space-y-8 flex flex-col items-center">
        
        {/* The 3D Orb Intro */}
        <div className="flex flex-col items-center mt-4 mb-8">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#ff3b30] via-[#ff9500] to-[#ffcc00] shadow-[0_10px_40px_rgba(255,149,0,0.4)] relative animate-[pulse_4s_ease-in-out_infinite]">
            <div className="absolute inset-0 rounded-full bg-white/20 blur-[2px] mix-blend-overlay"></div>
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/50 to-transparent opacity-60"></div>
          </div>
        </div>

        {messages.map(msg => (
          <div key={msg.id} className={`w-full flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'user' ? (
               <div className="bg-gray-100/80 backdrop-blur text-gray-800 px-4 sm:px-5 py-2.5 sm:py-3.5 rounded-2xl rounded-br-sm max-w-[85%] sm:max-w-[80%] text-[14px] sm:text-[15px] font-medium shadow-sm border border-white/50">
                 {msg.content}
               </div>
            ) : (
               <div className="flex gap-3 max-w-[90%] sm:max-w-[85%] items-end">
                 <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#ff3b30] via-[#ff9500] to-[#ffcc00] shadow-sm shrink-0 mb-1"></div>
                 <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-100/50 text-gray-800 text-[14.5px] sm:text-[16px] leading-relaxed px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl rounded-bl-sm font-medium shadow-[0_4px_14px_rgba(251,191,36,0.15)]">
                   {msg.content}
                 </div>
               </div>
            )}
          </div>
        ))}

        {isTyping && (
           <div className="w-full flex justify-start">
             <div className="flex gap-3 max-w-[85%] items-end">
               <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#ff3b30] via-[#ff9500] to-[#ffcc00] shadow-sm shrink-0 mb-1"></div>
               <div className="bg-amber-50/80 backdrop-blur-sm border border-amber-100/50 px-5 py-4 rounded-2xl rounded-bl-sm shadow-[0_4px_14px_rgba(251,191,36,0.15)] flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                 <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                 <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" />
               </div>
             </div>
           </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Floating Input Area */}
      {!isFinished && !isTyping && field && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#fafafa] via-[#fafafa] to-transparent z-20 flex flex-col items-center gap-4">
           <ChatInputAdapter field={field} onAnswer={handleAnswer} submitting={submitting} />
        </div>
      )}

    </div>
  );
};

export default KairosChatbot;

// ─── Input Adapter ────────────────────────────────────────────────────────────

const ChatInputAdapter: React.FC<{
  field: FormField;
  onAnswer: (val: AnswerValue) => void;
  submitting: boolean;
}> = ({ field, onAnswer, submitting }) => {
  const [text, setText] = useState('');
  const [multiSel, setMultiSel] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    setText('');
    setMultiSel([]);
  }, [field.id]);

  const handleTextSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (field.required && !text.trim()) return;
    
    if (field.type === 'number') {
      onAnswer(text.trim() === '' ? null : Number(text));
    } else {
      onAnswer(text.trim());
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onAnswer(reader.result as string);
    reader.readAsDataURL(file);
  };

  let quickActions = null;
  const isChoice = ['yes_no', 'radio', 'dropdown', 'multi_select', 'file', 'image', 'gps'].includes(field.type);

  if (field.type === 'yes_no') {
    quickActions = (
      <div className="flex gap-2 w-full max-w-sm">
         <button onClick={() => onAnswer(true)} className="flex-1 py-3 bg-white border border-gray-100 shadow-sm rounded-2xl text-[15px] font-semibold text-gray-800 hover:bg-gray-50 transition-all">Yes</button>
         <button onClick={() => onAnswer(false)} className="flex-1 py-3 bg-white border border-gray-100 shadow-sm rounded-2xl text-[15px] font-semibold text-gray-800 hover:bg-gray-50 transition-all">No</button>
      </div>
    );
  } else if (field.type === 'radio' || field.type === 'dropdown') {
    quickActions = (
      <div className="flex flex-wrap justify-center gap-2 max-w-md">
         {(field.options ?? []).map(o => (
           <button key={o} onClick={() => onAnswer(o)} className="px-5 py-2.5 bg-white border border-gray-100 shadow-sm rounded-2xl text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-all">
             {o}
           </button>
         ))}
      </div>
    );
  } else if (field.type === 'multi_select') {
    quickActions = (
      <div className="flex flex-col items-center gap-3 w-full max-w-md">
        <div className="flex flex-wrap justify-center gap-2">
           {(field.options ?? []).map(o => {
             const selected = multiSel.includes(o);
             return (
               <button 
                 key={o} 
                 onClick={() => setMultiSel(selected ? multiSel.filter(x => x !== o) : [...multiSel, o])}
                 className={`px-5 py-2.5 rounded-2xl text-[14px] font-medium transition-all ${
                   selected 
                     ? 'bg-[#111] text-white shadow-md border-transparent' 
                     : 'bg-white border border-gray-100 shadow-sm text-gray-700 hover:bg-gray-50'
                 }`}
               >
                 {o}
               </button>
             );
           })}
        </div>
        <button 
          onClick={() => onAnswer(multiSel)} 
          disabled={field.required && multiSel.length === 0}
          className="px-6 py-2.5 bg-[#111] text-white rounded-full text-sm font-bold shadow-lg disabled:opacity-50 transition-all"
        >
          Confirm Selection
        </button>
      </div>
    );
  } else if (field.type === 'file' || field.type === 'image') {
    quickActions = (
      <div className="w-full max-w-sm">
         <button 
           onClick={() => fileInputRef.current?.click()} 
           className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-gray-100 shadow-sm rounded-2xl text-[15px] font-semibold text-gray-800 hover:bg-gray-50 transition-all"
         >
            {field.type === 'image' ? <Camera className="w-5 h-5 text-gray-400" /> : <Upload className="w-5 h-5 text-gray-400" />}
            Upload {field.type === 'image' ? 'Image' : 'File'}
         </button>
         <input 
           ref={fileInputRef} 
           type="file" 
           accept={field.type === 'image' ? 'image/*' : '*'} 
           onChange={handleFile} 
           className="hidden" 
         />
      </div>
    );
  } else if (field.type === 'gps') {
    quickActions = (
      <div className="w-full max-w-sm">
         <button 
           onClick={() => {
             if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
             navigator.geolocation.getCurrentPosition(
               pos => onAnswer({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
               err => alert('Could not get location.')
             );
           }}
           className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-gray-100 shadow-sm rounded-2xl text-[15px] font-semibold text-gray-800 hover:bg-gray-50 transition-all"
         >
            <MapPin className="w-5 h-5 text-gray-400" /> Share Location
         </button>
      </div>
    );
  } else if (field.type === 'contact') {
    // handled normally
  }

  // Determine input type
  let inputType = 'text';
  if (field.type === 'number') inputType = 'number';
  if (field.type === 'datetime') inputType = field.dateOnly ? 'date' : field.timeOnly ? 'time' : 'datetime-local';
  if (field.type === 'contact' && field.contactType === 'email') inputType = 'email';

  return (
    <div className="flex flex-col items-center w-full gap-4">
       {quickActions}
       
       <form onSubmit={handleTextSubmit} className="w-full max-w-lg bg-white rounded-full shadow-[0_4px_20px_rgb(0,0,0,0.06)] border border-gray-100 p-1.5 flex items-center gap-2 transition-all focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.1)] focus-within:scale-[1.01]">
          <div className="pl-3 pr-1 text-gray-300"><Plus className="w-5 h-5"/></div>
          <input 
            type={inputType} 
            disabled={isChoice}
            value={text}
            onChange={e => setText(e.target.value)}
            className="flex-1 bg-transparent px-2 py-2 outline-none text-gray-800 placeholder-gray-400 text-[14px] sm:text-[15px] disabled:opacity-0 disabled:bg-transparent" 
            placeholder={isChoice ? "" : (field.placeholder || "Type your answer...")} 
          />
          {isChoice && (
             <div className="absolute left-14 text-gray-400 text-[14px] sm:text-[15px] pointer-events-none">
               Select an option above...
             </div>
          )}
          <button 
            type="submit"
            disabled={isChoice || (!text.trim() && field.required)}
            className="w-10 h-10 bg-[#111] disabled:bg-gray-200 disabled:text-gray-400 rounded-full text-white flex items-center justify-center shrink-0 shadow-sm hover:bg-black transition-all"
          >
             {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowUp className="w-5 h-5" />}
          </button>
       </form>
    </div>
  );
};
