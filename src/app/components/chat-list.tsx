import { useNavigate } from "react-router-dom";
import DeleteIcon from "../icons/delete.svg";
import styles from "./home.module.scss";
import { Path } from "../constant";

import { useEffect, useState } from "react";
import { ChatMessage, Mask } from "../store/mask";
import { useChatStore } from "../store/chat";

export function ChatItem(props: {
  onClick?: () => void;
  onDelete?: () => void;
  title: string;
  count: number;
  time: string;
  selected: boolean;
  id: string;
  index: number;
  mask: Mask;
}) {
  return (
    <div
      className={styles["chat-item"]}
      onClick={props.onClick}
      title={props.title}
    >
      <>
          <div className={styles["chat-item-title"]}>{props.title}</div>
          <div className={styles["chat-item-info"]}>
            <div className={styles["chat-item-count"]}>
              {props.count}
            </div>
            <div className={styles["chat-item-date"]}>{props.time}</div>
          </div>
        </>

      <div
        className={styles["chat-item-delete"]}
        onClickCapture={(e) => {
          props.onDelete?.();
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <DeleteIcon />
      </div>
    </div>
  );
}

// 更新 ChatSession 接口以匹配实际数据结构
export interface ChatSession {
  id: string;
  topic: string;          // 修改 title -> topic
  messages: ChatMessage[]; // 添加 messages 数组
  lastUpdate: number;     // 添加 lastUpdate
  mask: Mask;             // 添加 mask
  // 其他实际使用的属性...
}

export function ChatList() {
  const chatStore = useChatStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedSessions = [...chatStore.sessions].sort((a, b) => 
    b.lastUpdate - a.lastUpdate
  );

  useEffect(() => {
    const loadSessions = async () => {
      try {
        setLoading(true);
        await chatStore.loadSessions();
        setError(null);
      } catch (err) {
        setError("加载会话失败");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSessions();
  }, [chatStore]);

  const handleDelete = async (index: number) => {
    try {
      setLoading(true);
      await chatStore.deleteSession(index);
      await chatStore.loadSessions();
      setError(null);
    } catch (error) {
      setError("删除会话失败");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>加载中...</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  return (
    <div className={styles["chat-list"]}>
      {sortedSessions.map((item, i) => (
        <ChatItem
          title={item.topic}  // 使用 topic 而不是 title
          time={new Date(item.lastUpdate).toLocaleString()}
          count={item.messages.length}
          key={item.id}
          id={item.id}
          index={i}
          selected={i === chatStore.currentSessionIndex}
          onClick={() => {
            navigate(Path.Chat);
            chatStore.selectSession(
              chatStore.sessions.findIndex(s => s.id === item.id)
            );
          }}
          onDelete={() => handleDelete(i)}
          mask={item.mask}
        />
      ))}
    </div>
  );
}
