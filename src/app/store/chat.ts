import { ChatMessage, DEFAULT_MASK_AVATAR, Mask, MessageRole, MultimodalContent } from "./mask";
import { nanoid } from "nanoid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import Locale from "../locales";

export function createMessage(override: Partial<ChatMessage>): ChatMessage {
    return {
        id: nanoid(),
        date: new Date().toLocaleString(),
        role: "user",
        content: "",
        ...override,
    };
}

export interface ChatSession {
    id: string;
    topic: string;
    messages: ChatMessage[];
    createTime: number;
    lastUpdate: number;
    mask: Mask;
}

export interface Message {
    role: string;
    content: string | MultimodalContent[];
}

export interface ChatRequest {
    model: string;
    messages: Message[];
    stream: boolean;
}

export const DEFAULT_TOPIC = Locale.Store.DefaultTopic;
export const BOT_HELLO: ChatMessage = createMessage({
    role: "assistant",
    content: Locale.Store.BotHello,
});

export const createEmptyMask = () =>
    ({
        id: nanoid(),
        avatar: DEFAULT_MASK_AVATAR,
        name: DEFAULT_TOPIC,
        context: [],
    }) as Mask;

function createEmptySession(): ChatSession {
    return {
        id: nanoid(),
        topic: DEFAULT_TOPIC,
        messages: [],
        createTime: Date.now(),
        lastUpdate: Date.now(),
        mask: createEmptyMask(),
    };
}

export interface ChatState {
    sessions: ChatSession[];
    currentSessionIndex: number;
    loadSessions(): void;
    deleteSession(i: number): void;
    selectSession: (index: number) => void;
    newSession: (mask?: Mask) => void;
    currentSession: () => ChatSession;
    updateCurrentSession: (updater: (session: ChatSession) => void) => void;
    chat: (prompt: string) => Promise<void>;
}

function getServerURL() {
    return "http://localhost:8080";
}

function uploadMessage(session: ChatSession, message: ChatMessage) {
    return fetch(getServerURL() + "/session/message/add?sessionId=" + session.id, {
        method: "post",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
    });
}

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            sessions: [createEmptySession()],
            currentSessionIndex: 0,

            loadSessions() {
                fetch(getServerURL() + "/session/all")
                    .then((res) => res.json())
                    .then((serverSessions: ChatSession[]) => {
                        if (serverSessions.length > 0) {
                            const currentSessionId = get().sessions[get().currentSessionIndex]?.id;
                            const sessions = serverSessions.sort((a, b) => b.lastUpdate - a.lastUpdate);
                            
                            let newIndex = currentSessionId 
                                ? sessions.findIndex(s => s.id === currentSessionId) 
                                : 0;
                            
                            // 确保索引有效
                            if (newIndex < 0 || newIndex >= sessions.length) {
                                newIndex = 0;
                            }
                            
                            set({ 
                                sessions,
                                currentSessionIndex: newIndex
                            });
                        }
                    })
                    .catch(console.error);
            },

            selectSession(index: number) {
                set({ currentSessionIndex: index });
            },

            newSession(mask?: Mask) {
                const session = createEmptySession();
            
                if (mask) {
                    session.mask = mask;
                    session.topic = mask.name;
                    
                    // 从后端获取mask的context
                    fetch(getServerURL() + "/session/mask/context?maskId=" + mask.id)
                        .then(res => res.json())
                        .then(contextMessages => {
                            session.messages = contextMessages.map((msg: any) => ({
                                ...msg,
                                date: new Date().toLocaleString()
                            }));
                            
                            // 创建会话并设置初始消息
                            return fetch(getServerURL() + "/session/add", {
                                method: "post",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(session),
                            });
                        })
                        .then(() => {
                            set((state) => ({
                                currentSessionIndex: 0,
                                sessions: [session].concat(state.sessions),
                            }));
                        })
                        .catch(console.error);
                } else {
                    // 没有mask时的处理
                    fetch(getServerURL() + "/session/add", {
                        method: "post",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(session),
                    })
                        .then(() => {
                            set((state) => ({
                                currentSessionIndex: 0,
                                sessions: [session].concat(state.sessions),
                            }));
                        })
                        .catch(console.error);
                }
            },

            deleteSession(index: number) {
                const sessions = get().sessions;
                const deletingLastSession = sessions.length === 1;
                const deletedSession = sessions.at(index);
                if (!deletedSession) return;
            
                fetch(getServerURL() + "/session/delete?sessionId=" + deletedSession.id, {
                    method: "post",
                })
                    .then(() => {
                        const newSessions = sessions.filter((_, i) => i !== index);
                        let nextIndex = get().currentSessionIndex;
            
                        if (index < nextIndex) {
                            nextIndex -= 1;
                        } else if (index === nextIndex) {
                            nextIndex = Math.min(nextIndex, newSessions.length - 1);
                        }
            
                        // 确保索引有效
                        if (nextIndex < 0 || nextIndex >= newSessions.length) {
                            nextIndex = 0;
                        }
            
                        if (deletingLastSession) {
                            newSessions.push(createEmptySession());
                            nextIndex = 0;
                        }
            
                        set({
                            currentSessionIndex: nextIndex,
                            sessions: newSessions,
                        });
                    })
                    .catch(console.error);
            },

            currentSession() {
                const sessions = get().sessions;
                let index = get().currentSessionIndex;

                if (index < 0 || index >= sessions.length) {
                    index = Math.min(sessions.length - 1, Math.max(0, index));
                }

                return sessions[index];
            },

            ensureValidSessionIndex() {
                const sessions = get().sessions;
                let index = get().currentSessionIndex;

                if (index < 0 || index >= sessions.length) {
                    index = Math.min(sessions.length - 1, Math.max(0, index));
                    set({ currentSessionIndex: index });
                }
            },

            updateCurrentSession(updater: (session: ChatSession) => void) {
                const sessions = [...get().sessions];
                const index = get().currentSessionIndex;
                const session = sessions[index];
                updater(session);
                session.messages.sort((a, b) => new Date(a.date).getTime())
                set({ sessions });
            },

            // 修改 chat 方法
            async chat(prompt: string) {
                const session = get().currentSession();

                try {
                    // 创建用户消息
                    const userMessage: ChatMessage = {
                        id: nanoid(),
                        content: prompt,
                        role: "user",
                        date: new Date().toLocaleString(),
                    };

                    // 上传用户消息到服务器
                    await uploadMessage(session, userMessage);

                    // 只在服务器保存成功后更新UI
                    get().updateCurrentSession((session) => {
                        session.messages = [...session.messages, userMessage];
                        session.lastUpdate = Date.now();
                    });

                    // 准备AI请求 - 确保 content 是字符串类型
                    const request: ChatRequest = {
                        model: "deepseek-chat",
                        messages: session.messages.map(m => ({
                            role: m.role as MessageRole,
                            content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
                        })),
                        stream: false,
                    };

                    // 获取AI响应
                    const response = await fetch(
                        process.env.NEXT_PUBLIC_OPEN_URL + "/chat/completions",
                        {
                            method: "post",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: "Bearer " + process.env.NEXT_PUBLIC_API_KEY,
                            },
                            body: JSON.stringify(request),
                        }
                    );

                    const data = await response.json();
                    const aiResponse = data.choices[0].message;

                    // 创建AI消息
                    const aiMessage: ChatMessage = {
                        id: nanoid(),
                        content: aiResponse.content,
                        role: "assistant",
                        date: new Date().toLocaleString(),
                    };

                    // 上传AI消息到服务器
                    await uploadMessage(session, aiMessage);

                    // 只在服务器保存成功后更新UI
                    get().updateCurrentSession((session) => {
                        session.messages = [...session.messages, aiMessage];
                        session.lastUpdate = Date.now();
                    });
                } catch (e) {
                    console.error(e);
                    // 可以在这里添加错误处理，比如显示错误消息给用户
                }
            }
        }),
        { name: "chat-session" }
    )
);

function getTime(): any {
    throw new Error("Function not implemented.");
}
