import { Node, mergeAttributes } from "@tiptap/react";

/**
 * Custom TipTap node that preserves <div> elements with inline styles.
 * This is used for:
 * 1. Background-colored section boxes in generated articles
 * 2. Pro Tip template sections (with SVG icon, green border)
 * 3. Summary template sections (with gray border)
 * Without this extension, TipTap's StarterKit strips <div> tags and their styles.
 */
export const StyledBox = Node.create({
  name: "styledBox",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      style: {
        default: null,
        parseHTML: (element) => element.getAttribute("style"),
        renderHTML: (attributes) => {
          if (!attributes.style) return {};
          return { style: attributes.style };
        },
      },
      class: {
        default: null,
        parseHTML: (element) => element.getAttribute("class"),
        renderHTML: (attributes) => {
          if (!attributes.class) return {};
          return { class: attributes.class };
        },
      },
      "data-template": {
        default: null,
        parseHTML: (element) => element.getAttribute("data-template"),
        renderHTML: (attributes) => {
          if (!attributes["data-template"]) return {};
          return { "data-template": attributes["data-template"] };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        // Match template-styled divs (Pro Tip, Summary)
        tag: "div[data-template]",
      },
      {
        tag: "div[style]",
        // Only match divs that have background-color in their style
        getAttrs: (node) => {
          const style = (node as HTMLElement).getAttribute("style") || "";
          if (style.includes("background-color") || style.includes("background:")) {
            return {};
          }
          return false;
        },
      },
      {
        tag: "div.styled-box",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), 0];
  },
});
