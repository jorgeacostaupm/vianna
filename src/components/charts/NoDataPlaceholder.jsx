import { Empty, Typography } from "antd";
import styles from "./NoDataPlaceholder.module.css";

const { Text } = Typography;

export default function NoDataPlaceholder({
  message = "No data available",
  description,
}) {
  return (
    <div className={styles.container}>
      <Empty
        description={<Text type="secondary">{description || message}</Text>}
      />
    </div>
  );
}
