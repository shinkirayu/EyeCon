/* =====================================================
   WCAG contrast + color utilities
   Exposes window.WCAG
===================================================== */
(function(){

  function hexToRgb(hex){
    if(!hex) return {r:0,g:0,b:0};
    hex = hex.replace('#','').trim();
    if(hex.length === 3){
      hex = hex.split('').map(c=>c+c).join('');
    }
    const int = parseInt(hex,16);
    return {
      r: (int >> 16) & 255,
      g: (int >> 8) & 255,
      b: int & 255
    };
  }

  function relLuminance({r,g,b}){
    const chan = v => {
      const c = v/255;
      return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4);
    };
    const R = chan(r), G = chan(g), B = chan(b);
    return 0.2126*R + 0.7152*G + 0.0722*B;
  }

  function contrastRatio(hex1, hex2){
    const L1 = relLuminance(hexToRgb(hex1));
    const L2 = relLuminance(hexToRgb(hex2));
    const lighter = Math.max(L1,L2), darker = Math.min(L1,L2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  // isLarge: fontSize>=24 OR (fontSize>=18.66 AND bold)
  function isLargeText(fontSizePx, bold){
    if(fontSizePx >= 24) return true;
    if(bold && fontSizePx >= 18.66) return true;
    return false;
  }

  function requiredRatio(fontSizePx, bold, level){
    const large = isLargeText(fontSizePx, bold);
    level = level || 'AA';
    if(level === 'AAA') return large ? 4.5 : 7;
    return large ? 3 : 4.5;
  }

  function passesWCAG(hex1, hex2, fontSizePx, bold, level){
    const ratio = contrastRatio(hex1, hex2);
    const required = requiredRatio(fontSizePx, bold, level);
    return { ratio, required, pass: ratio >= required };
  }

  function relativeLuminanceHex(hex){ return relLuminance(hexToRgb(hex)); }

  window.WCAG = { hexToRgb, relLuminance, contrastRatio, isLargeText, requiredRatio, passesWCAG, relativeLuminanceHex };
})();
