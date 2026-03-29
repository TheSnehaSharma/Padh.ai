import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, Sparkles, Search, MessageSquare, Bot, User, FileText, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { askAssistant } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAccessibilityStore } from '@/store/accessibility';
import { useChatStore, Message } from '@/store/chat';
import { fadeIn, slideUp } from '@/lib/animations';
import { BionicText } from '@/lib/bionic-text';
import { ReadAloudButton } from '@/components/a11y/DyslexiaWrapper';
import ReactMarkdown from 'react-markdown';

export const ChatPage = () => {
  const { messages, addMessage } = useChatStore();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isADHDMode } = useAccessibilityStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue
    };

    addMessage(userMessage);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await askAssistant(userMessage.text, "");
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: response.response,
        source: response.source || 'llm',
        sourceName: response.sourceName,
        sourceUrl: response.sourceUrl
      };
      addMessage(aiMessage);
    } catch (error) {
      console.error("Chatbot error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto space-y-8">
          {messages.length === 0 && (
            <motion.div 
              variants={fadeIn}
              initial="initial"
              animate="animate"
              className="text-center py-20 space-y-4"
            >
              <div className="bg-primary/10 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">How can I help you study today?</h1>
              <p className="text-muted-foreground">Ask about any topic, derivation, or concept.</p>
            </motion.div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              variants={slideUp}
              initial="initial"
              animate="animate"
              className={cn(
                "flex gap-4",
                msg.role === 'user' ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                {msg.role === 'user' ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
              </div>

              <div className={cn(
                "flex flex-col max-w-[85%]",
                msg.role === 'user' ? "items-end" : "items-start"
              )}>
                <div className={cn(
                  "prose prose-sm sm:prose-base dark:prose-invert max-w-none break-words",
                  msg.role === 'user' 
                    ? "bg-primary text-primary-foreground px-4 py-3 rounded-2xl rounded-tr-sm" 
                    : "bg-transparent px-0 py-0 text-black dark:text-foreground"
                )}>
                  {isADHDMode ? (
                    <BionicText text={msg.text} />
                  ) : (
                    <ReactMarkdown 
                      components={{
                        // Override link styling
                        a: ({node, ...props}) => <a {...props} className="text-primary underline underline-offset-4 hover:text-primary/80" target="_blank" rel="noopener noreferrer" />,
                        // Style code blocks
                        code: ({node, className, children, ...props}) => {
                          const match = /language-(\w+)/.exec(className || '')
                          return !className ? (
                            <code {...props} className="bg-muted px-1.5 py-0.5 rounded font-mono text-sm">
                              {children}
                            </code>
                          ) : (
                            <code {...props} className={className}>
                              {children}
                            </code>
                          )
                        },
                        // Ensure bold text is black
                        strong: ({node, ...props}) => <strong {...props} className="font-bold text-foreground" />
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  )}
                </div>

                {/* Metadata / Actions */}
                <div className="flex items-center gap-2 mt-2">
                  {msg.role === 'ai' && (
                    <>
                      <ReadAloudButton text={msg.text} />
                      
                      {/* Source Attribution */}
                      <div className="flex items-center gap-2">
                        {msg.source === 'pdf' && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                            <FileText className="h-3 w-3 text-primary" />
                            {msg.sourceName || "Uploaded Document"}
                          </span>
                        )}
                        
                        {msg.source === 'search' && (
                          <a 
                            href={msg.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium px-2 py-0.5 bg-secondary rounded-full border hover:bg-secondary/80 transition-colors"
                          >
                            <Search className="h-3 w-3" />
                            {msg.sourceName || "Web Source"}
                            <ExternalLink className="h-2 w-2 ml-0.5" />
                          </a>
                        )}
                        
                        {(!msg.source || msg.source === 'llm') && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> AI
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Bot className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-background/80 backdrop-blur-lg border-t border-border sticky bottom-0 z-10">
        <div className="max-w-3xl mx-auto relative">
          <form 
            className="relative flex items-end gap-2 bg-muted/30 p-2 rounded-2xl border border-input focus-within:ring-2 focus-within:ring-ring/20 transition-all"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <Input 
              placeholder="Ask anything..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 min-h-[48px] max-h-32 border-0 bg-transparent focus-visible:ring-0 resize-none py-3 px-4 shadow-none"
              autoFocus
            />
            <Button 
              type="submit"
              size="icon" 
              className="h-10 w-10 rounded-xl mb-1 mr-1 shrink-0"
              disabled={isLoading || !inputValue.trim()}
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
          <p className="text-[10px] text-center text-muted-foreground mt-2">
            AI can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
};

function Loader2({ className }: { className?: string }) {
  return (
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
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
