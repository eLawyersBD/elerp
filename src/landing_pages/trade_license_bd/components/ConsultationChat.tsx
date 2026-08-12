/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from '../motion';
import { 
  X, 
  Send, 
  MessageSquare, 
  User, 
  HelpCircle, 
  Sparkles, 
  Clock, 
  PhoneCall, 
  MessageCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

interface ConsultationChatProps {
  isOpen: boolean;
  onClose: () => void;
  selectedService?: string;
  businessType?: string;
}

interface ChatMessage {
  id: string;
  sender: 'consultant' | 'user';
  text: string;
  timestamp: string;
}

// Built-in answers to support users filling the form in real-time
const PRESET_FAQ = [
  {
    q: "What documents do I need for Sole Proprietorship?",
    a: "For Sole Proprietorship, you need: 1) NID copy of the owner, 2) Passport-size photos, 3) Land rental agreement/holding tax receipt of your office, and 4) A declaration of nature of business. You can attach these in Section 3 of the form!"
  },
  {
    q: "How long does it take to get a Trade License?",
    a: "The standard process takes 7 to 10 business days for City Corporations. If you select 'Urgent Support' in the pricing or form, our consultants can fast-track the municipal physical filing to 3 to 5 business days!"
  },
  {
    q: "Can I use my residential address for an online business?",
    a: "Yes! For e-commerce, software development, or freelancing, we can file the license using a residential address under City Corporation guidelines. You'll need either a rent deed or a utilities bill in your name/family member's name."
  },
  {
    q: "How are the official government fees calculated?",
    a: "Government fees are based on your business type, capital, and City Corp zone. They range from ৳3,000 to ৳15,000, including a 15% VAT and 15% Signboard Tax. You can use our Price Estimator in the Pricing section to calculate the exact figure!"
  }
];

export default function ConsultationChat({ isOpen, onClose, selectedService, businessType }: ConsultationChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat with warm greetings
  useEffect(() => {
    if (messages.length === 0) {
      const greetText = `Assalamu Alaikum! I am Sabrina, your E-Lawyers licensing consultant. I see you are exploring licensing options${selectedService ? ` for "${selectedService}"` : ''}. How can I assist you in completing your consultation request today?`;
      setMessages([
        {
          id: 'welcome-1',
          sender: 'consultant',
          text: greetText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [selectedService]);

  // Scroll to bottom on messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate real consultant responding with helpful legal/process info after 1-2s
    setTimeout(() => {
      let replyText = "Thank you for asking. Our team handles filings across all Dhaka City Corporation zones, Chattogram, and other Pourashavas. Let's discuss this! If you complete the consultation form, I can review your custom dossier immediately. Would you like to proceed with WhatsApp support too?";

      // Basic semantic search matching
      const query = textToSend.toLowerCase();
      if (query.includes('document') || query.includes('doc') || query.includes('nid') || query.includes('paper')) {
        replyText = "For trade licensing, the primary papers needed are: National ID of the owner, passport photo, and office space rental deed. If you are a company, RJSC Articles of Association and Form XII are required. You can complete the form now and our system will generate your custom checklist!";
      } else if (query.includes('fee') || query.includes('cost') || query.includes('charge') || query.includes('price')) {
        replyText = "Government licensing fees range from BDT 3,000 to 15,000 depending on your City Corporation zone and line of business. E-Lawyers service charges start at only BDT 3,000. All official government receipt challans are uploaded directly to your Client Portal Dashboard for absolute transparency.";
      } else if (query.includes('time') || query.includes('day') || query.includes('duration') || query.includes('fast')) {
        replyText = "Regular processing takes about 7-10 business days. For fast-track cases (Urgent mode), we complete the physical ledger inspection and deliver your booklet within 3-5 business days. Please mark 'Urgent' when submitting the consultation form!";
      } else if (query.includes('address') || query.includes('office') || query.includes('home') || query.includes('residential')) {
        replyText = "We can process licenses with commercial or residential addresses in Bangladesh. For residential spaces, e-commerce or digital services are generally approved easily. Just put your available address in Section 2, and we'll advise if any extra documents are needed.";
      }

      const consultantMsg: ChatMessage = {
        id: 'consultant-' + Date.now(),
        sender: 'consultant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, consultantMsg]);
      setIsTyping(false);
    }, 1200);
  };

  const handleFAQClick = (faq: typeof PRESET_FAQ[0]) => {
    const userMsg: ChatMessage = {
      id: 'faq-q-' + Date.now(),
      sender: 'user',
      text: faq.q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setTimeout(() => {
      const consultantMsg: ChatMessage = {
        id: 'faq-a-' + Date.now(),
        sender: 'consultant',
        text: faq.a,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, consultantMsg]);
      setIsTyping(false);
    }, 1000);
  };

  // Dedicated Support Channel WhatsApp redirect with custom pre-filled message
  const getWhatsAppLink = () => {
    const defaultMsg = encodeURIComponent("Hello E-Lawyers! I am on your website and would like real-time support on my Trade License Application.");
    return `https://api.whatsapp.com/send?phone=8801712345678&text=${defaultMsg}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-end sm:items-center justify-center sm:justify-end sm:p-6 bg-slate-900/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: "spring", duration: 0.4 }}
        className="bg-white w-full sm:max-w-md h-[90vh] sm:h-[600px] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col justify-between overflow-hidden border border-slate-200"
      >
        {/* Header bar */}
        <div className="bg-[#0f172a] text-white p-4 flex items-center justify-between relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-blue-500/10" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="relative">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border-2 border-slate-800">
                S
              </div>
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 rounded-full ring-2 ring-[#0f172a]" />
            </div>
            <div className="text-left">
              <h4 className="text-xs font-bold font-display text-white flex items-center gap-1.5">
                Sabrina (Consultant)
                <Sparkles className="h-3 w-3 text-amber-400" />
              </h4>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online | Average reply: 1 min
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* WhatsApp Banner */}
        <div className="bg-emerald-50 border-y border-emerald-100 p-2.5 px-4 flex items-center justify-between shrink-0 text-left">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4.5 w-4.5 text-emerald-600 fill-emerald-600" />
            <span className="text-[10px] text-emerald-950 font-medium">Prefer WhatsApp Live Chat?</span>
          </div>
          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase transition-colors"
          >
            Open Chat
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Chat Body Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          
          {/* Active status bubble */}
          <div className="text-center">
            <span className="text-[9px] font-mono uppercase bg-slate-200/60 text-slate-500 px-2 py-0.5 rounded-full">
              SECURE CHAT INITIATED
            </span>
          </div>

          {messages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex items-start gap-2 max-w-[85%]">
                {msg.sender === 'consultant' && (
                  <div className="h-7 w-7 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-1">
                    EL
                  </div>
                )}
                
                <div className="text-left">
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-400 font-light mt-1 block px-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Typing state indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2 max-w-[80%]">
                <div className="h-7 w-7 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-1">
                  EL
                </div>
                <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Preset FAQ / Helpers (scrolling container above inputs) */}
        <div className="border-t border-slate-100 bg-white p-3 shrink-0 text-left space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
            <HelpCircle className="h-3 w-3 text-blue-600" />
            Suggested Questions:
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pb-1">
            {PRESET_FAQ.map((faq, index) => (
              <button
                key={index}
                onClick={() => handleFAQClick(faq)}
                className="text-[10px] font-medium text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-full px-3 py-1 text-left transition-colors cursor-pointer"
              >
                {faq.q}
              </button>
            ))}
          </div>
        </div>

        {/* Input box */}
        <div className="p-3 bg-white border-t border-slate-100 flex gap-2 items-center shrink-0">
          <input
            type="text"
            placeholder="Type your licensing question here..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendMessage(inputValue);
            }}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 text-slate-900"
          />
          <button
            onClick={() => handleSendMessage(inputValue)}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shrink-0 transition-colors cursor-pointer"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

      </motion.div>
    </div>
  );
}
