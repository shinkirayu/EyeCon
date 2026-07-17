/* =====================================================
   EyeCon — Cosmetic catalog for the desktop customization shop
   All items here are purely cosmetic — nothing here affects
   scoring, grading, XP, or level access.
   Exposes window.EC_COSMETICS
===================================================== */
(function(){

  const RARITY = {
    common:    { label:'Common',    order:0, color:'#9aa0a6', glow:'rgba(154,160,166,0.55)' },
    rare:      { label:'Rare',      order:1, color:'#3fa7c9', glow:'rgba(63,167,201,0.6)'   },
    epic:      { label:'Epic',      order:2, color:'#9b7fd4', glow:'rgba(155,127,212,0.65)' },
    legendary: { label:'Legendary', order:3, color:'#f5a623', glow:'rgba(245,166,35,0.8)'   },
  };
  // Drop-rate weights for a single pull (must be positive; needn't sum to 100).
  const RARITY_WEIGHTS = { common:55, rare:30, epic:12, legendary:3 };
  // Currency refund when a pull rolls an item you already own.
  const DUPLICATE_REFUND = { common:5, rare:15, epic:40, legendary:120 };

  const ITEMS = [
    // ---- Desktop wallpapers ----
    { id:'wp-mint',     category:'wallpaper', name:'Mint Breeze',      rarity:'common',    emoji:'🌿', css:'linear-gradient(160deg, #bfe9db 0%, #9ed9c8 100%)' },
    { id:'wp-peach',    category:'wallpaper', name:'Peach Fuzz',       rarity:'common',    emoji:'🍑', css:'linear-gradient(160deg, #ffe3d0 0%, #ffc9a8 100%)' },
    { id:'wp-lavender', category:'wallpaper', name:'Lavender Fields',  rarity:'rare',      emoji:'💜', css:'linear-gradient(160deg, #e3d6f7 0%, #c6aef0 100%)' },
    { id:'wp-sunset',   category:'wallpaper', name:'Sunset Studio',    rarity:'epic',      emoji:'🌅', css:'linear-gradient(160deg, #ffb385 0%, #ff7a90 55%, #a86bd0 100%)', isNew:true },
    { id:'wp-galaxy',   category:'wallpaper', name:'Galaxy Desk',      rarity:'legendary', emoji:'🌌', css:'linear-gradient(160deg, #1b1035 0%, #3a1c6e 45%, #7b2fb5 100%)', featured:true },

    // ---- Window themes (color schemes) ----
    // accent/accentDark remap --purple (selection, sidebar, tags); secondary/
    // secondaryDark remap --teal (primary actions, accept buttons) — together
    // they reskin most of the app's UI chrome coherently.
    { id:'theme-classic',  category:'windowTheme', name:'Classic Purple', rarity:'common',    accent:'#9b7fd4', accentDark:'#7c5fc4', secondary:'#4fb8a9', secondaryDark:'#2e8c7e' },
    { id:'theme-ocean',    category:'windowTheme', name:'Ocean Blue',     rarity:'common',    accent:'#4f8ab8', accentDark:'#2e5f8c', secondary:'#3fc9c2', secondaryDark:'#1f9a94' },
    { id:'theme-rose',     category:'windowTheme', name:'Rose Gold',      rarity:'rare',      accent:'#d88ea3', accentDark:'#b56a80', secondary:'#e0ac6a', secondaryDark:'#c08a48' },
    { id:'theme-forest',   category:'windowTheme', name:'Forest Moss',    rarity:'epic',      accent:'#7a9d6e', accentDark:'#5c7d52', secondary:'#c9a227', secondaryDark:'#a3831c', isNew:true },
    { id:'theme-midnight', category:'windowTheme', name:'Midnight Gold',  rarity:'legendary', accent:'#f5c544', accentDark:'#e0ac1f', secondary:'#7c5fc4', secondaryDark:'#5c3fa4', featured:true },

    // ---- Desktop icon packs (Mail / Stats / Settings / Shop glyphs) ----
    { id:'icons-classic', category:'iconPack', name:'Classic Icons',   rarity:'common',    icons:{ mail:'📬', stats:'📊', settings:'⚙️', shop:'🛍️' } },
    { id:'icons-outline', category:'iconPack', name:'Minimal Outline', rarity:'rare',      icons:{ mail:'✉️', stats:'📈', settings:'🔧', shop:'🎁' } },
    { id:'icons-neon',    category:'iconPack', name:'Neon Set',        rarity:'epic',      icons:{ mail:'💌', stats:'📉', settings:'🛠️', shop:'💎' } },
    { id:'icons-royal',   category:'iconPack', name:'Royal Crest',     rarity:'legendary', icons:{ mail:'👑', stats:'🏆', settings:'⚜️', shop:'💰' }, featured:true },

    // ---- Mouse cursor styles ----
    { id:'cursor-default', category:'cursor', name:'Classic Pointer', rarity:'common',    emoji:null },
    { id:'cursor-sparkle', category:'cursor', name:'Sparkle Tip',     rarity:'rare',      emoji:'✨' },
    { id:'cursor-star',    category:'cursor', name:'Shooting Star',   rarity:'epic',      emoji:'⭐' },
    { id:'cursor-crown',   category:'cursor', name:'Golden Crown',    rarity:'legendary', emoji:'👑', featured:true },

    // ---- Decorative desk items / stickers (up to 3 equipped at once) ----
    { id:'decor-cactus', category:'decor', name:'Cactus Buddy',  rarity:'common',    emoji:'🌵' },
    { id:'decor-mug',    category:'decor', name:'Coffee Mug',    rarity:'common',    emoji:'☕' },
    { id:'decor-lamp',   category:'decor', name:'Desk Lamp',     rarity:'rare',      emoji:'💡', isNew:true },
    { id:'decor-cat',    category:'decor', name:'Studio Cat',    rarity:'epic',      emoji:'🐱' },
    { id:'decor-trophy', category:'decor', name:'Golden Trophy', rarity:'legendary', emoji:'🏆' },

    // ---- UI skins / visual effects ----
    { id:'skin-default',  category:'uiSkin', name:'Standard',        rarity:'common',    effect:'none' },
    { id:'skin-sparkle',  category:'uiSkin', name:'Sparkle Trails',  rarity:'epic',      effect:'sparkle' },
    { id:'skin-confetti', category:'uiSkin', name:'Confetti Pop',    rarity:'legendary', effect:'confetti', featured:true },
  ];

  const CATEGORY_LABELS = {
    wallpaper:'Wallpaper', windowTheme:'Window Theme', iconPack:'Icon Pack',
    cursor:'Cursor', decor:'Desk Decor', uiSkin:'UI Skin',
  };
  const CATEGORY_ORDER = ['wallpaper','windowTheme','iconPack','cursor','decor','uiSkin'];
  // Every player starts owning (and wearing) these baseline items.
  const CATEGORY_DEFAULT = {
    wallpaper:'wp-mint', windowTheme:'theme-classic', iconPack:'icons-classic',
    cursor:'cursor-default', uiSkin:'skin-default',
  };

  function getItem(id){ return ITEMS.find(i=>i.id===id); }
  function itemsByCategory(cat){ return ITEMS.filter(i=>i.category===cat); }

  window.EC_COSMETICS = {
    RARITY, RARITY_WEIGHTS, DUPLICATE_REFUND, ITEMS,
    CATEGORY_LABELS, CATEGORY_ORDER, CATEGORY_DEFAULT,
    getItem, itemsByCategory,
  };
})();
