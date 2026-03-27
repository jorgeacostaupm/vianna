import SearchNodeBar from "./SearchNodeBar";
const ViewMenu = ({
  selectionMode,
  onSelectionModeChange,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(var(--view-bar-height) + var(--space-2))",
        left: "var(--space-3)",
      }}
    >
      <SearchNodeBar
        selectionMode={selectionMode}
        onSelectionModeChange={onSelectionModeChange}
      />
    </div>
  );
};

export default ViewMenu;
