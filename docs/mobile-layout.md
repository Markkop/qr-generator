# Mobile editor hierarchy

The desktop uses a persistent type rail, editor and secondary QR preview. On phones,
stacking the same panels made the twelve-type selector occupy about 190 CSS pixels
before any form content, while the empty-state phone demo added another long panel.

## Research

- [NN/g: Sticky Headers](https://www.nngroup.com/articles/sticky-headers/): minimize
  persistent controls so they do not obstruct the content they help users reach.
- [Shopify: Layout](https://shopify.dev/docs/apps/design/layout): use containers to
  establish hierarchy, and give each interactive card one primary styled action.
- [NN/g: Accordions on Mobile](https://www.nngroup.com/articles/mobile-accordions/):
  disclose secondary material on demand while keeping the workflow understandable.

## Application

- Keep the desktop panels at the existing breakpoints. Below 640px, replace the
  type grid with a native, single-row selector showing the current type. All twelve
  choices remain available without horizontal scrolling or a custom modal.
- Keep that small toolbar visible and provide a direct link to the QR result, so
  long contact and calendar forms do not bury the output.
- Follow document and keyboard order: content and its summary, optional styling,
  then preview and download. Styling remains a closed disclosure by default.
- Collapse the illustrative phone demo on mobile and mount it only when requested.
  Show export controls when there is content to export rather than a block of
  disabled actions in the empty state.
- Use 44px icon buttons for paste and clear on phones, retaining accessible names
  and desktop labels. Use 16px mobile input text and cap the displayed QR at 240px;
  export resolution is unchanged.

These are design decisions inferred from the guidance, not claims that those
sources prescribe a particular QR editor. Only basic automated checks were run,
as requested; no browser or device usability testing was performed.
