
import BaseBar from "./BaseBar";

export default function Bar({ children, title, drag = true }) {
  return (
    <BaseBar title={title} draggable={drag}>
      {children}
    </BaseBar>
  );
}
