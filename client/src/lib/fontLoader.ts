export interface FontItem {
  name: string;
  family: string;
  link: string;
}

export const FONTS_LIST: FontItem[] = [
  { name: 'Inter (Sans)', family: "'Inter', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800&display=swap' },
  { name: 'Outfit (Modern)', family: "'Outfit', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;700;800&display=swap' },
  { name: 'Plus Jakarta', family: "'Plus Jakarta Sans', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap' },
  { name: 'Poppins (Geometric)', family: "'Poppins', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700;800&display=swap' },
  { name: 'Montserrat (Display)', family: "'Montserrat', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700;800&display=swap' },
  { name: 'Playfair Display', family: "'Playfair Display', serif", link: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'JetBrains Mono', family: "'JetBrains Mono', monospace", link: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap' },
  { name: 'Cinzel (Roman Elegance)', family: "'Cinzel', serif", link: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap' },
  { name: 'Lora (Editorial)', family: "'Lora', serif", link: 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'Fira Sans', family: "'Fira Sans', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;700;800&display=swap' },
  { name: 'Nunito (Rounded)', family: "'Nunito', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap' },
  { name: 'Rubik (Soft Geo)', family: "'Rubik', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;700;800&display=swap' },
  { name: 'Quicksand (Cute)', family: "'Quicksand', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;700&display=swap' },
  { name: 'Manrope', family: "'Manrope', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;700;800&display=swap' },
  { name: 'Space Grotesk (Tech)', family: "'Space Grotesk', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap' },
  { name: 'Lexend', family: "'Lexend', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;700;800&display=swap' },
  { name: 'DM Sans', family: "'DM Sans', sans-serif", link: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap' },
  { name: 'Work Sans', family: "'Work Sans', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;700;800&display=swap' },
  { name: 'Merriweather (Sturdy)', family: "'Merriweather', serif", link: 'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'PT Serif', family: "'PT Serif', serif", link: 'https://fonts.googleapis.com/css2?family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'EB Garamond (Classic)', family: "'EB Garamond', serif", link: 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'Cormorant Garamond', family: "'Cormorant Garamond', serif", link: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'Crimson Text', family: "'Crimson Text', serif", link: 'https://fonts.googleapis.com/css2?family=Crimson+Text:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'Bodoni Moda (Luxury)', family: "'Bodoni Moda', serif", link: 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'Prata (Geometric Serif)', family: "'Prata', serif", link: 'https://fonts.googleapis.com/css2?family=Prata&display=swap' },
  { name: 'Syncopate (Extended)', family: "'Syncopate', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&display=swap' },
  { name: 'Kanit (Geo Sans)', family: "'Kanit', sans-serif", link: 'https://fonts.googleapis.com/css2?family=Kanit:wght@400;500;700;800&display=swap' },
  { name: 'Space Mono (Retro Tech)', family: "'Space Mono', monospace", link: 'https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap' },
  { name: 'IBM Plex Mono', family: "'IBM Plex Mono', monospace", link: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,700;1,400&display=swap' }
];

export function loadGoogleFont(fontFamily: string) {
  if (typeof window === 'undefined') return;

  // Clean quotes/fallback from family name: e.g. "'Montserrat', sans-serif" -> "Montserrat"
  const cleanFamily = fontFamily.replace(/['"]/g, '').split(',')[0].trim();
  const fontId = `google-font-${cleanFamily.toLowerCase().replace(/\s+/g, '-')}`;

  if (document.getElementById(fontId)) return;

  // Find defined font link if available
  const fontObj = FONTS_LIST.find(f => f.family.toLowerCase().includes(cleanFamily.toLowerCase()));
  const href = fontObj
    ? fontObj.link
    : `https://fonts.googleapis.com/css2?family=${cleanFamily.replace(/\s+/g, '+')}:wght@400;500;700;800&display=swap`;

  const link = document.createElement('link');
  link.id = fontId;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export function loadFontsFromHtml(html: string | null | undefined) {
  if (!html) return;
  // Match both inline font-family rules
  const matches = html.match(/font-family:\s*['"]?([^'";)]+)['"]?/g);
  if (matches) {
    matches.forEach(match => {
      const family = match.replace(/font-family:\s*/i, '').trim();
      loadGoogleFont(family);
    });
  }
}
