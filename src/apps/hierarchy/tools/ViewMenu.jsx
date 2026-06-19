import SearchNodeBar from "./SearchNodeBar";
import styles from "@/styles/Charts.module.css";

const ViewMenu = () => {
  return (
    <div className={styles.hierarchyViewMenu}>
      <SearchNodeBar />
    </div>
  );
};

export default ViewMenu;
