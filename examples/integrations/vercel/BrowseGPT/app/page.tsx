'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useState, useEffect } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Markdown from 'react-markdown';
import { MarkdownWrapper } from '@/components/ui/markdown';
import remarkGfm from 'remark-gfm';
import BlurFade from "@/components/ui/blur-fade";
import VercelLogo from "@/components/vercel";
import BrowserbaseLogo from "@/components/browserbase"
import FlickeringGrid from '@/components/ui/flickering-grid';
import FlickeringLoad from '@/components/ui/flickering-load';
import { Prompts } from '@/components/prompts';

function messageText(m: UIMessage): string {
  return m.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

function isToolUIPart(p: UIMessage['parts'][number]): boolean {
  return typeof p.type === 'string' && p.type.startsWith('tool-');
}

type ToolPartLoose = {
  type: string;
  state?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
};

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  const [showAlert, setShowAlert] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  const lastMessage = messages[messages.length - 1];
  const lastText = lastMessage ? messageText(lastMessage) : '';

  const isGenerating =
    isLoading &&
    (!messages.length ||
      lastMessage?.role !== 'assistant' ||
      !lastText);

  useEffect(() => {
    if (isGenerating) {
      setShowAlert(true);

      const dataCollected = lastMessage?.parts.some((part) => {
        if (!isToolUIPart(part)) return false;
        const tp = part as ToolPartLoose;
        const out = tp.state === 'output-available' ? tp.output : undefined;
        return (
          out &&
          typeof out === 'object' &&
          'dataCollected' in out &&
          (out as { dataCollected?: boolean }).dataCollected === true
        );
      });

      if (dataCollected && !lastText) {
        setStatusMessage('The AI has collected data and is generating a response. Please wait.');
      } else {
        setStatusMessage('The AI is currently processing your request. Please wait.');
      }

      setSessionId(null);
    } else {
      setShowAlert(false);
    }
  }, [isGenerating, messages, lastMessage, lastText]);

  useEffect(() => {
    if (!lastMessage?.parts) return;
    for (const part of lastMessage.parts) {
      if (!isToolUIPart(part)) continue;
      const tp = part as ToolPartLoose;
      if (tp.state !== 'output-available') continue;
      const out = tp.output as { sessionId?: string } | undefined;
      if (out?.sessionId) {
        setSessionId(out.sessionId);
        break;
      }
    }
  }, [messages, lastMessage]);

  const handleSubmitWrapper = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;
    setHasInteracted(true);
    void sendMessage({ text: input });
    setInput('');
  };

  const handlePromptClick = (text: string) => {
    setHasInteracted(true);
    void sendMessage({ text });
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <FlickeringGrid className="fixed inset-0 z-0 h-full w-full" />
      <div className="relative z-10 flex flex-col min-h-screen items-center"> 
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-20">
          <div className="w-full max-w-2xl mx-auto border-x-2 border-b-2 border-[#E5E7EB] bg-white">
            <div className="px-4 py-4 flex justify-between items-center">
              <a href="https://www.alexdphan.com" target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline">Made by AP</a>
              <h1 className="text-2xl font-bold flex items-center">
                <a href="https://www.browserbase.com" target="_blank" rel="noopener noreferrer" className="mr-1">
                  <BrowserbaseLogo />
                </a>
                <span className="mx-1">x</span>
                <a href="https://www.vercel.com" target="_blank" rel="noopener noreferrer">
                  <VercelLogo />
                </a>
              </h1>
            </div>
          </div>
        </div>

        {/* Chat content */}
        <div className="flex-grow flex flex-col w-full max-w-2xl mx-auto border-x-2 border-[#E5E7EB] bg-white mt-16">
          <div className="flex-grow flex flex-col w-full max-w-xl mx-auto py-4 px-4"> {/* Added px-4 */}
            {!hasInteracted && messages.length === 0 ? (
              <div className="flex-grow flex flex-col justify-start items-center text-center mt-56">
                <BlurFade>
                <h2 className="sm:text-2xl font-bold mb-2 text-xl">Welcome</h2>
              
                <p className="sm:mb-10 mb-8 sm:text-sm text-xs">What web task can I conquer for you today?</p>
                </BlurFade>
                <Prompts onPromptClick={handlePromptClick} />
              </div>
            ) : (
              messages.map((m, index) => {
                const text = messageText(m);
                const toolParts = m.parts.filter(isToolUIPart);

                return (
                <div key={m.id} className="whitespace-pre-wrap">
                  {m.role === 'user' ? (
                    <>
                      <strong className="block mb-0 text-xl pb-2">User:</strong>
                      <p className="mt-0 pb-4 font-mono">{text}</p>
                    </>
                  ) : toolParts.length > 0 ? (
                    <BlurFade>
                      <Alert className="my-4 border-[#E5E7EB]">
                        <AlertDescription>
                          {toolParts.map((part, partIndex) => {
                            const tp = part as ToolPartLoose;
                            const input = tp.input;
                            const out =
                              tp.state === 'output-available'
                                ? tp.output
                                : undefined;

                            let content = '';
                            if (out?.sessionId) {
                              content = `Session ID: ${String(out.sessionId)}`;
                            } else if (out?.content) {
                              content = `Content: ${String(out.content)}`;
                            }

                            const debuggerUrl = input?.debuggerFullscreenUrl;
                            if (typeof debuggerUrl === 'string') {
                              return (
                                <div key={partIndex}>
                                  <iframe
                                    src={`${debuggerUrl}&navBar=false`}
                                    className="w-full sm:h-72 h-52"
                                    title="Debugger"
                                    sandbox="allow-same-origin allow-scripts"
                                    allow="clipboard-read; clipboard-write"
                                  />
                                </div>
                              );
                            }
                            return content ? (
                              <div key={partIndex} className="overflow-x-auto">
                                <pre className="whitespace-pre-wrap break-all">{content}</pre>
                              </div>
                            ) : null;
                          })}
                        </AlertDescription>
                      </Alert>
                    </BlurFade>
                  ) : (
                    <>
                      <strong className="flex items-center text-xl pb-4">
                      <a href="https://www.browserbase.com" target="_blank" rel="noopener noreferrer" >
                    <BrowserbaseLogo />
                      </a>
                        <span className="ml-1">-AI:</span>
                      </strong>
                      <div className="mb-4"></div>
                      <div
                        className={`font-mono prose prose-sm mt-0 leading-snug pb-8 ${
                          index === messages.length - 1 && m.role === 'assistant' ? 'mb-20' : ''
                        }`}
                      >
                        <MarkdownWrapper>
                          <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
                        </MarkdownWrapper>
                      </div>
                    </>
                  )}
                </div>
              );
              })
            )}

            {showAlert && !sessionId && lastMessage?.role === 'assistant' && (
              <BlurFade>
                <Alert className="my-4 border-[#E5E7EB] mb-20">
                  <div className="flex justify-between items-center">
                    <div>
                      <AlertTitle>
                        {lastMessage.parts
                          .filter(isToolUIPart)
                          .map((part) => {
                            const tp = part as ToolPartLoose;
                            const out =
                              tp.state === 'output-available'
                                ? (tp.output as { toolName?: string } | undefined)
                                : undefined;
                            if (out?.toolName) return out.toolName;
                            const input = tp.input as { toolName?: string } | undefined;
                            return input?.toolName;
                          })
                          .filter(Boolean)
                          .join(', ')}
                      </AlertTitle>
                      <AlertDescription>{statusMessage}</AlertDescription>
                    </div>
                      <FlickeringLoad height={50} width={60} className='p-1'/>
                  </div>
                </Alert>
              </BlurFade>
            )}
          </div>
        </div>

        {/* Input form */}
        <div className="fixed bottom-0 left-0 right-0 z-20">
          <div className="w-full max-w-2xl mx-auto px-4 py-8 border-x-2 border-[#E5E7EB] ">
            <div className="w-full max-w-xl mx-auto">
              <form onSubmit={handleSubmitWrapper} className="w-full relative">
                <input
                  className="w-full p-2 pr-10 border border-[#E5E7EB] transition-all duration-200 ease-in-out shadow-md shadow-gray-300/50 focus:border-red-300 focus:shadow-lg focus:shadow-red-300/40 outline-none"
                  value={input}
                  placeholder="Ask anything..."
                  onChange={(e) => setInput(e.target.value)}
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!input.trim()}
                >
                  <span className="text-xl font-bold">&gt;</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
