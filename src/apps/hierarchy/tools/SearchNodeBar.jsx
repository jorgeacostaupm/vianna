import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Input, List, Card } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { pubsub } from "@/utils/pubsub";
import { toggleAttribute } from "@/store/features/metadata";

const SearchNodeBar = () => {
  const dispatch = useDispatch();
  const attributes = useSelector((state) => state.metadata.attributes || []);
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [dropdownHeight, setDropdownHeight] = useState(200);

  const containerRef = useRef(null);
  const { publish } = pubsub;

  const findParentNode = (nodeId) => {
    return attributes.find((attr) => attr.related?.includes(nodeId));
  };

  const openParentsRecursively = async (nodeId, visited = new Set()) => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const parent = findParentNode(nodeId);
    if (!parent) return;

    if (!parent.isShown) {
      await dispatch(
        toggleAttribute({ attributeID: parent.id, fromFocus: true }),
      ).unwrap();
    }

    await openParentsRecursively(parent.id, visited);
  };

  useEffect(() => {
    const handleOutside = (event) => {
      if (!containerRef.current) return;
      if (containerRef.current.contains(event.target)) return;
      setShowResults(false);
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") setShowResults(false);
    };

    document.addEventListener("pointerdown", handleOutside, true);
    document.addEventListener("keydown", handleEsc, true);
    return () => {
      document.removeEventListener("pointerdown", handleOutside, true);
      document.removeEventListener("keydown", handleEsc, true);
    };
  }, []);

  const handleSearch = (value) => {
    setSearchValue(value);
    const query = value.toLowerCase().trim();
    if (!query) {
      setResults([]);
      setShowResults(false);
      return;
    }
    const matches = attributes.filter((node) =>
      node.name?.toLowerCase().includes(query),
    );
    setResults(matches);
    setShowResults(matches.length > 0);
  };

  const handleFocus = () => {
    if (searchValue && results.length > 0) setShowResults(true);
  };

  const handleSelect = async (nodeId) => {
    await openParentsRecursively(nodeId);
    publish("focusNode", { nodeId });
    //setShowResults(false);
    setSearchValue("");
  };

  const handleEnter = (e) => {
    if (e.key === "Enter" && results.length > 0) {
      handleSelect(results[0].id);
    }
  };

  const handleResizeMouseDown = (e) => {
    const startY = e.clientY;
    const startHeight = dropdownHeight;

    const onMouseMove = (moveEvent) => {
      const newH = Math.max(120, startHeight + (moveEvent.clientY - startY));
      setDropdownHeight(newH);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "22rem" }}>
      <Input
        placeholder="Search node..."
        value={searchValue}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={handleFocus}
        onKeyDown={handleEnter}
        prefix={
          <SearchOutlined style={{ color: "var(--color-ink-tertiary)" }} />
        }
        style={{
          height: "var(--control-height-lg)",
          fontSize: "var(--font-size-base)",
          borderRadius: "var(--radius-md)",
          boxShadow: showResults ? "var(--focus-ring)" : "none",
        }}
      />

      {showResults && results.length > 0 && (
        <Card
          bodyStyle={{ padding: "0.5rem" }}
          style={{
            position: "absolute",
            top: "calc(100% + 0.45rem)",
            width: "100%",
            height: dropdownHeight,
            overflowY: "auto",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-sm)",
            backgroundColor: "var(--color-surface)",
            zIndex: 1000,
          }}
        >
          <List
            dataSource={results}
            size="small"
            renderItem={(node) => (
              <List.Item
                key={node.id}
                onClick={() => handleSelect(node.id)}
                style={{
                  cursor: "pointer",
                  padding: "0.4rem 0.6rem",
                  borderRadius: "var(--radius-sm)",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    "var(--color-brand-soft)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <SearchOutlined
                  style={{ color: "var(--color-brand)", marginRight: 8 }}
                />
                {node.name}
              </List.Item>
            )}
          />

          <div
            onMouseDown={handleResizeMouseDown}
            style={{
              height: "8px",
              cursor: "ns-resize",
              background: "transparent",
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
            }}
            aria-hidden
          />
        </Card>
      )}
    </div>
  );
};

export default SearchNodeBar;
