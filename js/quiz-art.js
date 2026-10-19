/* Illustrations for the pre-test / post-test (quiz.html).
   One picture per question that shows the situation it describes, and small
   visuals for answers that are sizes, spacing or contrast values. They never
   mark the right answer, so the 20 items stay the same test as Appendix C. */
(function(){
  const P = '#3b172e', T = '#2f7a70', V = '#7656b3', G = '#d9e6e1', C = '#fcf7ef', F = "font-family:'Nunito',sans-serif;font-weight:800";
  const svg = (body, w = 320, h = 150) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-hidden="true">${body}</svg>`;
  const grid = (w = 320, h = 150) => `<defs><pattern id="g8" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M8 0H0V8" fill="none" stroke="#b7cec7" stroke-width="1"/></pattern></defs><rect width="${w}" height="${h}" fill="url(#g8)"/>`;
  const txt = (x, y, s, size = 14, fill = P, extra = '') => `<text x="${x}" y="${y}" style="${F};font-size:${size}px" fill="${fill}" ${extra}>${s}</text>`;
  const box = (x, y, w, h, fill = '#fff', stroke = P, r = 8) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3"/>`;
  const dim = (x1, y1, x2, y2, label, lx, ly) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${V}" stroke-width="2" marker-start="url(#a)" marker-end="url(#a)"/>${txt(lx, ly, label, 13, V)}`;
  const arrowDef = `<defs><marker id="a" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" fill="${V}"/></marker></defs>`;
  const card = (x, y, w = 56, h = 64, fill = '#f9d985') => box(x, y, w, h, fill, P, 8);
  const sample = (bg, fg, label, x, y, w = 130, h = 70, size = 22) => `${box(x, y, w, h, bg, P, 10)}${txt(x + w / 2, y + h / 2 + size / 3, label, size, fg, 'text-anchor="middle"')}`;

  const FIG = [
    // 1. 34px button on an 8-point grid
    svg(grid() + arrowDef + box(96, 52, 128, 34, '#94d9cf') + txt(160, 74, 'Button', 15, P, 'text-anchor="middle"') + dim(240, 52, 240, 86, '34px', 248, 74)),
    // 2. spacing between two items
    svg(grid() + arrowDef + box(80, 48, 64, 56, '#f9d985') + box(184, 48, 64, 56, '#f9d985') + dim(146, 76, 182, 76, '?', 158, 66)),
    // 3. items on a page
    svg(`<rect width="320" height="150" fill="${C}"/>` + box(70, 24, 120, 22, '#fff') + box(70, 58, 180, 22, '#fff') + box(70, 92, 150, 22, '#fff') + txt(268, 86, '?', 36, V)),
    // 4. navigation bar with "About" lower
    svg(`<rect width="320" height="150" fill="#fff"/><rect x="10" y="20" width="300" height="80" rx="10" fill="${C}" stroke="${P}" stroke-width="3"/>` +
      txt(40, 62, 'Home', 18) + txt(130, 70, 'About', 18) + txt(220, 62, 'Contact', 18) + txt(40, 122, 'Y = 56', 13, V) + txt(130, 130, 'Y = 64', 13, V) + txt(220, 122, 'Y = 56', 13, V)),
    // 5. cards in one row, uneven gaps
    svg(grid() + card(28, 44) + card(96, 44) + card(196, 44) + card(256, 44)),
    // 6. restaurant menu cards all over the place
    svg(`<rect width="320" height="150" fill="${C}"/>` + card(30, 20, 60, 70, '#f6b88a') + card(110, 52, 60, 70, '#f6b88a') + card(186, 14, 60, 70, '#f6b88a') + card(246, 60, 52, 64, '#f6b88a') + txt(16, 142, '🍗 Menu', 13, P)),
    // 7. a title over a card
    svg(grid() + txt(110, 44, 'Best Sellers', 18) + card(108, 60, 104, 70, '#f9d985')),
    // 8. the same text on two backgrounds
    svg(sample('#fff', '#9aa0a6', 'Aa', 30, 40) + sample('#123b54', '#9aa0a6', 'Aa', 160, 40)),
    // 9. normal-size text on a background
    svg(sample('#fff', '#5c6670', 'Normal text', 70, 40, 180, 70, 18) + txt(160, 134, 'contrast = ? : 1', 14, V, 'text-anchor="middle"')),
    // 10. gray text on white, 3.5:1
    svg(sample('#fff', '#8a8a8a', 'Gray text', 70, 30, 180, 70, 20) + txt(160, 128, '3.5 : 1', 16, V, 'text-anchor="middle"')),
    // 11. light gray text on a white button
    svg(`<rect width="320" height="150" fill="${C}"/>` + box(90, 50, 140, 48, '#fff', '#c9c9c9', 24) + txt(160, 80, 'Sign up', 17, '#cfcfcf', 'text-anchor="middle"')),
    // 12. white text on a light orange button
    svg(`<rect width="320" height="150" fill="${C}"/>` + box(80, 50, 160, 50, '#ffb877', '#e08a3c', 25) + txt(160, 81, 'Order now', 17, '#fff', 'text-anchor="middle"') + txt(250, 40, 'Fails ✕', 13, '#c0282d')),
    // 13. a phone in bright sunlight
    svg(`<rect width="320" height="150" fill="#fff7d1"/><circle cx="270" cy="34" r="20" fill="#f9d43a"/>` + box(110, 14, 92, 126, '#fff', P, 14) + txt(122, 56, 'Your order', 12, '#d9d9d9') + txt(122, 76, 'is ready', 12, '#d9d9d9') + txt(122, 96, 'for pickup', 12, '#d9d9d9')),
    // 14. black on white, 21:1
    svg(sample('#fff', '#000', 'Black text', 70, 30, 180, 70, 20) + txt(160, 128, '21 : 1', 16, V, 'text-anchor="middle"')),
    // 15. large text
    svg(sample('#fff', '#6e7780', 'Large text', 50, 28, 220, 82, 30) + txt(160, 134, '18pt, or 14pt bold', 13, V, 'text-anchor="middle"')),
    // 16. body text on a screen
    svg(`<rect width="320" height="150" fill="${C}"/>` + box(60, 14, 200, 122, '#fff', P, 10) + `<rect x="78" y="34" width="150" height="8" rx="4" fill="#c9c9c9"/><rect x="78" y="52" width="164" height="8" rx="4" fill="#c9c9c9"/><rect x="78" y="70" width="130" height="8" rx="4" fill="#c9c9c9"/><rect x="78" y="88" width="156" height="8" rx="4" fill="#c9c9c9"/>` + txt(160, 124, 'Body text: ? px', 13, V, 'text-anchor="middle"')),
    // 17. a heading, a subheading and details
    svg(`<rect width="320" height="150" fill="${C}"/>` + txt(40, 50, 'Heading', 32) + txt(40, 82, 'Subheading', 20, T) + txt(40, 110, 'Small details and notes', 13, '#5c6670')),
    // 18. dashboard card: label 24px, value 16px
    svg(`<rect width="320" height="150" fill="${C}"/>` + box(80, 18, 160, 114, '#fff', P, 12) + txt(100, 60, 'GWA', 24) + txt(100, 92, '1.75', 16, T) + txt(184, 60, '24px', 12, V) + txt(184, 92, '16px', 12, V)),
    // 19. sidebar menu: one link smaller than the rest
    svg(`<rect width="320" height="150" fill="${C}"/>` + box(90, 10, 140, 130, '#fff', P, 10) + txt(110, 42, 'Home', 18) + txt(110, 70, 'Enrollment', 18) + txt(110, 94, 'Documents', 13) + txt(110, 124, 'Grades', 18)),
    // 20. game settings: labels, helper text and values all the same
    svg(`<rect width="320" height="150" fill="#1f2a44"/>` + txt(28, 40, 'Graphics', 15, '#e8ecf5') + txt(28, 66, 'Shadows', 15, '#e8ecf5') + txt(28, 92, 'Better lighting, slower', 15, '#e8ecf5') + txt(28, 118, 'Resolution', 15, '#e8ecf5') + txt(220, 66, 'High', 15, '#e8ecf5') + txt(220, 118, '1920 x 1080', 15, '#e8ecf5')),
  ];

  // Small visuals next to answers that are values (never highlighting the right one).
  const bar = h => svg(`<rect x="8" y="${40 - h}" width="40" height="${h}" rx="4" fill="#94d9cf" stroke="${P}" stroke-width="2"/>`, 56, 44);
  const gap = px => svg(`<rect x="2" y="10" width="14" height="24" rx="3" fill="#f9d985" stroke="${P}" stroke-width="2"/><rect x="${18 + px}" y="10" width="14" height="24" rx="3" fill="#f9d985" stroke="${P}" stroke-width="2"/>`, 56, 44);
  const ratio = (fg, bg) => svg(`<rect x="2" y="4" width="52" height="36" rx="6" fill="${bg}" stroke="${P}" stroke-width="2"/><text x="28" y="29" text-anchor="middle" style="${F};font-size:16px" fill="${fg}">Aa</text>`, 56, 44);
  const size = px => svg(`<text x="28" y="${22 + px / 3}" text-anchor="middle" style="${F};font-size:${px}px" fill="${P}">Aa</text>`, 56, 44);
  const OPT = {
    8: [ratio('#767676', '#fff'), ratio('#aaaaaa', '#fff'), ratio('#949494', '#fff'), ratio('#595959', '#fff')],
    14: [ratio('#aaaaaa', '#fff'), ratio('#949494', '#fff'), ratio('#767676', '#fff'), ratio('#595959', '#fff')],
    15: [size(10), size(12), size(16), size(24)],
  };
  // No picture for these (0-based): Q2 and Q5 read as confusing, Q8 and Q13 gave the answer away.
  [1, 4, 7, 12].forEach(i => { FIG[i] = ''; });
  window.EC_QUIZ_ART = { fig: i => FIG[i] || '', opt: (i, k) => (OPT[i] || [])[k] || '' };
})();
