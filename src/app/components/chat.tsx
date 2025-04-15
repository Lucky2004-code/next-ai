import { useState, useEffect, useRef } from "react";
import { useChatStore } from "../store/chat";
import styles from "./chat.module.scss";
import { nanoid } from "nanoid";

export default function ChatPage() {
    const chatStore = useChatStore();
    const [userInput, setUserInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const currentSession = chatStore.currentSession();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 按日期升序排序消息，并确保每条消息都有唯一id
    const sortedMessages = [...currentSession?.messages || []]
        .map(message => ({
            ...message,
            id: message.id || nanoid() // 如果消息没有id，就生成一个
        }))
        .sort((a, b) => {
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [sortedMessages]);

    function onInput(str: string) {
        setUserInput(str);
    }

    async function onSend() {
        if (userInput.trim() && !isLoading) {
            setIsLoading(true);
            try {
                const userMessage = {
                    id: nanoid(), // 确保新消息有唯一id
                    date: new Date().toLocaleString(),
                    role: "user" as const,
                    content: userInput,
                };
                
                chatStore.updateCurrentSession((session) => {
                    session.messages = [...session.messages, userMessage];
                    session.lastUpdate = Date.now();
                });
                
                setUserInput("");
                await chatStore.chat(userInput);
            } finally {
                setIsLoading(false);
            }
        }
    }

    function onKeyDown(e: React.KeyboardEvent) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
        }
    }

    return (
        <div className={styles["chat-container"]}>
            <div className={styles["message-list"]}>
                {sortedMessages.map((message) => (
                    <div 
                        key={message.id} 
                        className={`${styles.message} ${
                            message.role === "user" ? styles.user : ""
                        }`}
                    >
                        <div className={styles.avatar}>
                            {message.role === "user" ? "U" : "AI"}
                        </div>
                        <div className={styles.content}>
                            {typeof message.content === "string" 
                                ? message.content 
                                : JSON.stringify(message.content)}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className={styles["input-container"]}>
                <textarea
                    id="chat-input"
                    className={styles["chat-input"]}
                    onInput={(e) => onInput(e.currentTarget.value)}
                    onKeyDown={onKeyDown}
                    value={userInput}
                    autoFocus={true}
                    placeholder="输入消息..."
                    disabled={isLoading}
                />
                <button
                    className={styles["send-button"]}
                    onClick={onSend}
                    disabled={!userInput.trim() || isLoading}
                >
                    {isLoading ? "发送中..." : "发送"}
                </button>
            </div>
        </div>
    );
}