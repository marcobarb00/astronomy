/* ==========================================================================
   PREDICTING THE SKY - TYPES OF THE LIBRARIES FROM CDNJS
   (tools/check/types/globals.d.ts)
   Only for the type check (tools/check/typecheck.js): KaTeX and its
   auto-render extension, loaded by the pages from cdnjs, declare these
   two globals. The site does not use this file.
   ========================================================================== */

declare const katex: {
	render(source: string, element: Element, options?: object): void;
};

declare function renderMathInElement(element: Element, options?: object): void;
