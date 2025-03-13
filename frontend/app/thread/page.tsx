'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Wand2, LogOut, Expand, Shrink, Clipboard, RefreshCw, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/app/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Footer } from '@/components/footer';
import { useConfig } from '@/hooks/use-config';

// Add the TextSnippet interface
interface TextSnippet {
  name: string;
  value: string;
}


interface Author {
  id?: string;
  name: string;
  linkedinUrl?: string;
  threadUrl?: string;
  avatarUrl?: string;
}

interface Message {
  id: string;
  content: string;
  isFromMe: string;
  lastUpdated: string;
  linkedinProfileURL: string;
  recipientLinkedInFollowerCount: string;
  recipientName: string;
  avatar?: string;
  chatId?: string;
}

interface Thread {
  id: string;
  messages: Message[];
}

async function generateDraft(
  data: {
    toFullName: string;
    messageToReplyTo: string;
    messageCategory: string;
  },
  token: string
): Promise<{ draftReply: string }> {
  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-endpoint': 'linkedout/generate-draft'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    return { draftReply: result.draftReply };
  } catch (error) {
    return {
      draftReply: "Sorry, I couldn't generate a draft reply at the moment. Please try again later."
    };
  }
}

function Avatar({ author }: { author: Author }) {
  if (author.avatarUrl) {
    return (
      <img 
        src={author.avatarUrl} 
        alt={author.name}
        className="w-8 h-8 rounded-full"
      />
    );
  }

  const initials = author.name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const backgroundColor = stringToColor(author.name);

  return (
    <div 
      className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-primary-foreground'
      )}
      style={{ backgroundColor }}
    >
      {initials}
    </div>
  );
}

function MessageGroup({ message }: { message: Message }) {
  const isUrl = (text: string) => {
    const urlPattern = /https?:\/\/[^\s]+/g;
    return urlPattern.test(text);
  };

  const formatMessage = (content: string) => {
    if (!content) return '';
    
    // Split text into URLs and non-URLs
    const parts = content.split(/(https?:\/\/[^\s]+)/g);
    
    return parts.map((part, index) => {
      if (isUrl(part)) {
        return (
          <a 
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all inline-block"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {part}
          </a>
        );
      }
      return <span key={index} className="break-words">{part}</span>;
    });
  };

  const isMe = message.isFromMe === "true";
  const initial = message.recipientName ? message.recipientName[0]?.toUpperCase() : '?';
  const date = message.lastUpdated ? new Date(message.lastUpdated) : new Date();

  return (
    <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-8 group relative">
      <div className="flex-shrink-0">
        {isMe ? (
          <div className={cn(
            "w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-base sm:text-xl font-medium border-2",
            "bg-primary text-primary-foreground border-primary"
          )}>
            Me
          </div>
        ) : (
          <img 
            src={message.avatar || ''}
            alt={message.recipientName}
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-full border-2 border-border object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = `
                <div class="w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-base sm:text-xl font-medium border-2 bg-background text-foreground border-border">
                  ${initial}
                </div>
              `;
            }}
          />
        )}
      </div>
      <div className="flex-grow space-y-1 min-w-0 pr-4 sm:pr-20">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <span className="font-semibold text-base sm:text-lg truncate">
            {isMe ? "You" : message.recipientName || 'Unknown'}
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground">
            {format(date, "MMM d, yyyy 'at' h:mm a")}
          </span>
        </div>
        <div className="text-sm sm:text-base text-muted-foreground break-words whitespace-pre-line">
          {formatMessage(message.content || '')}
        </div>
      </div>
    </div>
  );
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 65%, 25%)`; // Dark mode friendly
}

// Add loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex justify-center py-4">
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-foreground"></div>
    </div>
  );
}

export default function ThreadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reply, setReply] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [thread, setThread] = useState<Thread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token, isLoading: authLoading, logout } = useAuth();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  // Add new state for text snippets
  const [snippets, setSnippets] = useState<TextSnippet[]>([]);
  const [isLoadingSnippets, setIsLoadingSnippets] = useState(false);
  const [snippetsError, setSnippetsError] = useState<string | null>(null);
  const [isSnippetsOpen, setIsSnippetsOpen] = useState(false);


  const threadId = searchParams?.get('id');


  // Add the config hook
  const { config } = useConfig();


  // Add these state variables at the top with the other useState declarations
  const [recipientName, setRecipientName] = useState('there');
  const [lastMessageFromOther, setLastMessageFromOther] = useState('');


  // Add function to fetch text snippets
  const fetchTextSnippets = async () => {
    if (!token) return;
    
    setIsLoadingSnippets(true);
    setSnippetsError(null);
    
    try {
      const response = await fetch(`/api/proxy?endpoint=linkedout/snippets`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch snippets: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if data has the expected structure
      if (data && data.textSnippets) {
        setSnippets(data.textSnippets);
      } else {
        // If the structure is different, try to adapt
        setSnippets(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching snippets:', error);
      setSnippetsError('Failed to load snippets');
    } finally {
      setIsLoadingSnippets(false);
    }
  };
  
  // Function to insert snippet at cursor position or append to existing text
  const insertSnippet = (snippetValue: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const selectionStart = textarea.selectionStart;
      const selectionEnd = textarea.selectionEnd;
      
      const newText = 
        reply.substring(0, selectionStart) + 
        snippetValue + 
        reply.substring(selectionEnd);
      
      setReply(newText);
      
      // Focus back on textarea after inserting snippet
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          selectionStart + snippetValue.length,
          selectionStart + snippetValue.length
        );
      }, 0);
    } else {
      // If textarea is not focused, append to the end
      setReply((prev) => {
        // Add a newline if there's already text and it doesn't end with one
        const separator = prev && !prev.endsWith('\n') ? '\n' : '';
        return prev + separator + snippetValue;
      });
    }
    
    // Close the popover after inserting
    setIsSnippetsOpen(false);
  };

  // Fetch snippets when component mounts
  useEffect(() => {
    if (token) {
      fetchTextSnippets();
    }
  }, [token]);


  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const fetchThread = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/proxy?endpoint=threads&id=${threadId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch thread: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if data has the expected structure
      if (!data || !Array.isArray(data)) {
        throw new Error('Invalid thread data format');
      }
      
      // Transform the data into the expected Thread format
      const transformedThread: Thread = {
        id: threadId!,
        messages: data.map((msg: any) => ({
          id: msg.id || threadId,
          content: msg.content,
          isFromMe: msg.isFromMe,
          lastUpdated: msg.lastUpdated,
          linkedinProfileURL: msg.linkedinProfileURL,
          recipientLinkedInFollowerCount: msg.recipientLinkedInFollowerCount,
          recipientName: msg.recipientName,
          avatar: msg.avatar,
          chatId: msg.chatId
        }))
        .sort((a: Message, b: Message) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime())
      };
      
      setThread(transformedThread);
      
      // Set the recipient name for the AI draft if messages exist
      if (transformedThread.messages && transformedThread.messages.length > 0) {
        const firstMessage = transformedThread.messages[0];
        setRecipientName(firstMessage.recipientName || 'there');
        
        // Find the last message from the other person to reply to
        const lastMessageFromOther = [...transformedThread.messages]
          .reverse()
          .find(msg => msg.isFromMe === 'false');
        
        if (lastMessageFromOther) {
          setLastMessageFromOther(lastMessageFromOther.content);
        }
      }
    } catch (error) {
      console.error('Error fetching thread:', error);
      setError('Failed to load thread. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!threadId || !token) return;
    fetchThread();
  }, [threadId, token]);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push('/login');
    }
  }, [token, authLoading, router]);

  const handleGenerateDraft = async () => {
    if (!token) return;

    setIsGenerating(true);
    try {
      const lastMessage = thread?.messages[thread?.messages.length - 1];
      
      const draftResponse = await generateDraft({
        toFullName: lastMessage?.recipientName || '',
        messageToReplyTo: lastMessage?.content || '',
        messageCategory: 'love-your-content'
      }, token);
      
      setReply(draftResponse.draftReply);
      
      textareaRef.current?.scrollIntoView({ behavior: 'smooth' });
      textareaRef.current?.focus();
      
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!reply.trim() || isSending) return;
    setIsSending(true);

    // Create optimistic message
    const optimisticMessage: Message = {
      id: Date.now().toString(),
      content: reply,
      isFromMe: "true",
      lastUpdated: new Date().toISOString(),
      linkedinProfileURL: thread?.messages[0]?.linkedinProfileURL || "",
      recipientLinkedInFollowerCount: thread?.messages[0]?.recipientLinkedInFollowerCount || "",
      recipientName: thread?.messages[0]?.recipientName || "",
      chatId: thread?.messages[0]?.chatId,
      avatar: thread?.messages[0]?.avatar
    };

    // Optimistically update UI
    setThread(prev => prev ? {
      ...prev,
      messages: [...prev.messages, optimisticMessage].sort(
        (a, b) => new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime()
      )
    } : null);

    try {
      // Send through proxy
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-endpoint': 'linkout_messages'
        },
        body: JSON.stringify({
          content: reply,
          threadId: threadId,
          chatId: thread?.messages[0]?.chatId,
        }),
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }

      // N8N webhook call
      const n8nResponse = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'x-endpoint': 'linkedout/message',
        },
        body: JSON.stringify({
          message: reply,
          threadId: threadId,
          messageId: thread?.messages[0]?.id,
          chatId: thread?.messages[0]?.chatId,
          recipientName: thread?.messages[0]?.recipientName,
          linkedinProfileURL: thread?.messages[0]?.linkedinProfileURL,
        }),
      });

      if (!n8nResponse.ok) {
        throw new Error(`Failed to trigger workflow: ${n8nResponse.status}`);
      }

      setReply('');
      
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });

    } catch (error) {
      // Remove optimistic message on error
      setThread(prev => prev ? {
        ...prev,
        messages: prev.messages.filter(msg => msg.id !== optimisticMessage.id)
      } : null);

      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpenLink = (url: string) => {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [thread?.messages]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await fetchThread();
    } catch (error) {
      console.error("Error refreshing thread:", error);
    } finally {
      setIsLoading(false);
    }
    return Promise.resolve();
  };

  if (!threadId) {
    router.push('/inbox');
    return null;
  }

  if (isLoading || authLoading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="flex items-center space-x-4">
          <div className="h-8 w-24 bg-muted/10 animate-pulse rounded" />
        </div>
        <div className="mt-4 space-y-4">
          <div className="h-32 bg-muted/10 animate-pulse rounded-lg" />
          <div className="h-32 bg-muted/10 animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 max-w-4xl flex flex-col min-h-screen">
        <div className="flex-grow">
          <div className="text-destructive p-4 rounded-lg border border-destructive/50">
            {error}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="container mx-auto py-6 max-w-4xl flex flex-col min-h-screen">
        <div className="flex-grow">
          <div className="text-muted-foreground p-4 text-center">
            Thread not found
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const firstMessage = thread.messages[0];

  if (!firstMessage) {
    return (
      <div className="container mx-auto py-6 max-w-4xl flex flex-col min-h-screen">
        <div className="flex-grow">
          <div className="text-muted-foreground p-4 text-center">
            No messages in thread
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header - full width container for buttons */}
      <div className="w-full">
        <div className="mx-auto max-w-[768px]">
          <div className="flex items-center sm:px-0 py-2 sm:py-6">
            <div className="w-full flex justify-between">
              <Button
                variant="ghost"
                className="px-2 sm:px-4 gap-2"
                onClick={() => router.push('/inbox')}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="px-2 sm:px-4 gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 min-h-0 px-2 sm:px-4">
        <div className="mx-auto max-w-[768px] h-full flex flex-col">
          <div className="flex-1 border border-border rounded-lg bg-background flex flex-col min-h-0">
            {/* Profile header */}
            <div className="flex items-center p-2 sm:p-4 border-b border-border">
              <div className="flex items-center gap-2 sm:gap-4">
                <img 
                  src={firstMessage.avatar || ''}
                  alt={firstMessage.recipientName}
                  className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 sm:border-4 border-border object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = `
                      <div class="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-secondary flex items-center justify-center text-xl sm:text-2xl font-medium">
                        ${firstMessage.recipientName?.[0]?.toUpperCase()}
                      </div>
                    `;
                  }}
                />
                <div>
                  {firstMessage.linkedinProfileURL ? (
                    <>
                      <button 
                        onClick={() => handleOpenLink(firstMessage.linkedinProfileURL)}
                        className="sm:hidden text-lg font-semibold text-left hover:underline"
                      >
                        {firstMessage.recipientName || 'Unknown'}
                      </button>
                      <h2 className="hidden sm:block text-xl font-semibold">
                        {firstMessage.recipientName || 'Unknown'}
                      </h2>
                    </>
                  ) : (
                    <h2 className="text-lg sm:text-xl font-semibold">
                      {firstMessage.recipientName || 'Unknown'}
                    </h2>
                  )}
                  <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2">
                    <span>{firstMessage.recipientLinkedInFollowerCount} followers</span>
                    {firstMessage.linkedinProfileURL && (
                      <Button 
                        variant="link"
                        className="hidden sm:inline-flex p-0 h-auto font-normal"
                        onClick={() => handleOpenLink(firstMessage.linkedinProfileURL)}
                      >
                        View LinkedIn profile
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Messages container with scroll */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-3 sm:p-6 space-y-3 sm:space-y-6">
                {thread.messages.map((message) => (
                  <MessageGroup 
                    key={message.id} 
                    message={message} 
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              <div className="sticky bottom-2 sm:bottom-4 float-right mr-2 sm:mr-4 z-10">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </div>

          {/* Reply section */}
          <div className="mt-2 sm:mt-4 rounded-xl border border-border bg-background p-2 sm:p-4">
            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="relative flex-grow">
                <Textarea
                  ref={textareaRef}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Write your reply..."
                  className={cn(
                    "w-full resize-none p-4 pr-28 text-base transition-all duration-200",
                    isExpanded ? "min-h-[500px]" : "min-h-[100px]"
                  )}
                  disabled={isSending}
                />
                <div className="absolute top-3 right-3 flex gap-2 z-10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-background"
                  >
                    {isExpanded ? (
                      <Shrink className="h-5 w-5" />
                    ) : (
                      <Expand className="h-5 w-5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateDraft}
                    disabled={isGenerating}
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/50 bg-background"
                  >
                    <Wand2 className="h-5 w-5 text-foreground" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <Popover open={isSnippetsOpen} onOpenChange={setIsSnippetsOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="lg"
                      className="gap-2 px-3 sm:px-4 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        if (!snippets.length && !isLoadingSnippets) {
                          fetchTextSnippets();
                        }
                      }}
                    >
                      <Clipboard className="h-4 w-4" />
                      Text Snippets
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-80 p-0" 
                    align="start"
                    side="top"
                    alignOffset={-50}
                    sideOffset={10}
                  >
                    <div className="py-0">
                      <div className="px-4 py-4 border-b flex justify-between items-center">
                        <h3 className="font-medium">Text Snippets</h3>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="h-7 px-2 text-xs gap-1"
                          onClick={() => window.open(`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/_/`, '_blank')}
                        >
                          <Database className="h-3 w-3" />
                          Open PocketBase
                        </Button>
                      </div>
                      
                      {isLoadingSnippets && snippets.length === 0 ? (
                        <div className="p-4 text-center">
                          <LoadingSpinner />
                        </div>
                      ) : snippetsError ? (
                        <div className="p-4 text-center text-destructive">
                          {snippetsError}
                        </div>
                      ) : snippets.length === 0 ? (
                        <div className="min-h-[105px] flex flex-col items-center justify-center gap-2 p-4">
                          <p className="text-sm text-muted-foreground text-center">
                            No text snippets available
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="h-7 px-2 text-xs gap-1"
                            onClick={() => window.open(`${process.env.NEXT_PUBLIC_POCKETBASE_URL}/_/`, '_blank')}
                          >
                            <Database className="h-3 w-3" />
                            Add in PocketBase
                          </Button>
                        </div>
                      ) : (
                        <ScrollArea className="min-h-[105px]">
                          <div className="py-1">
                            {snippets.map((snippet, index) => (
                              <button
                                key={index}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-muted/50 focus:bg-muted/50 focus:outline-none truncate"
                                onClick={() => insertSnippet(snippet.value)}
                              >
                                {snippet.name}
                              </button>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button 
                  size="lg"
                  className="px-3 sm:px-4 gap-2"
                  disabled={!reply?.trim() || isSending}
                  onClick={handleSend}
                >
                  Send
                  <svg 
                    viewBox="0 0 24 24" 
                    className="h-5 w-5" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      d="M5 12H19M19 12L13 6M19 12L13 18" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
