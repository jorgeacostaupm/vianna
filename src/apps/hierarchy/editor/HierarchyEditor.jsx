import { useRef, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import D3HierarchyEditor from "./D3HierarchyEditor";
import HierarchyContextMenu from "../tools/HierarchyContextMenu";
import NodeMenu from "../menu/NodeMenu";
import useResizeObserver from "@/hooks/useResizeObserver";
import { generateTree } from "@/utils/functions";
import styles from "@/styles/Charts.module.css";
import NoDataPlaceholder from "@/components/charts/NoDataPlaceholder";
import HierarchyBar from "../toolbar/HierarchyBar";
import ViewMenu from "../tools/ViewMenu";
import { DEFAULT_HIERARCHY_VIEW_CONFIG } from "../tools/HierarchyViewSettings";

export default function HierarchyEditor() {
  const attributes = useSelector((state) => state.metadata.attributes);
  const [orientation, setOrientation] = useState("vertical");
  const [linkStyle, setLinkStyle] = useState("smooth");
  const [viewConfig, setViewConfig] = useState(DEFAULT_HIERARCHY_VIEW_CONFIG);

  return (
    <div className={styles.viewContainer} data-view-container>
      <HierarchyBar
        orientation={orientation}
        onOrientationChange={setOrientation}
        linkStyle={linkStyle}
        onLinkStyleChange={setLinkStyle}
        viewConfig={viewConfig}
        onViewConfigChange={setViewConfig}
      ></HierarchyBar>
      {attributes?.length > 0 ? (
        <Hierarchy
          attributes={attributes}
          orientation={orientation}
          linkStyle={linkStyle}
          viewConfig={viewConfig}
        />
      ) : (
        <NoDataPlaceholder message="No hierarchy available" />
      )}
    </div>
  );
}

function Hierarchy({
  attributes,
  orientation,
  linkStyle,
  viewConfig,
}) {
  const dispatch = useDispatch();
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [selectionMode, setSelectionMode] = useState("none");

  const dimensions = useResizeObserver(containerRef);
  const version = useSelector((state) => state.metadata.version);

  // Se hace update con version para las animaciones de las transiciones, hay parte que se hace desde d3hierarchyeditor
  const treeData = useMemo(() => generateTree(attributes, 0), [version]);

  // Inicialización / actualización del editor
  useEffect(() => {
    if (!containerRef.current) return;

    if (!editorRef.current) {
      editorRef.current = new D3HierarchyEditor(
        containerRef.current,
        treeData,
        dispatch,
        { orientation, linkStyle, viewConfig },
      );
    } else {
      editorRef.current.update(treeData);
    }
  }, [treeData]);

  // Destroy only on unmount to preserve pubsub subscriptions and editor handlers
  useEffect(() => {
    return () => {
      editorRef.current?.destroy?.();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.setOrientation?.(orientation);
  }, [orientation]);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.setLinkStyle?.(linkStyle);
  }, [linkStyle]);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.setViewConfig?.(viewConfig);
  }, [viewConfig]);

  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.setSelectionMode?.(selectionMode);
  }, [selectionMode]);

  // Resize
  useEffect(() => {
    if (!editorRef.current || !dimensions) return;

    editorRef.current.onResize(dimensions);
  }, [dimensions]);

  return (
    <>
      <div className={styles.chartContainer}>
        <svg ref={containerRef} className={styles.chartSvg} />
      </div>

      {editorRef.current && <HierarchyContextMenu editor={editorRef.current} />}

      <NodeMenu />
      <ViewMenu
        selectionMode={selectionMode}
        onSelectionModeChange={setSelectionMode}
      />
    </>
  );
}

/* function Hierarchy({ attributes }) {
  const dispatch = useDispatch();

  const version = useSelector((state) => state.metadata.version);
  const editorRef = useRef(null);
  const containerRef = useRef(null);

  const dimensions = useResizeObserver(containerRef);
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.onResize(dimensions);
    }
  }, [dimensions]);

  useEffect(() => {
    const treeData = generateTree(attributes, 0);

    if (!editorRef.current) {
      editorRef.current = new D3HierarchyEditor(
        containerRef.current,
        treeData,
        dispatch
      );
    } else {
      editorRef.current.update(treeData);
    }
  }, [version, dispatch]);

  return (
    <>
      <div style={{ textAlign: "initial" }} className={styles.chartContainer}>
        <svg ref={containerRef} className={styles.chartSvg} />
      </div>
      <HierarchyEditorContextMenu editor={editorRef.current} />
      <NodeMenu></NodeMenu>
      <ViewMenu></ViewMenu>
    </>
  );
} */
