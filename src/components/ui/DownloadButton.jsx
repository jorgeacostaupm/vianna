import React, { useState, useEffect, useCallback, useRef } from "react";
import { Dropdown } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import BarButton from "./BarButton";
import styles from "./DownloadButton.module.css";
import { getViewOverlayPosition } from "./popupPosition";

const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_STYLE_PROPERTIES = [
  "display",
  "visibility",
  "opacity",
  "overflow",
  "color",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-opacity",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "stroke-miterlimit",
  "stroke-dasharray",
  "stroke-dashoffset",
  "paint-order",
  "vector-effect",
  "shape-rendering",
  "rx",
  "ry",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "font-variant",
  "font-variant-numeric",
  "letter-spacing",
  "word-spacing",
  "text-anchor",
  "dominant-baseline",
  "alignment-baseline",
  "white-space",
  "text-decoration",
  "marker-start",
  "marker-mid",
  "marker-end",
  "mix-blend-mode",
  "isolation",
  "filter",
  "clip-path",
  "clip-rule",
  "mask",
  "pointer-events",
  "transform",
  "transform-origin",
  "transform-box",
];

const downloadFormats = [
  { key: "png", label: "PNG (.png)" },
  { key: "svg", label: "SVG (.svg)" },
  { key: "jpg", label: "JPG (.jpg)" },
];

export default function DownloadButton({ filename = "chart", svgIds = [] }) {
  const disabled = !svgIds?.length;
  const [open, setOpen] = useState(false);
  const [overlayStyle, setOverlayStyle] = useState(undefined);
  const [isFixedOverlay, setIsFixedOverlay] = useState(false);
  const triggerRef = useRef(null);

  const updateOverlayPosition = useCallback(() => {
    const position = getViewOverlayPosition(triggerRef.current);
    setOverlayStyle(position || undefined);
    setIsFixedOverlay(Boolean(position));
  }, []);

  useEffect(() => {
    if (!open || !isFixedOverlay) return undefined;

    const updatePosition = () => updateOverlayPosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, isFixedOverlay, updateOverlayPosition]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  const handleOpenChange = (nextOpen) => {
    if (nextOpen) updateOverlayPosition();
    setOpen(nextOpen);
  };

  const menu = {
    items: downloadFormats,
    onClick: ({ key }) => handleDownload(filename, svgIds, key),
  };

  return (
    <Dropdown
      menu={menu}
      open={open}
      onOpenChange={handleOpenChange}
      placement="bottomRight"
      trigger={["click"]}
      disabled={disabled}
      overlayClassName={isFixedOverlay ? styles.dropdownOverlayFixed : ""}
      overlayStyle={overlayStyle}
      getPopupContainer={() => document.body}
    >
      <span ref={triggerRef}>
        <BarButton
          title="Download image"
          icon={<DownloadOutlined />}
          disabled={disabled}
        />
      </span>
    </Dropdown>
  );
}

function handleDownload(filename, svgIds, format) {
  try {
    const svgs = [];

    let totalWidth = 0;
    let maxHeight = 0;

    for (const id of svgIds) {
      const svg = document.getElementById(id);
      if (!svg) continue;

      const { width, height } = svg.getBoundingClientRect();

      svgs.push({ svg, width, height });
      totalWidth += width;
      maxHeight = Math.max(maxHeight, height);
    }

    if (!svgs.length || totalWidth === 0 || maxHeight === 0) {
      return;
    }

    const combinedSvg = document.createElementNS(SVG_NS, "svg");
    combinedSvg.setAttribute("xmlns", SVG_NS);
    combinedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    combinedSvg.setAttribute("width", String(totalWidth));
    combinedSvg.setAttribute("height", String(maxHeight));
    combinedSvg.setAttribute("viewBox", `0 0 ${totalWidth} ${maxHeight}`);

    let currentX = 0;

    for (const { svg, width, height } of svgs) {
      const clone = cloneSvgWithInlineStyles(svg, width, height);
      const offsetY = (maxHeight - height) / 2;
      clone.setAttribute("x", String(currentX));
      clone.setAttribute("y", String(offsetY));
      combinedSvg.appendChild(clone);

      currentX += width;
    }

    const serialized = new XMLSerializer().serializeToString(combinedSvg);

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, -1);

    const normalizedFormat = (format || "svg").toLowerCase();
    const isSvg = normalizedFormat === "svg";
    const isJpg = normalizedFormat === "jpg" || normalizedFormat === "jpeg";
    const extension = isSvg ? "svg" : isJpg ? "jpg" : "png";
    const fullFilename = `${filename}_${timestamp}.${extension}`;

    if (isSvg) {
      const blob = new Blob([serialized], { type: "image/svg+xml" });
      triggerDownload(blob, fullFilename);
      return;
    }

    const svgBlob = new Blob([serialized], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const dpr = window.devicePixelRatio || 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(totalWidth * dpr);
      canvas.height = Math.ceil(maxHeight * dpr);
      canvas.style.width = `${totalWidth}px`;
      canvas.style.height = `${maxHeight}px`;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(svgUrl);
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (isJpg) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, totalWidth, maxHeight);
      }

      ctx.drawImage(image, 0, 0, totalWidth, maxHeight);

      const mimeType = isJpg ? "image/jpeg" : "image/png";
      canvas.toBlob(
        (blob) => {
          if (blob) {
            triggerDownload(blob, fullFilename);
          }
        },
        mimeType,
        0.95
      );

      URL.revokeObjectURL(svgUrl);
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
    };

    image.src = svgUrl;
  } catch (err) {
    console.error("Download error:", err);
  }
}

function cloneSvgWithInlineStyles(sourceSvg, width, height) {
  const clone = sourceSvg.cloneNode(true);

  applyComputedStylesRecursively(sourceSvg, clone);

  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  if (!clone.getAttribute("viewBox")) {
    clone.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  return clone;
}

function applyComputedStylesRecursively(sourceNode, targetNode) {
  if (!(sourceNode instanceof Element) || !(targetNode instanceof Element)) {
    return;
  }

  const computed = window.getComputedStyle(sourceNode);
  for (const property of SVG_STYLE_PROPERTIES) {
    const value = computed.getPropertyValue(property);
    if (!value) continue;

    const normalizedValue = value.trim();
    if (!normalizedValue) continue;
    targetNode.style.setProperty(property, normalizedValue);
  }

  // Some SVG viewers ignore geometry properties (e.g. rx/ry) in inline CSS.
  // Promote them to attributes so exported files keep rounded corners.
  if (targetNode instanceof SVGRectElement) {
    const rx = computed.getPropertyValue("rx")?.trim();
    const ry = computed.getPropertyValue("ry")?.trim();
    if (rx && rx !== "auto" && rx !== "none" && rx !== "0px" && rx !== "0") {
      targetNode.setAttribute("rx", rx);
    }
    if (ry && ry !== "auto" && ry !== "none" && ry !== "0px" && ry !== "0") {
      targetNode.setAttribute("ry", ry);
    }
  }

  const sourceChildren = sourceNode.children;
  const targetChildren = targetNode.children;
  const childCount = Math.min(sourceChildren.length, targetChildren.length);
  for (let i = 0; i < childCount; i += 1) {
    applyComputedStylesRecursively(sourceChildren[i], targetChildren[i]);
  }
}

function triggerDownload(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
