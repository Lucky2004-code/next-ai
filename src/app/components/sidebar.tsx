import styles from "./home.module.scss";
import Locale from "../locales"
import ChatGptIcon from "../icons/chatgpt.svg";
import { useNavigate } from "react-router-dom";
import { Path } from "../constant";
import { ChatList } from "./chat-list";

export function SideBar() {

  const navigate = useNavigate();

  return (
    <div
      className={styles.sidebar}
    >
      <div className={styles["sidebar-header"]} data-tauri-drag-region>
        <div className={styles["sidebar-title"]} data-tauri-drag-region>
          NextChat
        </div>
        <div className={styles["sidebar-sub-title"]}>
          Build your own AI assistant.
        </div>
        <div className={styles["sidebar-logo"] + " no-dark"}>
          <ChatGptIcon />
        </div>
      </div>

      <button
        className={styles["new-chat-button"]}
        onClick={() => {
          navigate(Path.Home)
        }}
      >{Locale.Chat.NewChat}</button>

      <div
        className={styles["sidebar-body"]}
      >
        <ChatList />
      </div>
    </div>
  );
}
