import SearchNodeBar from "./SearchNodeBar";
const ViewMenu = () => {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(var(--view-bar-height) + var(--space-2))",
        left: "var(--space-3)",
      }}
    >
      <SearchNodeBar />
    </div>
  );
};

export default ViewMenu;
