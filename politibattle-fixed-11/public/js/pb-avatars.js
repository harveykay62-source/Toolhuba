/**
 * pb-avatars.js — PolitiBattle SVG Caricature Avatars
 * Each avatar is a hand-crafted SVG cartoon caricature.
 * viewBox="0 0 120 160" — transparent background — SVG primitives only.
 */

window.PBData = window.PBData || {};

window.PBData.AVATARS = {

  /* ─────────────────────────────────────────────────────────────── OBAMA */
  obama: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-obama" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Body / suit -->
  <rect x="28" y="88" width="64" height="58" rx="6" fill="#4a5568" filter="url(#sh-obama)"/>
  <!-- White shirt / tie -->
  <rect x="52" y="88" width="16" height="58" rx="2" fill="#f0f0f0"/>
  <polygon points="60,92 56,130 64,130" fill="#b22234"/>
  <!-- American flag pin -->
  <rect x="36" y="96" width="9" height="6" rx="1" fill="#b22234"/>
  <rect x="36" y="96" width="9" height="2" fill="#b22234"/>
  <rect x="36" y="98" width="9" height="2" fill="#f0f0f0"/>
  <rect x="36" y="100" width="9" height="2" fill="#b22234"/>
  <rect x="36" y="96" width="3" height="6" fill="#3c3b6e"/>
  <!-- Neck -->
  <rect x="51" y="78" width="18" height="14" rx="4" fill="#7a5c28"/>
  <!-- Head -->
  <ellipse cx="60" cy="62" rx="28" ry="30" fill="#7a5c28" filter="url(#sh-obama)"/>
  <!-- Large ears -->
  <ellipse cx="31" cy="64" rx="7" ry="9" fill="#7a5c28"/>
  <ellipse cx="31" cy="64" rx="4" ry="6" fill="#6a4c18"/>
  <ellipse cx="89" cy="64" rx="7" ry="9" fill="#7a5c28"/>
  <ellipse cx="89" cy="64" rx="4" ry="6" fill="#6a4c18"/>
  <!-- Hair -->
  <ellipse cx="60" cy="37" rx="26" ry="10" fill="#1a1a1a"/>
  <rect x="34" y="37" width="52" height="8" fill="#1a1a1a"/>
  <!-- Eyes -->
  <ellipse cx="49" cy="60" rx="5" ry="4" fill="white"/>
  <ellipse cx="71" cy="60" rx="5" ry="4" fill="white"/>
  <circle cx="50" cy="61" r="3" fill="#1a1a1a"/>
  <circle cx="72" cy="61" r="3" fill="#1a1a1a"/>
  <circle cx="51" cy="60" r="1" fill="white"/>
  <circle cx="73" cy="60" r="1" fill="white"/>
  <!-- Nose -->
  <ellipse cx="60" cy="70" rx="5" ry="4" fill="#6a4c18"/>
  <circle cx="57" cy="72" r="2" fill="#5a3c08"/>
  <circle cx="63" cy="72" r="2" fill="#5a3c08"/>
  <!-- Wide toothy smile -->
  <path d="M44,80 Q60,96 76,80" fill="#cc8844" stroke="#5a3c08" stroke-width="1"/>
  <rect x="48" y="80" width="24" height="7" rx="2" fill="white"/>
  <line x1="52" y1="80" x2="52" y2="87" stroke="#ddd" stroke-width="1"/>
  <line x1="56" y1="80" x2="56" y2="87" stroke="#ddd" stroke-width="1"/>
  <line x1="60" y1="80" x2="60" y2="87" stroke="#ddd" stroke-width="1"/>
  <line x1="64" y1="80" x2="64" y2="87" stroke="#ddd" stroke-width="1"/>
  <line x1="68" y1="80" x2="68" y2="87" stroke="#ddd" stroke-width="1"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────────── TRUMP */
  trump: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-trump" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Body / suit dark -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#2a2a2a" filter="url(#sh-trump)"/>
  <!-- White shirt -->
  <rect x="50" y="88" width="20" height="60" rx="2" fill="#f5f5f5"/>
  <!-- Red tie — extra long -->
  <polygon points="60,91 55,145 65,145 63,91" fill="#cc0000"/>
  <!-- Neck orange -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#FF7518"/>
  <!-- Head large orange -->
  <ellipse cx="60" cy="60" rx="30" ry="32" fill="#FF7518" filter="url(#sh-trump)"/>
  <!-- Combover — big swept right blonde -->
  <path d="M30,44 Q45,18 80,28 Q88,32 85,38 Q72,22 40,36 Z" fill="#D4AF37"/>
  <path d="M34,38 Q55,20 84,30 Q90,35 88,42 Q70,26 38,40 Z" fill="#E8C94A"/>
  <path d="M32,46 Q50,30 82,36 Q86,40 84,46 Q64,32 36,48 Z" fill="#C8A030"/>
  <!-- Eyes small squinting -->
  <ellipse cx="48" cy="58" rx="6" ry="4" fill="white"/>
  <ellipse cx="72" cy="58" rx="6" ry="4" fill="white"/>
  <circle cx="49" cy="59" r="3" fill="#4040c0"/>
  <circle cx="73" cy="59" r="3" fill="#4040c0"/>
  <circle cx="50" cy="58" r="1" fill="white"/>
  <circle cx="74" cy="58" r="1" fill="white"/>
  <!-- Eyebrows furrowed -->
  <path d="M42,52 Q48,49 54,52" stroke="#C8A030" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M66,52 Q72,49 78,52" stroke="#C8A030" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- Nose -->
  <ellipse cx="60" cy="68" rx="6" ry="5" fill="#E86010"/>
  <!-- Tiny pursed mouth smug -->
  <path d="M53,78 Q60,75 67,78" stroke="#cc6622" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M55,78 Q60,76 65,78" fill="#cc3300"/>
  <!-- Ankle bracelet — DEPORTED -->
  <rect x="35" y="148" width="20" height="7" rx="3" fill="#cc0000"/>
  <text x="36" y="155" font-size="4" fill="white" font-family="Arial" font-weight="bold">DEPORTED</text>
  <!-- Leg stub right -->
  <rect x="36" y="140" width="14" height="12" rx="2" fill="#2a2a2a"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────────── BIDEN */
  biden: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-biden" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Body dark suit -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#1a2a4a" filter="url(#sh-biden)"/>
  <!-- AMTRAK pin -->
  <rect x="34" y="96" width="14" height="6" rx="2" fill="#0066cc"/>
  <text x="35" y="102" font-size="4.5" fill="white" font-family="Arial" font-weight="bold">AMTRAK</text>
  <!-- White shirt -->
  <rect x="50" y="88" width="20" height="60" rx="2" fill="#f0f0f0"/>
  <!-- Tie blue -->
  <polygon points="60,92 56,130 64,130" fill="#1a5276"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#d4956a"/>
  <!-- Head -->
  <ellipse cx="60" cy="60" rx="28" ry="30" fill="#d4956a" filter="url(#sh-biden)"/>
  <!-- Silver swept-back hair -->
  <path d="M32,42 Q40,24 60,28 Q80,24 88,42 Q82,30 60,32 Q38,30 32,42 Z" fill="#c8c8c8"/>
  <path d="M33,50 Q34,36 60,34 Q86,36 87,50" fill="#b8b8b8"/>
  <!-- Aviator sunglasses -->
  <rect x="36" y="55" width="18" height="11" rx="5" fill="#5599ee" opacity="0.85"/>
  <rect x="66" y="55" width="18" height="11" rx="5" fill="#5599ee" opacity="0.85"/>
  <line x1="54" y1="60" x2="66" y2="60" stroke="#888" stroke-width="2"/>
  <path d="M36,60 Q32,58 30,60" stroke="#888" stroke-width="2" fill="none"/>
  <path d="M84,60 Q88,58 90,60" stroke="#888" stroke-width="2" fill="none"/>
  <rect x="36" y="55" width="18" height="11" rx="5" fill="none" stroke="#888" stroke-width="1.5"/>
  <rect x="66" y="55" width="18" height="11" rx="5" fill="none" stroke="#888" stroke-width="1.5"/>
  <!-- Nose -->
  <ellipse cx="60" cy="71" rx="5" ry="4" fill="#c07a50"/>
  <!-- Creepy wide grin too many teeth -->
  <path d="M40,82 Q60,100 80,82" fill="#b06040" stroke="#804020" stroke-width="1"/>
  <rect x="44" y="82" width="32" height="8" rx="2" fill="white"/>
  <line x1="48" y1="82" x2="48" y2="90" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="52" y1="82" x2="52" y2="90" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="56" y1="82" x2="56" y2="90" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="60" y1="82" x2="60" y2="90" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="64" y1="82" x2="64" y2="90" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="68" y1="82" x2="68" y2="90" stroke="#e0e0e0" stroke-width="1"/>
  <line x1="72" y1="82" x2="72" y2="90" stroke="#e0e0e0" stroke-width="1"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── HILLARY */
  hillary: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-hillary" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Body pantsuit yellow -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#d4a800" filter="url(#sh-hillary)"/>
  <!-- Lapels -->
  <polygon points="50,88 60,108 60,88" fill="#b89000"/>
  <polygon points="70,88 60,108 60,88" fill="#c8a000"/>
  <!-- Server rack under left arm -->
  <rect x="10" y="100" width="22" height="40" rx="3" fill="#555"/>
  <rect x="12" y="104" width="18" height="4" rx="1" fill="#333"/>
  <rect x="12" y="110" width="18" height="4" rx="1" fill="#222"/>
  <rect x="12" y="116" width="18" height="4" rx="1" fill="#333"/>
  <rect x="12" y="122" width="18" height="4" rx="1" fill="#222"/>
  <!-- Email icon on server -->
  <rect x="13" y="104" width="8" height="5" rx="1" fill="#4466cc"/>
  <polyline points="13,104 17,108 21,104" stroke="white" stroke-width="1" fill="none"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#d4956a"/>
  <!-- Head -->
  <ellipse cx="60" cy="60" rx="26" ry="28" fill="#d4956a" filter="url(#sh-hillary)"/>
  <!-- Grey-blonde bob hair -->
  <path d="M34,52 Q34,28 60,26 Q86,28 86,52 Q86,60 82,65 Q78,52 60,50 Q42,52 38,65 Q34,60 34,52 Z" fill="#c8c8a0"/>
  <path d="M34,58 Q36,68 38,68 Q40,56 60,54 Q80,56 82,68 Q84,68 86,58" fill="#b8b890" stroke="none"/>
  <!-- Eyes -->
  <ellipse cx="50" cy="60" rx="5" ry="4" fill="white"/>
  <ellipse cx="70" cy="60" rx="5" ry="4" fill="white"/>
  <circle cx="51" cy="61" r="3" fill="#3a3a5a"/>
  <circle cx="71" cy="61" r="3" fill="#3a3a5a"/>
  <circle cx="52" cy="60" r="1" fill="white"/>
  <circle cx="72" cy="60" r="1" fill="white"/>
  <!-- Eyebrows arched -->
  <path d="M45,55 Q50,52 55,55" stroke="#8a7060" stroke-width="2" fill="none"/>
  <path d="M65,55 Q70,52 75,55" stroke="#8a7060" stroke-width="2" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="68" rx="4" ry="4" fill="#c07a50"/>
  <!-- Calculating smile -->
  <path d="M50,77 Q60,85 70,77" fill="#cc4444" stroke="#993333" stroke-width="1"/>
  <path d="M52,77 Q60,83 68,77" fill="#dd6666"/>
</svg>`,

  /* ────────────────────────────────────────────────────────────── BUSH */
  bush: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-bush" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Body blue suit -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#2a4a8a" filter="url(#sh-bush)"/>
  <!-- White shirt / tie -->
  <rect x="50" y="88" width="20" height="60" rx="2" fill="#f0f0f0"/>
  <polygon points="60,92 56,125 64,125" fill="#8a1a1a"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#d4956a"/>
  <!-- Head -->
  <ellipse cx="60" cy="60" rx="26" ry="28" fill="#d4956a" filter="url(#sh-bush)"/>
  <!-- Brown hair -->
  <path d="M34,48 Q36,30 60,28 Q84,30 86,48 Q80,34 60,32 Q40,34 34,48 Z" fill="#7a5c38"/>
  <!-- Pretzel on head -->
  <ellipse cx="60" cy="30" rx="8" ry="5" fill="#8B6914" stroke="#5a3a04" stroke-width="1.5"/>
  <path d="M54,30 Q56,25 60,27 Q64,25 66,30 Q64,35 60,33 Q56,35 54,30" fill="none" stroke="#5a3a04" stroke-width="1.5"/>
  <!-- Eyes wide confused -->
  <ellipse cx="49" cy="61" rx="6" ry="6" fill="white"/>
  <ellipse cx="71" cy="61" rx="6" ry="6" fill="white"/>
  <circle cx="50" cy="62" r="4" fill="#6a4a2a"/>
  <circle cx="72" cy="62" r="4" fill="#6a4a2a"/>
  <circle cx="51" cy="61" r="1.5" fill="white"/>
  <circle cx="73" cy="61" r="1.5" fill="white"/>
  <!-- Eyebrows raised confused -->
  <path d="M43,53 Q49,49 55,53" stroke="#7a5c38" stroke-width="2.5" fill="none"/>
  <path d="M65,53 Q71,49 77,53" stroke="#7a5c38" stroke-width="2.5" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="69" rx="5" ry="4" fill="#c07a50"/>
  <!-- Slight smirk -->
  <path d="M50,78 Q58,84 70,79" stroke="#9a5a3a" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── CHENEY */
  cheney: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-cheney" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Body dark suit -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#1a1a2a" filter="url(#sh-cheney)"/>
  <!-- Halliburton pin -->
  <circle cx="36" cy="98" r="5" fill="#cc8800"/>
  <text x="33" y="101" font-size="4" fill="white" font-family="Arial" font-weight="bold">H</text>
  <!-- White shirt -->
  <rect x="50" y="88" width="20" height="60" rx="2" fill="#e8e8e8"/>
  <polygon points="60,92 56,125 64,125" fill="#334466"/>
  <!-- Shotgun in right hand pointing sideways -->
  <rect x="78" y="115" width="36" height="6" rx="2" fill="#6a5030" filter="url(#sh-cheney)"/>
  <rect x="85" y="112" width="6" height="12" rx="2" fill="#8a7050"/>
  <circle cx="80" cy="118" r="3" fill="#5a4020"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#c89a70"/>
  <!-- Head wider -->
  <ellipse cx="60" cy="60" rx="27" ry="26" fill="#c89a70" filter="url(#sh-cheney)"/>
  <!-- Grey slicked hair -->
  <path d="M33,50 Q36,32 60,30 Q84,32 87,50 Q80,34 60,32 Q40,34 33,50 Z" fill="#888"/>
  <path d="M33,54 Q36,46 60,44 Q84,46 87,54" fill="#999"/>
  <!-- Eyes contemptuous squint -->
  <ellipse cx="48" cy="60" rx="6" ry="3" fill="white"/>
  <ellipse cx="72" cy="60" rx="6" ry="3" fill="white"/>
  <circle cx="49" cy="60" r="2.5" fill="#3a3a3a"/>
  <circle cx="73" cy="60" r="2.5" fill="#3a3a3a"/>
  <circle cx="50" cy="59" r="1" fill="white"/>
  <circle cx="74" cy="59" r="1" fill="white"/>
  <!-- Eyebrows furrowed down one side sneer -->
  <path d="M42,55 Q48,53 54,55" stroke="#888" stroke-width="2" fill="none"/>
  <path d="M66,53 Q72,56 78,54" stroke="#888" stroke-width="2" fill="none"/>
  <!-- Nose bulbous -->
  <ellipse cx="60" cy="68" rx="6" ry="5" fill="#b08060"/>
  <!-- Permanent sneer -->
  <path d="M48,77 Q55,82 68,76" stroke="#8a5030" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M48,77 Q46,74 48,72" stroke="#8a5030" stroke-width="1.5" fill="none"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── BERNIE */
  bernie: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-bernie" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Body rumpled grey suit -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#666" filter="url(#sh-bernie)"/>
  <!-- Slightly off white shirt -->
  <rect x="50" y="88" width="20" height="60" rx="2" fill="#e8e0d0"/>
  <polygon points="60,92 56,120 64,120" fill="#224488"/>
  <!-- Mittens visible at sides -->
  <ellipse cx="22" cy="118" rx="12" ry="10" fill="#cc4422"/>
  <path d="M14,112 Q10,115 12,122 Q14,128 22,128 Q30,125 30,118" fill="#cc4422"/>
  <!-- Mitten pattern lines -->
  <line x1="16" y1="116" x2="28" y2="116" stroke="#44aa44" stroke-width="1.5"/>
  <line x1="15" y1="120" x2="29" y2="120" stroke="#44aa44" stroke-width="1.5"/>
  <line x1="16" y1="124" x2="28" y2="124" stroke="#44aa44" stroke-width="1.5"/>
  <!-- Pointing finger right hand large -->
  <rect x="90" y="95" width="28" height="8" rx="4" fill="#d4956a"/>
  <ellipse cx="118" cy="99" rx="5" ry="4" fill="#d4956a"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#c89a70"/>
  <!-- Head -->
  <ellipse cx="60" cy="60" rx="26" ry="28" fill="#c89a70" filter="url(#sh-bernie)"/>
  <!-- Bald top, wild white side hair -->
  <ellipse cx="60" cy="44" rx="20" ry="12" fill="#c89a70"/>
  <!-- Wild white hair left -->
  <path d="M34,46 Q24,38 22,50 Q20,60 30,64 Q34,56 36,50 Z" fill="white"/>
  <path d="M34,50 Q26,44 25,54 Q24,62 32,66" fill="white"/>
  <!-- Wild white hair right -->
  <path d="M86,46 Q96,38 98,50 Q100,60 90,64 Q86,56 84,50 Z" fill="white"/>
  <path d="M86,50 Q94,44 95,54 Q96,62 88,66" fill="white"/>
  <!-- Eyes outraged wide -->
  <ellipse cx="49" cy="60" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="60" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="61" r="3.5" fill="#4444aa"/>
  <circle cx="72" cy="61" r="3.5" fill="#4444aa"/>
  <circle cx="51" cy="60" r="1.2" fill="white"/>
  <circle cx="73" cy="60" r="1.2" fill="white"/>
  <!-- Eyebrows furrowed down -->
  <path d="M43,53 Q49,50 55,53" stroke="#aaa" stroke-width="3" fill="none"/>
  <path d="M65,53 Q71,50 77,53" stroke="#aaa" stroke-width="3" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="68" rx="5" ry="4" fill="#b07850"/>
  <!-- Outrage open mouth -->
  <path d="M48,78 Q60,92 72,78" fill="#8a2020" stroke="#6a1010" stroke-width="1"/>
  <ellipse cx="60" cy="84" rx="8" ry="5" fill="#8a2020"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── PELOSI */
  pelosi: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-pelosi" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Body formal dark -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#1a3050" filter="url(#sh-pelosi)"/>
  <!-- Pearl necklace -->
  <ellipse cx="60" cy="90" rx="18" ry="4" fill="none" stroke="white" stroke-width="2" stroke-dasharray="4,2"/>
  <!-- American flag pin -->
  <rect x="36" y="96" width="9" height="6" rx="1" fill="#b22234"/>
  <rect x="36" y="96" width="9" height="2" fill="#b22234"/>
  <rect x="36" y="98" width="9" height="2" fill="#f0f0f0"/>
  <rect x="36" y="100" width="9" height="2" fill="#b22234"/>
  <rect x="36" y="96" width="3" height="6" fill="#3c3b6e"/>
  <!-- Slow clap hands -->
  <ellipse cx="20" cy="118" rx="12" ry="8" fill="#d4956a" filter="url(#sh-pelosi)"/>
  <ellipse cx="100" cy="118" rx="12" ry="8" fill="#d4956a" filter="url(#sh-pelosi)"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#d4a080"/>
  <!-- Head -->
  <ellipse cx="60" cy="60" rx="26" ry="28" fill="#d4a080" filter="url(#sh-pelosi)"/>
  <!-- Blonde hair styled -->
  <path d="M34,48 Q34,26 60,24 Q86,26 86,48 Q80,30 60,28 Q40,30 34,48 Z" fill="#D4B040"/>
  <path d="M34,52 Q36,62 38,66 Q36,54 34,52 Z" fill="#C8A030"/>
  <path d="M86,52 Q84,62 82,66 Q84,54 86,52 Z" fill="#C8A030"/>
  <!-- Eyes withering -->
  <ellipse cx="49" cy="60" rx="6" ry="4" fill="white"/>
  <ellipse cx="71" cy="60" rx="6" ry="4" fill="white"/>
  <circle cx="50" cy="61" r="3" fill="#3a3a5a"/>
  <circle cx="72" cy="61" r="3" fill="#3a3a5a"/>
  <circle cx="51" cy="60" r="1" fill="white"/>
  <circle cx="73" cy="60" r="1" fill="white"/>
  <!-- Eyebrows arch high sarcasm -->
  <path d="M43,53 Q49,48 55,52" stroke="#C8A030" stroke-width="2.5" fill="none"/>
  <path d="M65,52 Q71,48 77,53" stroke="#C8A030" stroke-width="2.5" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="68" rx="4" ry="4" fill="#c08060"/>
  <!-- Sarcastic smile -->
  <path d="M49,77 Q60,86 71,77" fill="#cc4444" stroke="#993333" stroke-width="1"/>
  <path d="M51,77 Q60,84 69,77" fill="#dd8888"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────────── AOC */
  aoc: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-aoc" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Body green outfit -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#2d6a4f" filter="url(#sh-aoc)"/>
  <!-- AOC badge -->
  <rect x="32" y="95" width="16" height="8" rx="2" fill="#ffffff"/>
  <text x="34" y="102" font-size="5.5" fill="#2d6a4f" font-family="Arial" font-weight="bold">AOC</text>
  <!-- Pointing finger raised high -->
  <rect x="80" y="70" width="8" height="28" rx="4" fill="#c07850"/>
  <ellipse cx="84" cy="68" rx="4" ry="5" fill="#c07850"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#c07850"/>
  <!-- Head -->
  <ellipse cx="60" cy="60" rx="26" ry="28" fill="#c07850" filter="url(#sh-aoc)"/>
  <!-- Dark hair pulled back -->
  <path d="M34,46 Q36,26 60,24 Q84,26 86,46 Q80,28 60,28 Q40,28 34,46 Z" fill="#1a1a1a"/>
  <path d="M34,50 Q34,70 36,76" fill="#1a1a1a"/>
  <path d="M86,50 Q86,70 84,76" fill="#1a1a1a"/>
  <!-- Eyes fierce -->
  <ellipse cx="49" cy="61" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="61" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="62" r="3.5" fill="#2a1a0a"/>
  <circle cx="72" cy="62" r="3.5" fill="#2a1a0a"/>
  <circle cx="51" cy="61" r="1.2" fill="white"/>
  <circle cx="73" cy="61" r="1.2" fill="white"/>
  <!-- Eyebrows fierce angled -->
  <path d="M43,54 Q49,51 55,54" stroke="#1a1a1a" stroke-width="3" fill="none"/>
  <path d="M65,54 Q71,51 77,54" stroke="#1a1a1a" stroke-width="3" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="69" rx="4" ry="4" fill="#a86840"/>
  <!-- Bright red lipstick fierce smile -->
  <path d="M48,78 Q60,90 72,78" fill="#cc0033" stroke="#990022" stroke-width="1"/>
  <path d="M50,78 Q60,87 70,78" fill="#ee1144"/>
  <!-- Upper lip shape -->
  <path d="M50,78 Q55,75 60,78 Q65,75 70,78" fill="#cc0033"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── MCCONNELL */
  mcconnell: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-mcc" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Body suit — head sits on it directly -->
  <rect x="26" y="82" width="68" height="66" rx="6" fill="#2a2a3a" filter="url(#sh-mcc)"/>
  <!-- Turtle shell on back visible as dome outline -->
  <ellipse cx="60" cy="110" rx="32" ry="28" fill="none" stroke="#8B6914" stroke-width="3" opacity="0.6"/>
  <ellipse cx="60" cy="110" rx="20" ry="18" fill="none" stroke="#8B6914" stroke-width="2" opacity="0.4"/>
  <!-- White shirt -->
  <rect x="50" y="82" width="20" height="66" rx="2" fill="#f0f0f0"/>
  <polygon points="60,86 56,120 64,120" fill="#334"/>
  <!-- NO NECK — head directly on body -->
  <!-- Head wide directly on shoulders -->
  <ellipse cx="60" cy="66" rx="28" ry="24" fill="#c8a070" filter="url(#sh-mcc)"/>
  <!-- Sparse grey hair -->
  <path d="M33,54 Q36,40 60,38 Q84,40 87,54 Q80,42 60,42 Q40,42 33,54 Z" fill="#aaa"/>
  <!-- Eyes hooded smug -->
  <ellipse cx="48" cy="64" rx="7" ry="4" fill="white"/>
  <ellipse cx="72" cy="64" rx="7" ry="4" fill="white"/>
  <!-- Heavy eyelids -->
  <path d="M41,62 Q48,60 55,62" fill="#c8a070"/>
  <path d="M65,62 Q72,60 79,62" fill="#c8a070"/>
  <circle cx="49" cy="65" r="3" fill="#4a3a2a"/>
  <circle cx="73" cy="65" r="3" fill="#4a3a2a"/>
  <!-- Nose large beak-like -->
  <path d="M56,70 Q60,80 64,70 Q62,74 60,72 Q58,74 56,70 Z" fill="#b08050"/>
  <!-- Smug turtle smile slight -->
  <path d="M48,78 Q60,83 72,78" stroke="#8a5030" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <!-- Jowls -->
  <ellipse cx="36" cy="76" rx="8" ry="6" fill="#c0905a" opacity="0.7"/>
  <ellipse cx="84" cy="76" rx="8" ry="6" fill="#c0905a" opacity="0.7"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── KAMALA */
  kamala: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-kamala" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Body power suit blue -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#1a3a7a" filter="url(#sh-kamala)"/>
  <!-- American flag pin -->
  <rect x="36" y="96" width="9" height="6" rx="1" fill="#b22234"/>
  <rect x="36" y="96" width="9" height="2" fill="#b22234"/>
  <rect x="36" y="98" width="9" height="2" fill="#f0f0f0"/>
  <rect x="36" y="100" width="9" height="2" fill="#b22234"/>
  <rect x="36" y="96" width="3" height="6" fill="#3c3b6e"/>
  <!-- White shirt -->
  <rect x="50" y="88" width="20" height="60" rx="2" fill="#f0f0f0"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#9a7050"/>
  <!-- Head -->
  <ellipse cx="60" cy="60" rx="26" ry="28" fill="#9a7050" filter="url(#sh-kamala)"/>
  <!-- Natural dark hair -->
  <path d="M34,48 Q36,26 60,24 Q84,26 86,48 Q80,30 60,30 Q40,30 34,48 Z" fill="#1a1a1a"/>
  <path d="M34,52 Q34,68 36,75" fill="#1a1a1a"/>
  <path d="M86,52 Q86,68 84,75" fill="#1a1a1a"/>
  <!-- Pearl earrings -->
  <circle cx="34" cy="65" r="3" fill="white"/>
  <circle cx="86" cy="65" r="3" fill="white"/>
  <!-- Eyes -->
  <ellipse cx="49" cy="60" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="60" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="61" r="3.5" fill="#2a1a0a"/>
  <circle cx="72" cy="61" r="3.5" fill="#2a1a0a"/>
  <circle cx="51" cy="60" r="1.2" fill="white"/>
  <circle cx="73" cy="60" r="1.2" fill="white"/>
  <!-- Eyebrows -->
  <path d="M43,53 Q49,50 55,53" stroke="#1a1a1a" stroke-width="2" fill="none"/>
  <path d="M65,53 Q71,50 77,53" stroke="#1a1a1a" stroke-width="2" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="68" rx="5" ry="4" fill="#806040"/>
  <!-- Hysterical laughing wide mouth -->
  <path d="M43,78 Q60,102 77,78" fill="#7a2020" stroke="#5a1010" stroke-width="1"/>
  <ellipse cx="60" cy="88" rx="13" ry="9" fill="#7a2020"/>
  <ellipse cx="60" cy="86" rx="11" ry="5" fill="white"/>
</svg>`,

  /* ────────────────────────────────────────────────────────────── CRUZ */
  cruz: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-cruz" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Cancun suitcase next to him -->
  <rect x="84" y="120" width="24" height="28" rx="3" fill="#e8a030" filter="url(#sh-cruz)"/>
  <rect x="86" y="118" width="20" height="4" rx="2" fill="#c88020"/>
  <rect x="94" y="115" width="6" height="6" rx="2" fill="#aaa"/>
  <!-- Suitcase wheels -->
  <circle cx="88" cy="150" r="3" fill="#555"/>
  <circle cx="104" cy="150" r="3" fill="#555"/>
  <!-- Suitcase stripe -->
  <line x1="84" y1="134" x2="108" y2="134" stroke="#c88020" stroke-width="2"/>
  <text x="87" y="130" font-size="4" fill="#c88020" font-family="Arial">CANCUN</text>
  <!-- Body suit -->
  <rect x="26" y="88" width="58" height="60" rx="6" fill="#2a2a4a" filter="url(#sh-cruz)"/>
  <!-- Texan flag pin -->
  <circle cx="36" cy="98" r="5" fill="#cc3333"/>
  <path d="M33,95 L36,103 L39,95 L31,100 L41,100 Z" fill="white" font-size="4"/>
  <!-- White shirt -->
  <rect x="48" y="88" width="18" height="60" rx="2" fill="#f0f0f0"/>
  <polygon points="57,92 53,120 61,120" fill="#334"/>
  <!-- Neck -->
  <rect x="48" y="78" width="18" height="13" rx="4" fill="#c89060"/>
  <!-- Head -->
  <ellipse cx="57" cy="60" rx="26" ry="28" fill="#c89060" filter="url(#sh-cruz)"/>
  <!-- Full beard dark -->
  <path d="M32,68 Q34,90 57,92 Q80,90 82,68 Q75,82 57,84 Q39,82 32,68 Z" fill="#3a2a1a"/>
  <!-- Hair dark -->
  <path d="M32,46 Q34,26 57,24 Q80,26 82,46 Q75,30 57,30 Q39,30 32,46 Z" fill="#2a1a0a"/>
  <!-- Eyes caught red handed -->
  <ellipse cx="48" cy="58" rx="6" ry="5" fill="white"/>
  <ellipse cx="68" cy="58" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="59" r="3.5" fill="#3a2a1a"/>
  <circle cx="70" cy="59" r="3.5" fill="#3a2a1a"/>
  <circle cx="51" cy="58" r="1.2" fill="white"/>
  <circle cx="71" cy="58" r="1.2" fill="white"/>
  <!-- Nervous sweat drop -->
  <ellipse cx="80" cy="50" rx="3" ry="4" fill="#aaddff" opacity="0.8"/>
  <!-- Nose -->
  <ellipse cx="57" cy="65" rx="5" ry="4" fill="#a87040"/>
  <!-- Guilty smile under beard -->
  <path d="M46,73 Q57,80 68,73" fill="#cc8855" stroke="none"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── PUTIN */
  putin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-putin" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Riding crop right hand -->
  <rect x="84" y="85" width="4" height="55" rx="2" fill="#5a3a1a" filter="url(#sh-putin)"/>
  <ellipse cx="86" cy="140" rx="3" ry="5" fill="#4a2a0a"/>
  <!-- Shirtless torso pale -->
  <rect x="28" y="86" width="64" height="62" rx="6" fill="#e8d4b8" filter="url(#sh-putin)"/>
  <!-- Defined abs lines -->
  <line x1="60" y1="90" x2="60" y2="145" stroke="#c8b090" stroke-width="1.5"/>
  <path d="M42,100 Q60,104 78,100" stroke="#c8b090" stroke-width="1.5" fill="none"/>
  <path d="M40,112 Q60,116 80,112" stroke="#c8b090" stroke-width="1.5" fill="none"/>
  <path d="M40,124 Q60,128 80,124" stroke="#c8b090" stroke-width="1.5" fill="none"/>
  <!-- Riding pose legs bent -->
  <path d="M36,148 Q30,135 38,130 Q44,138 46,148" fill="#4466aa"/>
  <path d="M84,148 Q90,135 82,130 Q76,138 74,148" fill="#4466aa"/>
  <!-- Neck -->
  <rect x="50" y="76" width="20" height="14" rx="4" fill="#d4b890"/>
  <!-- Head -->
  <ellipse cx="60" cy="58" rx="25" ry="26" fill="#d4b890" filter="url(#sh-putin)"/>
  <!-- Thin hair receding -->
  <path d="M36,48 Q38,36 60,34 Q82,36 84,48 Q78,38 60,38 Q42,38 36,48 Z" fill="#c8b898"/>
  <!-- Eyes ice cold -->
  <ellipse cx="49" cy="57" rx="6" ry="4" fill="white"/>
  <ellipse cx="71" cy="57" rx="6" ry="4" fill="white"/>
  <circle cx="50" cy="58" r="3" fill="#4466aa"/>
  <circle cx="72" cy="58" r="3" fill="#4466aa"/>
  <circle cx="51" cy="57" r="1" fill="white"/>
  <circle cx="73" cy="57" r="1" fill="white"/>
  <!-- Thin eyebrows high -->
  <path d="M43,51 Q49,49 55,51" stroke="#b0a080" stroke-width="1.5" fill="none"/>
  <path d="M65,51 Q71,49 77,51" stroke="#b0a080" stroke-width="1.5" fill="none"/>
  <!-- Nose thin -->
  <path d="M57,64 Q60,70 63,64 Q62,68 60,66 Q58,68 57,64 Z" fill="#c0a880"/>
  <!-- Small cold smirk -->
  <path d="M52,74 Q60,76 66,72" stroke="#9a7050" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── HITLER */
  hitler: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-hitler" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Satire warning banner -->
  <rect x="4" y="2" width="112" height="14" rx="3" fill="#cc0000"/>
  <text x="60" y="12" font-size="5" fill="white" font-family="Arial" font-weight="bold" text-anchor="middle">⚠️ SATIRE — HISTORY'S WARNING</text>
  <!-- Grey uniform body -->
  <rect x="26" y="86" width="68" height="62" rx="6" fill="#888" filter="url(#sh-hitler)"/>
  <!-- HISTORICAL VILLAIN WARNING label across torso -->
  <rect x="26" y="106" width="68" height="14" rx="2" fill="#cc0000"/>
  <text x="60" y="116" font-size="5" fill="white" font-family="Arial" font-weight="bold" text-anchor="middle">HISTORICAL VILLAIN</text>
  <!-- Arm raised stiff -->
  <rect x="78" y="68" width="10" height="30" rx="4" fill="#888" transform="rotate(-35,83,68)" filter="url(#sh-hitler)"/>
  <!-- Neck -->
  <rect x="50" y="76" width="20" height="14" rx="4" fill="#d4a080"/>
  <!-- Head -->
  <ellipse cx="60" cy="58" rx="24" ry="26" fill="#d4a080" filter="url(#sh-hitler)"/>
  <!-- Dark hair side parted -->
  <path d="M36,46 Q38,28 60,26 Q82,28 84,46" fill="#1a1a1a"/>
  <path d="M36,46 Q36,54 38,58" fill="#1a1a1a"/>
  <path d="M60,30 Q42,32 36,46" fill="#1a1a1a"/>
  <!-- Small moustache -->
  <rect x="55" y="74" width="10" height="5" rx="1" fill="#1a1a1a"/>
  <!-- Eyes fanatical -->
  <ellipse cx="49" cy="57" rx="5" ry="4" fill="white"/>
  <ellipse cx="71" cy="57" rx="5" ry="4" fill="white"/>
  <circle cx="50" cy="58" r="3" fill="#2a1a0a"/>
  <circle cx="72" cy="58" r="3" fill="#2a1a0a"/>
  <circle cx="51" cy="57" r="1" fill="white"/>
  <circle cx="73" cy="57" r="1" fill="white"/>
  <!-- Eyebrows angled -->
  <path d="M44,51 Q49,49 54,51" stroke="#1a1a1a" stroke-width="2.5" fill="none"/>
  <path d="M66,51 Q71,49 76,51" stroke="#1a1a1a" stroke-width="2.5" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="66" rx="4" ry="4" fill="#c09070"/>
  <!-- Mocking scowl -->
  <path d="M50,71 Q60,73 70,71" stroke="#8a4020" stroke-width="1.5" fill="none"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── JINPING */
  jinping: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-jinping" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Honeypot in hand -->
  <ellipse cx="96" cy="125" rx="10" ry="12" fill="#F4A460" filter="url(#sh-jinping)"/>
  <rect x="86" y="113" width="20" height="8" rx="3" fill="#D4941a"/>
  <text x="88" y="120" font-size="5" fill="#8B4513" font-family="Arial">HUNNY</text>
  <!-- Suit jacket over Pooh shirt -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#1a1a5a" filter="url(#sh-jinping)"/>
  <!-- Winnie the Pooh yellow shirt visible in center -->
  <rect x="46" y="88" width="28" height="60" rx="2" fill="#FFD700"/>
  <!-- Red star pin -->
  <polygon points="36,97 38,103 44,103 39,107 41,113 36,109 31,113 33,107 28,103 34,103" fill="#cc0000" transform="scale(0.5) translate(36,96)"/>
  <circle cx="36" cy="100" r="4" fill="#cc0000"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#e8c89a"/>
  <!-- Round face head -->
  <ellipse cx="60" cy="60" rx="28" ry="28" fill="#e8c89a" filter="url(#sh-jinping)"/>
  <!-- Black hair short -->
  <path d="M32,48 Q34,28 60,26 Q86,28 88,48 Q82,32 60,32 Q38,32 32,48 Z" fill="#1a1a1a"/>
  <!-- Eyes deceptively friendly slight slant -->
  <ellipse cx="48" cy="62" rx="7" ry="4" fill="white"/>
  <ellipse cx="72" cy="62" rx="7" ry="4" fill="white"/>
  <circle cx="50" cy="63" r="3" fill="#2a1a0a"/>
  <circle cx="74" cy="63" r="3" fill="#2a1a0a"/>
  <circle cx="51" cy="62" r="1" fill="white"/>
  <circle cx="75" cy="62" r="1" fill="white"/>
  <!-- Eyebrows flat -->
  <path d="M41,56 Q48,54 55,56" stroke="#1a1a1a" stroke-width="2" fill="none"/>
  <path d="M65,56 Q72,54 79,56" stroke="#1a1a1a" stroke-width="2" fill="none"/>
  <!-- Nose round -->
  <ellipse cx="60" cy="70" rx="5" ry="4" fill="#d4a870"/>
  <!-- Slight deceptive smile -->
  <path d="M49,78 Q60,85 71,78" fill="#cc8855" stroke="#aa6633" stroke-width="1"/>
  <path d="M51,78 Q60,84 69,78" fill="#ddaa77"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── KIM */
  kim: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-kim" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Small rocket in background -->
  <polygon points="95,72 100,100 90,100" fill="#888" filter="url(#sh-kim)"/>
  <polygon points="88,98 92,90 90,100" fill="#cc3333"/>
  <polygon points="100,98 96,90 100,100" fill="#cc3333"/>
  <rect x="90" y="98" width="10" height="20" rx="2" fill="#aaa"/>
  <!-- Oversized military uniform -->
  <rect x="22" y="86" width="76" height="62" rx="6" fill="#2a3a2a" filter="url(#sh-kim)"/>
  <!-- Many medals -->
  <circle cx="36" cy="96" r="4" fill="#FFD700"/>
  <circle cx="46" cy="96" r="4" fill="#cc4444"/>
  <circle cx="56" cy="96" r="4" fill="#FFD700"/>
  <circle cx="66" cy="96" r="4" fill="#cc4444"/>
  <circle cx="36" cy="107" r="4" fill="#cc4444"/>
  <circle cx="46" cy="107" r="4" fill="#FFD700"/>
  <circle cx="36" cy="118" r="4" fill="#FFD700"/>
  <!-- Red stripe epaulettes -->
  <rect x="22" y="86" width="14" height="8" rx="2" fill="#cc2222"/>
  <rect x="84" y="86" width="14" height="8" rx="2" fill="#cc2222"/>
  <!-- Neck short -->
  <rect x="50" y="76" width="20" height="14" rx="4" fill="#e8c89a"/>
  <!-- Very round face -->
  <ellipse cx="60" cy="58" rx="30" ry="28" fill="#e8c89a" filter="url(#sh-kim)"/>
  <!-- Flat-top haircut -->
  <rect x="30" y="32" width="60" height="14" rx="2" fill="#1a1a1a"/>
  <rect x="32" y="34" width="56" height="18" fill="#1a1a1a"/>
  <!-- Eyes menacing glee -->
  <ellipse cx="48" cy="62" rx="7" ry="4" fill="white"/>
  <ellipse cx="72" cy="62" rx="7" ry="4" fill="white"/>
  <circle cx="50" cy="63" r="3" fill="#1a1a1a"/>
  <circle cx="74" cy="63" r="3" fill="#1a1a1a"/>
  <circle cx="51" cy="62" r="1" fill="white"/>
  <circle cx="75" cy="62" r="1" fill="white"/>
  <!-- Nose round pudgy -->
  <ellipse cx="60" cy="70" rx="6" ry="5" fill="#d4a870"/>
  <!-- Menacing glee grin -->
  <path d="M44,78 Q60,92 76,78" fill="#8a2020" stroke="#6a1010" stroke-width="1"/>
  <rect x="48" y="78" width="24" height="8" rx="2" fill="white"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── STALIN */
  stalin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-stalin" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Military coat -->
  <rect x="24" y="86" width="72" height="62" rx="6" fill="#4a4a3a" filter="url(#sh-stalin)"/>
  <!-- Medals -->
  <circle cx="36" cy="96" r="5" fill="#FFD700"/>
  <circle cx="48" cy="94" r="5" fill="#cc4444"/>
  <circle cx="36" cy="108" r="4" fill="#cc4444"/>
  <!-- Red star -->
  <circle cx="60" cy="96" r="5" fill="#cc2222"/>
  <!-- Pipe in mouth -->
  <rect x="68" y="74" width="22" height="4" rx="2" fill="#5a3010"/>
  <ellipse cx="90" cy="75" rx="5" ry="6" fill="#4a2010"/>
  <ellipse cx="70" cy="76" rx="3" ry="3" fill="#3a2010"/>
  <!-- Neck -->
  <rect x="50" y="76" width="20" height="14" rx="4" fill="#c8906a"/>
  <!-- Head -->
  <ellipse cx="60" cy="58" rx="26" ry="26" fill="#c8906a" filter="url(#sh-stalin)"/>
  <!-- Dark hair side part -->
  <path d="M34,46 Q36,28 60,26 Q84,28 86,46 Q80,30 60,30 Q40,30 34,46 Z" fill="#2a1a0a"/>
  <path d="M34,48 Q34,58 36,64" fill="#2a1a0a"/>
  <!-- Large moustache -->
  <path d="M44,74 Q52,70 60,72 Q68,70 76,74 Q68,80 60,78 Q52,80 44,74 Z" fill="#2a1a0a"/>
  <!-- Eyes cold authority -->
  <ellipse cx="48" cy="58" rx="6" ry="4" fill="white"/>
  <ellipse cx="72" cy="58" rx="6" ry="4" fill="white"/>
  <circle cx="49" cy="59" r="3" fill="#2a1a0a"/>
  <circle cx="73" cy="59" r="3" fill="#2a1a0a"/>
  <circle cx="50" cy="58" r="1" fill="white"/>
  <circle cx="74" cy="58" r="1" fill="white"/>
  <!-- Eyebrows heavy -->
  <path d="M42,52 Q48,49 54,52" stroke="#2a1a0a" stroke-width="3.5" fill="none"/>
  <path d="M66,52 Q72,49 78,52" stroke="#2a1a0a" stroke-width="3.5" fill="none"/>
  <!-- Nose large -->
  <ellipse cx="60" cy="67" rx="5" ry="4" fill="#a87050"/>
  <!-- Cold stern line mouth above moustache -->
  <path d="M51,70 Q60,68 69,70" stroke="#6a3010" stroke-width="2" fill="none"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── GANDHI */
  gandhi: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-gandhi" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Walking stick -->
  <rect x="84" y="90" width="5" height="60" rx="2" fill="#8B6914" filter="url(#sh-gandhi)"/>
  <ellipse cx="86" cy="90" rx="5" ry="4" fill="#6a4a10"/>
  <!-- Very thin frame dhoti white cloth -->
  <rect x="38" y="92" width="44" height="56" rx="6" fill="#f0f0e8" filter="url(#sh-gandhi)"/>
  <!-- Dhoti wrapping lines -->
  <path d="M38,110 Q60,118 82,110" stroke="#e0e0d0" stroke-width="1.5" fill="none"/>
  <path d="M40,125 Q60,133 80,125" stroke="#e0e0d0" stroke-width="1.5" fill="none"/>
  <!-- Bare shoulders thin -->
  <ellipse cx="40" cy="95" rx="8" ry="6" fill="#c8906a"/>
  <ellipse cx="80" cy="95" rx="8" ry="6" fill="#c8906a"/>
  <!-- Neck very thin -->
  <rect x="54" y="80" width="12" height="16" rx="4" fill="#c8906a"/>
  <!-- Head -->
  <ellipse cx="60" cy="62" rx="22" ry="24" fill="#c8906a" filter="url(#sh-gandhi)"/>
  <!-- Bald head very little hair on sides -->
  <path d="M38,62 Q38,52 40,56" stroke="#3a2a1a" stroke-width="2" fill="none"/>
  <path d="M82,62 Q82,52 80,56" stroke="#3a2a1a" stroke-width="2" fill="none"/>
  <!-- Round glasses -->
  <circle cx="50" cy="64" r="7" fill="none" stroke="#4a3a2a" stroke-width="2"/>
  <circle cx="70" cy="64" r="7" fill="none" stroke="#4a3a2a" stroke-width="2"/>
  <line x1="57" y1="64" x2="63" y2="64" stroke="#4a3a2a" stroke-width="2"/>
  <path d="M43,64 Q40,62 38,64" stroke="#4a3a2a" stroke-width="1.5" fill="none"/>
  <path d="M77,64 Q80,62 82,64" stroke="#4a3a2a" stroke-width="1.5" fill="none"/>
  <!-- Eyes behind glasses serene -->
  <circle cx="50" cy="64" r="4" fill="white"/>
  <circle cx="70" cy="64" r="4" fill="white"/>
  <circle cx="51" cy="65" r="2.5" fill="#2a1a0a"/>
  <circle cx="71" cy="65" r="2.5" fill="#2a1a0a"/>
  <!-- Nose small -->
  <ellipse cx="60" cy="72" rx="3" ry="3" fill="#a87050"/>
  <!-- Serene smile -->
  <path d="M52,78 Q60,84 68,78" stroke="#7a5030" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── MANDELA */
  mandela: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-mandela" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Madiba patterned colorful shirt body -->
  <rect x="24" y="88" width="72" height="60" rx="6" fill="#cc6622" filter="url(#sh-mandela)"/>
  <!-- Pattern on shirt -->
  <rect x="24" y="100" width="72" height="8" fill="#2266aa" opacity="0.7"/>
  <rect x="24" y="116" width="72" height="8" fill="#22aa44" opacity="0.7"/>
  <rect x="24" y="132" width="72" height="8" fill="#cc2222" opacity="0.7"/>
  <!-- Diamond pattern -->
  <polygon points="40,95 48,102 40,109 32,102" fill="#FFD700" opacity="0.6"/>
  <polygon points="60,95 68,102 60,109 52,102" fill="#FFD700" opacity="0.6"/>
  <polygon points="80,95 88,102 80,109 72,102" fill="#FFD700" opacity="0.6"/>
  <!-- Raised fist right -->
  <rect x="80" y="100" width="14" height="18" rx="5" fill="#5a3010" filter="url(#sh-mandela)"/>
  <rect x="80" y="96" width="14" height="8" rx="3" fill="#5a3010"/>
  <!-- NZ... wait — Mandela South Africa flag pin -->
  <rect x="34" y="94" width="9" height="6" rx="1" fill="#007A4D"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#3a1a0a"/>
  <!-- Head -->
  <ellipse cx="60" cy="60" rx="26" ry="28" fill="#3a1a0a" filter="url(#sh-mandela)"/>
  <!-- Silver-white hair -->
  <path d="M34,48 Q36,28 60,26 Q84,28 86,48 Q80,30 60,32 Q40,30 34,48 Z" fill="#c0c0c0"/>
  <!-- Eyes dignified joy -->
  <ellipse cx="49" cy="62" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="62" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="63" r="3.5" fill="#1a0a00"/>
  <circle cx="72" cy="63" r="3.5" fill="#1a0a00"/>
  <circle cx="51" cy="62" r="1.2" fill="white"/>
  <circle cx="73" cy="62" r="1.2" fill="white"/>
  <!-- Nose broad -->
  <ellipse cx="60" cy="70" rx="6" ry="5" fill="#2a0a00"/>
  <!-- Warm wide smile -->
  <path d="M44,80 Q60,96 76,80" fill="#2a0a00" stroke="#1a0a00" stroke-width="1"/>
  <rect x="48" y="80" width="24" height="8" rx="2" fill="white"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── CHE */
  che: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-che" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Jungle fatigues body -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#4a5a2a" filter="url(#sh-che)"/>
  <!-- Camo pattern -->
  <ellipse cx="38" cy="100" rx="6" ry="4" fill="#3a4a1a" opacity="0.6"/>
  <ellipse cx="70" cy="108" rx="7" ry="5" fill="#3a4a1a" opacity="0.6"/>
  <ellipse cx="50" cy="120" rx="5" ry="4" fill="#3a4a1a" opacity="0.6"/>
  <!-- Raised fist -->
  <rect x="78" y="96" width="14" height="18" rx="5" fill="#c8906a" filter="url(#sh-che)"/>
  <rect x="78" y="92" width="14" height="8" rx="3" fill="#c8906a"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#c8906a"/>
  <!-- Head -->
  <ellipse cx="60" cy="60" rx="26" ry="28" fill="#c8906a" filter="url(#sh-che)"/>
  <!-- Red beret with star -->
  <path d="M30,48 Q32,30 60,28 Q88,30 90,48 Q80,36 60,36 Q40,36 30,48 Z" fill="#cc2222"/>
  <path d="M30,48 Q32,54 36,56 Q34,44 30,48 Z" fill="#aa1a1a"/>
  <!-- Star on beret -->
  <polygon points="60,31 62,37 68,37 63,41 65,47 60,43 55,47 57,41 52,37 58,37" fill="#FFD700" transform="scale(0.6) translate(40,15)"/>
  <circle cx="60" cy="34" r="4" fill="#FFD700"/>
  <!-- Scraggly beard -->
  <path d="M34,70 Q36,84 60,88 Q84,84 86,70 Q78,82 60,84 Q42,82 34,70 Z" fill="#2a1a0a"/>
  <!-- Wispy beard extras -->
  <path d="M38,80 Q36,88 40,92" stroke="#2a1a0a" stroke-width="2" fill="none"/>
  <path d="M82,80 Q84,88 80,92" stroke="#2a1a0a" stroke-width="2" fill="none"/>
  <!-- Eyes revolutionary fire -->
  <ellipse cx="49" cy="58" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="58" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="59" r="3.5" fill="#2a1a0a"/>
  <circle cx="72" cy="59" r="3.5" fill="#2a1a0a"/>
  <circle cx="51" cy="58" r="1.2" fill="white"/>
  <circle cx="73" cy="58" r="1.2" fill="white"/>
  <!-- Eyebrows intense -->
  <path d="M43,51 Q49,48 55,51" stroke="#2a1a0a" stroke-width="3" fill="none"/>
  <path d="M65,51 Q71,48 77,51" stroke="#2a1a0a" stroke-width="3" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="66" rx="5" ry="4" fill="#a87050"/>
  <!-- Intense mouth -->
  <path d="M50,72 Q60,78 70,72" stroke="#7a3010" stroke-width="2" fill="none"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── CHURCHILL */
  churchill: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-churchill" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Rotund dark suit body -->
  <ellipse cx="60" cy="118" rx="38" ry="30" fill="#1a1a1a" filter="url(#sh-churchill)"/>
  <rect x="22" y="88" width="76" height="42" rx="8" fill="#1a1a1a" filter="url(#sh-churchill)"/>
  <!-- V for Victory fingers both hands -->
  <rect x="12" y="108" width="6" height="16" rx="3" fill="#d4a080" transform="rotate(-15,15,108)"/>
  <rect x="20" y="108" width="6" height="16" rx="3" fill="#d4a080" transform="rotate(10,23,108)"/>
  <rect x="14" y="120" width="14" height="10" rx="4" fill="#d4a080"/>
  <!-- Right V -->
  <rect x="100" y="108" width="6" height="16" rx="3" fill="#d4a080" transform="rotate(15,103,108)"/>
  <rect x="92" y="108" width="6" height="16" rx="3" fill="#d4a080" transform="rotate(-10,95,108)"/>
  <rect x="94" y="120" width="14" height="10" rx="4" fill="#d4a080"/>
  <!-- Large cigar -->
  <rect x="66" y="77" width="28" height="5" rx="2" fill="#c8a060"/>
  <ellipse cx="94" cy="79" rx="4" ry="4" fill="#ff6622" opacity="0.7"/>
  <!-- Smoke circles -->
  <circle cx="98" cy="74" r="3" fill="none" stroke="#999" stroke-width="1" opacity="0.5"/>
  <circle cx="102" cy="68" r="5" fill="none" stroke="#999" stroke-width="1" opacity="0.3"/>
  <!-- Top hat -->
  <rect x="36" y="20" width="48" height="28" rx="3" fill="#0a0a0a" filter="url(#sh-churchill)"/>
  <rect x="28" y="46" width="64" height="8" rx="3" fill="#1a1a1a"/>
  <!-- Neck short rotund -->
  <rect x="46" y="74" width="28" height="16" rx="6" fill="#d4a080"/>
  <!-- Head round -->
  <ellipse cx="60" cy="62" rx="30" ry="28" fill="#d4a080" filter="url(#sh-churchill)"/>
  <!-- Jowls heavy -->
  <ellipse cx="34" cy="76" rx="10" ry="8" fill="#c8906a" opacity="0.9"/>
  <ellipse cx="86" cy="76" rx="10" ry="8" fill="#c8906a" opacity="0.9"/>
  <!-- Eyes defiant -->
  <ellipse cx="49" cy="62" rx="6" ry="4" fill="white"/>
  <ellipse cx="71" cy="62" rx="6" ry="4" fill="white"/>
  <circle cx="50" cy="63" r="3" fill="#3a2a1a"/>
  <circle cx="72" cy="63" r="3" fill="#3a2a1a"/>
  <!-- Nose bulbous -->
  <ellipse cx="60" cy="70" rx="7" ry="6" fill="#c08060"/>
  <!-- Defiant set jaw line -->
  <path d="M44,80 Q60,84 76,80" stroke="#9a6040" stroke-width="2.5" fill="none"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── NAPOLEON */
  napoleon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-napoleon" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Imperial coat body — shorter stature, drawn smaller -->
  <rect x="30" y="96" width="60" height="52" rx="6" fill="#2244aa" filter="url(#sh-napoleon)"/>
  <!-- Gold epaulettes -->
  <rect x="30" y="96" width="12" height="7" rx="2" fill="#FFD700"/>
  <rect x="78" y="96" width="12" height="7" rx="2" fill="#FFD700"/>
  <!-- Hand tucked in coat Napoleon pose -->
  <path d="M60,106 Q54,110 56,118 Q60,122 64,118 Q66,110 60,106" fill="#d4a080"/>
  <!-- Bicorne hat sideways -->
  <ellipse cx="60" cy="46" rx="34" ry="12" fill="#1a1a2a" filter="url(#sh-napoleon)"/>
  <path d="M26,46 Q60,34 94,46 Q88,52 60,54 Q32,52 26,46 Z" fill="#2a2a3a"/>
  <!-- Hat cockade -->
  <circle cx="78" cy="46" r="5" fill="#cc2222"/>
  <circle cx="78" cy="46" r="3" fill="white"/>
  <circle cx="78" cy="46" r="1.5" fill="#2244aa"/>
  <!-- Neck -->
  <rect x="50" y="82" width="20" height="17" rx="4" fill="#d4a080"/>
  <!-- Head -->
  <ellipse cx="60" cy="66" rx="24" ry="22" fill="#d4a080" filter="url(#sh-napoleon)"/>
  <!-- Eyes imperious -->
  <ellipse cx="50" cy="66" rx="5" ry="4" fill="white"/>
  <ellipse cx="70" cy="66" rx="5" ry="4" fill="white"/>
  <circle cx="51" cy="67" r="3" fill="#2a1a5a"/>
  <circle cx="71" cy="67" r="3" fill="#2a1a5a"/>
  <circle cx="52" cy="66" r="1" fill="white"/>
  <circle cx="72" cy="66" r="1" fill="white"/>
  <!-- Eyebrows arched imperious -->
  <path d="M45,60 Q50,57 55,60" stroke="#4a3a2a" stroke-width="2.5" fill="none"/>
  <path d="M65,60 Q70,57 75,60" stroke="#4a3a2a" stroke-width="2.5" fill="none"/>
  <!-- Nose prominent -->
  <ellipse cx="60" cy="73" rx="4" ry="4" fill="#c09070"/>
  <!-- Imperious mouth -->
  <path d="M52,79 Q60,82 68,79" stroke="#8a5030" stroke-width="2" fill="none"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── LINCOLN */
  lincoln: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-lincoln" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Axe in hand -->
  <rect x="84" y="100" width="6" height="48" rx="2" fill="#8B6914" filter="url(#sh-lincoln)"/>
  <path d="M84,100 Q74,94 76,110 Q80,116 90,110 Q92,100 84,100 Z" fill="#aaa"/>
  <!-- Very tall thin dark suit -->
  <rect x="30" y="86" width="54" height="62" rx="6" fill="#1a1a1a" filter="url(#sh-lincoln)"/>
  <!-- White shirt -->
  <rect x="48" y="86" width="18" height="62" rx="2" fill="#f0f0f0"/>
  <!-- Bow tie -->
  <polygon points="54,90 60,95 54,100" fill="#2a1a1a"/>
  <polygon points="66,90 60,95 66,100" fill="#2a1a1a"/>
  <!-- Stovepipe hat tall -->
  <rect x="34" y="6" width="52" height="40" rx="3" fill="#0a0a0a" filter="url(#sh-lincoln)"/>
  <rect x="28" y="44" width="64" height="8" rx="3" fill="#1a1a1a"/>
  <!-- Hat band -->
  <rect x="34" y="40" width="52" height="5" fill="#2a2a2a"/>
  <!-- Neck thin -->
  <rect x="52" y="76" width="16" height="14" rx="4" fill="#c89a6a"/>
  <!-- Head very thin long -->
  <ellipse cx="60" cy="62" rx="22" ry="26" fill="#c89a6a" filter="url(#sh-lincoln)"/>
  <!-- Beard chin strap style -->
  <path d="M38,72 Q40,88 60,92 Q80,88 82,72 Q74,86 60,88 Q46,86 38,72 Z" fill="#2a1a0a"/>
  <!-- Eyes sorrowful deep-set -->
  <ellipse cx="50" cy="60" rx="6" ry="5" fill="white"/>
  <ellipse cx="70" cy="60" rx="6" ry="5" fill="white"/>
  <circle cx="51" cy="61" r="3.5" fill="#2a1a0a"/>
  <circle cx="71" cy="61" r="3.5" fill="#2a1a0a"/>
  <!-- Heavy brow shadows -->
  <path d="M44,55 Q50,52 56,55" stroke="#4a3a2a" stroke-width="4" fill="none"/>
  <path d="M64,55 Q70,52 76,55" stroke="#4a3a2a" stroke-width="4" fill="none"/>
  <!-- Nose long -->
  <path d="M57,66 Q60,76 63,66 Q62,72 60,70 Q58,72 57,66 Z" fill="#a87850"/>
  <!-- Sorrowful determined set mouth -->
  <path d="M50,78 Q60,80 70,78" stroke="#7a5030" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── FDR */
  fdr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-fdr" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Wheelchair -->
  <circle cx="30" cy="148" r="12" fill="none" stroke="#888" stroke-width="4" filter="url(#sh-fdr)"/>
  <circle cx="90" cy="148" r="12" fill="none" stroke="#888" stroke-width="4" filter="url(#sh-fdr)"/>
  <rect x="28" y="128" width="64" height="4" rx="2" fill="#8B6914"/>
  <rect x="28" y="126" width="8" height="24" rx="2" fill="#8B6914"/>
  <rect x="84" y="126" width="8" height="24" rx="2" fill="#8B6914"/>
  <!-- Seat back -->
  <rect x="28" y="104" width="8" height="28" rx="2" fill="#8B6914"/>
  <rect x="84" y="104" width="8" height="28" rx="2" fill="#8B6914"/>
  <rect x="28" y="104" width="64" height="6" rx="2" fill="#7a5810"/>
  <!-- Naval cape over suit -->
  <rect x="28" y="88" width="64" height="42" rx="6" fill="#2a2a4a" filter="url(#sh-fdr)"/>
  <!-- Cape overlay -->
  <path d="M28,88 Q16,100 22,130 Q28,140 36,138 Q30,120 36,96 Z" fill="#1a1a3a" opacity="0.8"/>
  <path d="M92,88 Q104,100 98,130 Q92,140 84,138 Q90,120 84,96 Z" fill="#1a1a3a" opacity="0.8"/>
  <!-- Cigarette holder in mouth -->
  <rect x="66" y="77" width="26" height="4" rx="2" fill="#f0e8c0"/>
  <circle cx="92" cy="79" r="3" fill="#ff6622" opacity="0.8"/>
  <!-- Neck -->
  <rect x="50" y="76" width="20" height="15" rx="4" fill="#d4a080"/>
  <!-- Head -->
  <ellipse cx="60" cy="62" rx="26" ry="26" fill="#d4a080" filter="url(#sh-fdr)"/>
  <!-- Hair -->
  <path d="M34,50 Q36,30 60,28 Q84,30 86,50 Q80,32 60,32 Q40,32 34,50 Z" fill="#8a6a4a"/>
  <!-- Round glasses -->
  <circle cx="49" cy="63" r="7" fill="none" stroke="#4a3a2a" stroke-width="2"/>
  <circle cx="71" cy="63" r="7" fill="none" stroke="#4a3a2a" stroke-width="2"/>
  <line x1="56" y1="63" x2="64" y2="63" stroke="#4a3a2a" stroke-width="1.5"/>
  <circle cx="49" cy="63" r="4" fill="white" opacity="0.3"/>
  <circle cx="71" cy="63" r="4" fill="white" opacity="0.3"/>
  <circle cx="50" cy="64" r="2.5" fill="#3a2a1a"/>
  <circle cx="72" cy="64" r="2.5" fill="#3a2a1a"/>
  <!-- Nose -->
  <ellipse cx="60" cy="71" rx="5" ry="4" fill="#c09060"/>
  <!-- Commanding expression -->
  <path d="M50,78 Q60,82 70,78" stroke="#8a5030" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── JFK */
  jfk: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-jfk" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Suit body -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#1a2a4a" filter="url(#sh-jfk)"/>
  <!-- White shirt -->
  <rect x="50" y="88" width="20" height="60" rx="2" fill="#f5f5f5"/>
  <polygon points="60,92 55,128 65,128" fill="#2244aa"/>
  <!-- American flag pin -->
  <rect x="36" y="96" width="9" height="6" rx="1" fill="#b22234"/>
  <rect x="36" y="98" width="9" height="2" fill="#f0f0f0"/>
  <rect x="36" y="96" width="3" height="6" fill="#3c3b6e"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#d4a080"/>
  <!-- Head -->
  <ellipse cx="60" cy="60" rx="26" ry="27" fill="#d4a080" filter="url(#sh-jfk)"/>
  <!-- Swept charismatic hair -->
  <path d="M34,46 Q36,26 60,24 Q84,26 86,46 Q80,28 60,28 Q40,28 34,46 Z" fill="#8a6030"/>
  <path d="M34,50 Q38,42 48,40 Q42,46 36,54" fill="#8a6030"/>
  <!-- Eyes charismatic confident -->
  <ellipse cx="49" cy="60" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="60" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="61" r="3.5" fill="#3a2a1a"/>
  <circle cx="72" cy="61" r="3.5" fill="#3a2a1a"/>
  <circle cx="51" cy="60" r="1.2" fill="white"/>
  <circle cx="73" cy="60" r="1.2" fill="white"/>
  <!-- Eyebrows -->
  <path d="M43,53 Q49,50 55,53" stroke="#6a4a2a" stroke-width="2.5" fill="none"/>
  <path d="M65,53 Q71,50 77,53" stroke="#6a4a2a" stroke-width="2.5" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="68" rx="5" ry="4" fill="#c08060"/>
  <!-- Charming grin very white teeth -->
  <path d="M46,78 Q60,94 74,78" fill="#aa6644" stroke="#884422" stroke-width="1"/>
  <rect x="50" y="78" width="20" height="8" rx="2" fill="white"/>
  <line x1="54" y1="78" x2="54" y2="86" stroke="#eee" stroke-width="1"/>
  <line x1="58" y1="78" x2="58" y2="86" stroke="#eee" stroke-width="1"/>
  <line x1="62" y1="78" x2="62" y2="86" stroke="#eee" stroke-width="1"/>
  <line x1="66" y1="78" x2="66" y2="86" stroke="#eee" stroke-width="1"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── NIXON */
  nixon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-nixon" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Suit body -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#2a2a2a" filter="url(#sh-nixon)"/>
  <!-- White shirt -->
  <rect x="50" y="88" width="20" height="60" rx="2" fill="#e8e8e8"/>
  <!-- Peace sign hands both raised -->
  <!-- Left hand V -->
  <rect x="12" y="96" width="6" height="18" rx="3" fill="#c89a6a" transform="rotate(-20,15,96)"/>
  <rect x="20" y="96" width="6" height="18" rx="3" fill="#c89a6a" transform="rotate(10,23,96)"/>
  <rect x="12" y="108" width="16" height="10" rx="4" fill="#c89a6a"/>
  <!-- Right hand V -->
  <rect x="100" y="96" width="6" height="18" rx="3" fill="#c89a6a" transform="rotate(20,103,96)"/>
  <rect x="92" y="96" width="6" height="18" rx="3" fill="#c89a6a" transform="rotate(-10,95,96)"/>
  <rect x="92" y="108" width="16" height="10" rx="4" fill="#c89a6a"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#c89a6a"/>
  <!-- Head jowly -->
  <ellipse cx="60" cy="60" rx="28" ry="28" fill="#c89a6a" filter="url(#sh-nixon)"/>
  <!-- Jowls heavy -->
  <ellipse cx="36" cy="74" rx="10" ry="8" fill="#c0906a" opacity="0.8"/>
  <ellipse cx="84" cy="74" rx="10" ry="8" fill="#c0906a" opacity="0.8"/>
  <!-- Dark 5 o'clock shadow -->
  <path d="M36,66 Q40,82 60,86 Q80,82 84,66 Q75,80 60,82 Q45,80 36,66 Z" fill="#888888" opacity="0.5"/>
  <!-- Dark hair side part -->
  <path d="M32,46 Q34,26 60,24 Q86,26 88,46 Q82,28 60,28 Q38,28 32,46 Z" fill="#1a1a1a"/>
  <!-- Sweat drops nervousness -->
  <ellipse cx="85" cy="42" rx="3" ry="5" fill="#aaddff" opacity="0.8"/>
  <ellipse cx="91" cy="52" rx="2" ry="4" fill="#aaddff" opacity="0.6"/>
  <ellipse cx="30" cy="48" rx="2" ry="3" fill="#aaddff" opacity="0.5"/>
  <!-- Shifty eyes looking sideways -->
  <ellipse cx="49" cy="60" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="60" rx="6" ry="5" fill="white"/>
  <circle cx="52" cy="61" r="3.5" fill="#2a1a0a"/>
  <circle cx="74" cy="61" r="3.5" fill="#2a1a0a"/>
  <circle cx="53" cy="60" r="1.2" fill="white"/>
  <circle cx="75" cy="60" r="1.2" fill="white"/>
  <!-- Nose large bulbous -->
  <ellipse cx="60" cy="69" rx="7" ry="6" fill="#b87050"/>
  <!-- Shifty mouth -->
  <path d="M49,78 Q60,82 71,77" stroke="#8a5030" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── GORE */
  gore: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-gore" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Globe in hand -->
  <circle cx="88" cy="120" r="16" fill="#2266aa" filter="url(#sh-gore)"/>
  <ellipse cx="88" cy="120" rx="16" ry="16" fill="none" stroke="#4488cc" stroke-width="1"/>
  <path d="M78,112 Q82,120 78,128" stroke="#4488cc" stroke-width="1" fill="none"/>
  <path d="M88,104 Q92,112 88,136" stroke="#4488cc" stroke-width="1" fill="none"/>
  <path d="M72,120 Q88,116 104,120" stroke="#4488cc" stroke-width="1.5" fill="none"/>
  <ellipse cx="82" cy="114" rx="4" ry="3" fill="#44aa44" opacity="0.8"/>
  <ellipse cx="94" cy="122" rx="5" ry="3" fill="#44aa44" opacity="0.8"/>
  <!-- Suit grey body -->
  <rect x="26" y="88" width="62" height="60" rx="6" fill="#4a4a5a" filter="url(#sh-gore)"/>
  <!-- White shirt -->
  <rect x="48" y="88" width="18" height="60" rx="2" fill="#f0f0f0"/>
  <polygon points="57,92 53,122 61,122" fill="#2a4a8a"/>
  <!-- Neck -->
  <rect x="48" y="78" width="18" height="13" rx="4" fill="#c89a6a"/>
  <!-- Head -->
  <ellipse cx="57" cy="60" rx="26" ry="27" fill="#c89a6a" filter="url(#sh-gore)"/>
  <!-- Hair silvery-brown -->
  <path d="M31,46 Q33,26 57,24 Q81,26 83,46 Q77,28 57,28 Q37,28 31,46 Z" fill="#8a8a7a"/>
  <!-- Eyes profound disappointment drooping -->
  <ellipse cx="47" cy="60" rx="6" ry="4" fill="white"/>
  <ellipse cx="67" cy="60" rx="6" ry="4" fill="white"/>
  <!-- Heavy drooping eyelids -->
  <path d="M41,58 Q47,56 53,58" fill="#c89a6a"/>
  <path d="M61,58 Q67,56 73,58" fill="#c89a6a"/>
  <circle cx="48" cy="61" r="3" fill="#3a2a1a"/>
  <circle cx="68" cy="61" r="3" fill="#3a2a1a"/>
  <!-- Nose -->
  <ellipse cx="57" cy="68" rx="5" ry="4" fill="#b08060"/>
  <!-- Profound frown -->
  <path d="M46,80 Q57,74 68,80" stroke="#7a4020" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── REAGAN */
  reagan: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-reagan" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Jelly beans jar in hand -->
  <rect x="80" y="110" width="22" height="32" rx="5" fill="#f0f0f0" filter="url(#sh-reagan)"/>
  <rect x="82" y="108" width="18" height="6" rx="3" fill="#cc2222"/>
  <!-- Colorful jelly beans inside jar -->
  <circle cx="86" cy="120" r="3" fill="#cc2222"/>
  <circle cx="93" cy="118" r="3" fill="#2244aa"/>
  <circle cx="99" cy="122" r="3" fill="#22aa22"/>
  <circle cx="87" cy="128" r="3" fill="#FFD700"/>
  <circle cx="95" cy="130" r="3" fill="#cc2222"/>
  <circle cx="89" cy="136" r="3" fill="#aa22aa"/>
  <!-- Cowboy hat -->
  <ellipse cx="60" cy="46" rx="34" ry="10" fill="#8B6914" filter="url(#sh-reagan)"/>
  <rect x="36" y="16" width="48" height="32" rx="8" fill="#7a5810"/>
  <path d="M36,44 Q26,46 28,54 Q36,50 44,48" fill="#8B6914"/>
  <path d="M84,44 Q94,46 92,54 Q84,50 76,48" fill="#8B6914"/>
  <!-- Suit body -->
  <rect x="26" y="88" width="54" height="60" rx="6" fill="#1a2a4a" filter="url(#sh-reagan)"/>
  <!-- White shirt -->
  <rect x="46" y="88" width="16" height="60" rx="2" fill="#f0f0f0"/>
  <!-- Neck -->
  <rect x="49" y="78" width="18" height="13" rx="4" fill="#d4a080"/>
  <!-- Head -->
  <ellipse cx="58" cy="62" rx="26" ry="26" fill="#d4a080" filter="url(#sh-reagan)"/>
  <!-- Dark hair Reagan-esque -->
  <path d="M32,50 Q34,30 58,28 Q82,30 84,50 Q78,32 58,32 Q38,32 32,50 Z" fill="#2a1a0a"/>
  <!-- Eyes folksy charm warm -->
  <ellipse cx="48" cy="63" rx="6" ry="5" fill="white"/>
  <ellipse cx="68" cy="63" rx="6" ry="5" fill="white"/>
  <circle cx="49" cy="64" r="3.5" fill="#3a2a1a"/>
  <circle cx="69" cy="64" r="3.5" fill="#3a2a1a"/>
  <circle cx="50" cy="63" r="1.2" fill="white"/>
  <circle cx="70" cy="63" r="1.2" fill="white"/>
  <!-- Eyebrows -->
  <path d="M42,56 Q48,53 54,56" stroke="#2a1a0a" stroke-width="2.5" fill="none"/>
  <path d="M62,56 Q68,53 74,56" stroke="#2a1a0a" stroke-width="2.5" fill="none"/>
  <!-- Nose -->
  <ellipse cx="58" cy="71" rx="5" ry="4" fill="#c08060"/>
  <!-- Warm folksy smile -->
  <path d="M46,80 Q58,92 70,80" fill="#aa6644" stroke="#884422" stroke-width="1"/>
  <path d="M48,80 Q58,90 68,80" fill="#cc8866"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── MERKEL */
  merkel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-merkel" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Blue blazer body -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#2244aa" filter="url(#sh-merkel)"/>
  <!-- Merkel-Raute diamond hand gesture -->
  <path d="M40,110 L60,96 L80,110 L60,124 Z" fill="none" stroke="#f0f0f0" stroke-width="3"/>
  <!-- Hands forming rhombus -->
  <ellipse cx="40" cy="110" rx="7" ry="5" fill="#d4a080"/>
  <ellipse cx="80" cy="110" rx="7" ry="5" fill="#d4a080"/>
  <ellipse cx="60" cy="96" rx="5" ry="7" fill="#d4a080"/>
  <ellipse cx="60" cy="124" rx="5" ry="7" fill="#d4a080"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#d4a080"/>
  <!-- Head -->
  <ellipse cx="60" cy="62" rx="26" ry="26" fill="#d4a080" filter="url(#sh-merkel)"/>
  <!-- Short practical hair -->
  <path d="M34,52 Q36,30 60,28 Q84,30 86,52 Q80,34 60,34 Q40,34 34,52 Z" fill="#c0c0b0"/>
  <path d="M34,56 Q34,66 36,70 Q34,56 34,56 Z" fill="#c0c0b0"/>
  <path d="M86,56 Q86,66 84,70 Q86,56 86,56 Z" fill="#c0c0b0"/>
  <!-- Eyes unimpressed stern -->
  <ellipse cx="49" cy="62" rx="6" ry="4" fill="white"/>
  <ellipse cx="71" cy="62" rx="6" ry="4" fill="white"/>
  <circle cx="50" cy="63" r="3" fill="#3a3a4a"/>
  <circle cx="72" cy="63" r="3" fill="#3a3a4a"/>
  <circle cx="51" cy="62" r="1" fill="white"/>
  <circle cx="73" cy="62" r="1" fill="white"/>
  <!-- Eyebrows level stern -->
  <path d="M43,56 Q49,54 55,56" stroke="#888" stroke-width="2.5" fill="none"/>
  <path d="M65,56 Q71,54 77,56" stroke="#888" stroke-width="2.5" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="70" rx="4" ry="4" fill="#c09070"/>
  <!-- Stern unimpressed straight line -->
  <path d="M50,78 Q60,78 70,78" stroke="#8a5030" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── TRUDEAU */
  trudeau: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-trudeau" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Body suit -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#cc2222" filter="url(#sh-trudeau)"/>
  <!-- Maple leaf pin -->
  <circle cx="36" cy="98" r="6" fill="#cc2222" stroke="#fff" stroke-width="1"/>
  <path d="M36,93 L37.5,96 L41,96 L38.5,98 L39.5,102 L36,100 L32.5,102 L33.5,98 L31,96 L34.5,96 Z" fill="white"/>
  <!-- Boxing gloves on hands -->
  <ellipse cx="16" cy="118" rx="12" ry="10" fill="#cc2222" filter="url(#sh-trudeau)"/>
  <ellipse cx="14" cy="116" rx="8" ry="6" fill="#aa1a1a"/>
  <line x1="8" y1="118" x2="24" y2="118" stroke="#cc4444" stroke-width="1.5"/>
  <ellipse cx="104" cy="118" rx="12" ry="10" fill="#cc2222" filter="url(#sh-trudeau)"/>
  <ellipse cx="106" cy="116" rx="8" ry="6" fill="#aa1a1a"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#d4a080"/>
  <!-- Head -->
  <ellipse cx="60" cy="60" rx="26" ry="26" fill="#d4a080" filter="url(#sh-trudeau)"/>
  <!-- Dark hair -->
  <path d="M34,48 Q36,26 60,24 Q84,26 86,48 Q80,28 60,28 Q40,28 34,48 Z" fill="#2a1a0a"/>
  <!-- Eyes sorry but ready -->
  <ellipse cx="49" cy="62" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="62" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="63" r="3.5" fill="#3a2a1a"/>
  <circle cx="72" cy="63" r="3.5" fill="#3a2a1a"/>
  <circle cx="51" cy="62" r="1.2" fill="white"/>
  <circle cx="73" cy="62" r="1.2" fill="white"/>
  <!-- Eyebrows slightly raised apologetic -->
  <path d="M43,55 Q49,52 55,55" stroke="#2a1a0a" stroke-width="2.5" fill="none"/>
  <path d="M65,55 Q71,52 77,55" stroke="#2a1a0a" stroke-width="2.5" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="70" rx="5" ry="4" fill="#c08060"/>
  <!-- Apologetic smile -->
  <path d="M48,78 Q60,88 72,78" fill="#aa6644" stroke="#884422" stroke-width="1"/>
  <path d="M50,78 Q60,86 70,78" fill="#cc8866"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── BORIS */
  boris: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-boris" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Brexit briefcase -->
  <rect x="80" y="116" width="30" height="24" rx="3" fill="#8B6914" filter="url(#sh-boris)"/>
  <rect x="88" y="113" width="14" height="6" rx="2" fill="#7a5810"/>
  <rect x="80" y="128" width="30" height="2" fill="#7a5810"/>
  <text x="82" y="126" font-size="4" fill="#f0e0a0" font-family="Arial" font-weight="bold">BREXIT</text>
  <!-- Dishevelled suit body -->
  <rect x="26" y="88" width="54" height="60" rx="6" fill="#334" filter="url(#sh-boris)"/>
  <!-- Open slightly off-kilter collar -->
  <polygon points="44,88 57,106 57,88" fill="#555"/>
  <polygon points="70,88 57,106 57,88" fill="#666"/>
  <!-- Absolutely wild explosion of blonde hair -->
  <ellipse cx="60" cy="38" rx="36" ry="26" fill="#D4B040" filter="url(#sh-boris)"/>
  <path d="M24,44 Q18,30 28,22 Q36,16 44,28 Q30,24 24,44 Z" fill="#E8C850"/>
  <path d="M96,44 Q102,30 92,22 Q84,16 76,28 Q90,24 96,44 Z" fill="#E8C850"/>
  <path d="M40,16 Q50,6 60,12 Q70,6 80,16 Q72,10 60,14 Q48,10 40,16 Z" fill="#C8A030"/>
  <path d="M22,50 Q16,60 24,68 Q26,56 30,50 Z" fill="#D4B040"/>
  <path d="M98,50 Q104,60 96,68 Q94,56 90,50 Z" fill="#D4B040"/>
  <!-- Head under hair -->
  <ellipse cx="60" cy="62" rx="26" ry="28" fill="#d4a080" filter="url(#sh-boris)"/>
  <!-- Neck -->
  <rect x="50" y="80" width="20" height="12" rx="4" fill="#d4a080"/>
  <!-- Eyes chaotic positivity -->
  <ellipse cx="49" cy="62" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="62" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="63" r="3.5" fill="#4a3a2a"/>
  <circle cx="72" cy="63" r="3.5" fill="#4a3a2a"/>
  <circle cx="51" cy="62" r="1.2" fill="white"/>
  <circle cx="73" cy="62" r="1.2" fill="white"/>
  <!-- Eyebrows wild angled -->
  <path d="M43,55 Q49,52 55,56" stroke="#C8A030" stroke-width="3" fill="none"/>
  <path d="M65,56 Q71,52 77,55" stroke="#C8A030" stroke-width="3" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="70" rx="5" ry="4" fill="#c08060"/>
  <!-- Chaotic grin -->
  <path d="M44,80 Q60,94 76,80" fill="#aa6644" stroke="#884422" stroke-width="1"/>
  <path d="M46,80 Q60,92 74,80" fill="#cc8866"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── MACRON */
  macron: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-macron" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Slim suit body -->
  <rect x="28" y="88" width="64" height="60" rx="6" fill="#1a1a2a" filter="url(#sh-macron)"/>
  <!-- French flag pin -->
  <rect x="36" y="96" width="3" height="8" rx="1" fill="#2244aa"/>
  <rect x="39" y="96" width="3" height="8" rx="1" fill="#f0f0f0"/>
  <rect x="42" y="96" width="3" height="8" rx="1" fill="#cc2222"/>
  <!-- White shirt -->
  <rect x="50" y="88" width="20" height="60" rx="2" fill="#f0f0f0"/>
  <polygon points="60,92 55,124 65,124" fill="#1a1a2a"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#d4a080"/>
  <!-- Head -->
  <ellipse cx="60" cy="62" rx="24" ry="25" fill="#d4a080" filter="url(#sh-macron)"/>
  <!-- Perfect hair -->
  <path d="M36,50 Q38,30 60,28 Q82,30 84,50 Q78,32 60,32 Q42,32 36,50 Z" fill="#2a1a0a"/>
  <!-- Eyes condescending -->
  <ellipse cx="50" cy="62" rx="6" ry="4" fill="white"/>
  <ellipse cx="70" cy="62" rx="6" ry="4" fill="white"/>
  <circle cx="51" cy="63" r="3" fill="#2a1a3a"/>
  <circle cx="71" cy="63" r="3" fill="#2a1a3a"/>
  <circle cx="52" cy="62" r="1" fill="white"/>
  <circle cx="72" cy="62" r="1" fill="white"/>
  <!-- Eyebrows slightly raised arrogance -->
  <path d="M44,55 Q50,52 56,55" stroke="#2a1a0a" stroke-width="2" fill="none"/>
  <path d="M64,55 Q70,52 76,55" stroke="#2a1a0a" stroke-width="2" fill="none"/>
  <!-- Nose sharp refined -->
  <path d="M57,68 Q60,75 63,68 Q62,72 60,70 Q58,72 57,68 Z" fill="#c09070"/>
  <!-- Condescending slight smile -->
  <path d="M52,78 Q60,82 66,77" stroke="#8a5030" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── POPE */
  pope: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-pope" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- White papal vestments body -->
  <rect x="24" y="88" width="72" height="60" rx="10" fill="#f8f8f8" filter="url(#sh-pope)"/>
  <!-- Gold cross on vestment -->
  <rect x="57" y="95" width="6" height="20" rx="2" fill="#FFD700"/>
  <rect x="51" y="102" width="18" height="6" rx="2" fill="#FFD700"/>
  <!-- Holy water bottle in hand -->
  <rect x="80" y="110" width="14" height="22" rx="5" fill="#aaddff" filter="url(#sh-pope)"/>
  <rect x="82" y="108" width="10" height="5" rx="2" fill="#88aacc"/>
  <text x="81" y="120" font-size="4" fill="#2244aa" font-family="Arial">HOLY</text>
  <text x="83" y="126" font-size="4" fill="#2244aa" font-family="Arial">H₂O</text>
  <!-- Blessing gesture left hand -->
  <ellipse cx="24" cy="116" rx="8" ry="10" fill="#d4a080" filter="url(#sh-pope)"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#d4a080"/>
  <!-- Head -->
  <ellipse cx="60" cy="62" rx="24" ry="25" fill="#d4a080" filter="url(#sh-pope)"/>
  <!-- Mitre hat tall -->
  <path d="M36,46 L60,6 L84,46 Z" fill="#f8f8f8" filter="url(#sh-pope)"/>
  <path d="M38,46 L60,10 L82,46" fill="none" stroke="#FFD700" stroke-width="2"/>
  <!-- Gold cross on mitre -->
  <rect x="58" y="20" width="4" height="14" rx="1" fill="#FFD700"/>
  <rect x="54" y="26" width="12" height="4" rx="1" fill="#FFD700"/>
  <!-- Hat band -->
  <rect x="34" y="43" width="52" height="6" rx="2" fill="#FFD700"/>
  <!-- Eyes benevolent -->
  <ellipse cx="50" cy="64" rx="6" ry="5" fill="white"/>
  <ellipse cx="70" cy="64" rx="6" ry="5" fill="white"/>
  <circle cx="51" cy="65" r="3.5" fill="#3a2a1a"/>
  <circle cx="71" cy="65" r="3.5" fill="#3a2a1a"/>
  <circle cx="52" cy="64" r="1.2" fill="white"/>
  <circle cx="72" cy="64" r="1.2" fill="white"/>
  <!-- Nose -->
  <ellipse cx="60" cy="72" rx="4" ry="4" fill="#c09070"/>
  <!-- Benevolent warm smile -->
  <path d="M49,80 Q60,90 71,80" fill="#cc8855" stroke="#aa6633" stroke-width="1"/>
  <path d="M51,80 Q60,88 69,80" fill="#ddaa77"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── BEZOS */
  bezos: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-bezos" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Amazon box under arm -->
  <rect x="80" y="110" width="30" height="24" rx="3" fill="#FF9900" filter="url(#sh-bezos)"/>
  <path d="M80,122 Q95,130 110,122" stroke="#7a4a00" stroke-width="2" fill="none"/>
  <!-- Amazon smile arrow -->
  <path d="M84,118 Q95,126 107,118" stroke="#232F3E" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Body — Amazon shirt visible -->
  <rect x="26" y="88" width="54" height="60" rx="6" fill="#232F3E" filter="url(#sh-bezos)"/>
  <!-- Amazon smile logo on shirt -->
  <rect x="34" y="100" width="32" height="20" rx="3" fill="#FF9900"/>
  <text x="36" y="112" font-size="6" fill="#232F3E" font-family="Arial" font-weight="bold">amazon</text>
  <path d="M36,116 Q50,122 64,116" stroke="#232F3E" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Neck very thick muscular bald guy -->
  <rect x="47" y="76" width="26" height="16" rx="6" fill="#d4a080"/>
  <!-- Head bald shiny dome -->
  <ellipse cx="60" cy="58" rx="28" ry="26" fill="#d4a080" filter="url(#sh-bezos)"/>
  <!-- Shiny highlight on dome -->
  <ellipse cx="52" cy="46" rx="8" ry="6" fill="#e8c4a0" opacity="0.6"/>
  <!-- Eyes predatory optimism -->
  <ellipse cx="49" cy="60" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="60" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="61" r="3.5" fill="#2a1a0a"/>
  <circle cx="72" cy="61" r="3.5" fill="#2a1a0a"/>
  <circle cx="51" cy="60" r="1.2" fill="white"/>
  <circle cx="73" cy="60" r="1.2" fill="white"/>
  <!-- Eyebrows -->
  <path d="M43,53 Q49,50 55,53" stroke="#6a4a2a" stroke-width="2.5" fill="none"/>
  <path d="M65,53 Q71,50 77,53" stroke="#6a4a2a" stroke-width="2.5" fill="none"/>
  <!-- Nose broad -->
  <ellipse cx="60" cy="68" rx="6" ry="5" fill="#c08060"/>
  <!-- Predatory wide smile -->
  <path d="M46,76 Q60,90 74,76" fill="#aa6644" stroke="#884422" stroke-width="1"/>
  <path d="M48,76 Q60,88 72,76" fill="#cc8866"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── ZUCK */
  zuck: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-zuck" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Grey t-shirt body -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#888" filter="url(#sh-zuck)"/>
  <!-- Meta/FB pin -->
  <circle cx="36" cy="98" r="6" fill="#0866ff"/>
  <text x="33" y="102" font-size="5" fill="white" font-family="Arial" font-weight="bold">f</text>
  <!-- Android posture — stiff arms at sides -->
  <rect x="14" y="92" width="14" height="40" rx="4" fill="#888" filter="url(#sh-zuck)"/>
  <rect x="92" y="92" width="14" height="40" rx="4" fill="#888" filter="url(#sh-zuck)"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#e8c4a0"/>
  <!-- Head slightly large -->
  <ellipse cx="60" cy="60" rx="26" ry="27" fill="#e8c4a0" filter="url(#sh-zuck)"/>
  <!-- Dark hair parted precisely -->
  <path d="M34,48 Q36,28 60,26 Q84,28 86,48 Q80,30 60,30 Q40,30 34,48 Z" fill="#2a1a0a"/>
  <line x1="60" y1="26" x2="60" y2="46" stroke="#e8c4a0" stroke-width="3"/>
  <!-- Dead eyes — uncanny valley -->
  <ellipse cx="49" cy="62" rx="7" ry="5" fill="white"/>
  <ellipse cx="71" cy="62" rx="7" ry="5" fill="white"/>
  <circle cx="50" cy="63" r="4" fill="#3a2a5a"/>
  <circle cx="72" cy="63" r="4" fill="#3a2a5a"/>
  <!-- Unnervingly perfect pupils -->
  <circle cx="51" cy="62" r="1.5" fill="white"/>
  <circle cx="73" cy="62" r="1.5" fill="white"/>
  <!-- Highlight rings on eyes -->
  <circle cx="49" cy="62" r="6.5" fill="none" stroke="#ccc" stroke-width="0.5"/>
  <circle cx="71" cy="62" r="6.5" fill="none" stroke="#ccc" stroke-width="0.5"/>
  <!-- Eyebrows barely there -->
  <path d="M42,56 Q49,55 56,56" stroke="#6a5a4a" stroke-width="1.5" fill="none"/>
  <path d="M64,56 Q71,55 78,56" stroke="#6a5a4a" stroke-width="1.5" fill="none"/>
  <!-- Nose small -->
  <ellipse cx="60" cy="70" rx="4" ry="3" fill="#d0a880"/>
  <!-- Programmed smile not quite right -->
  <path d="M50,78 Q60,84 70,78" stroke="#9a6040" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M50,78 Q50,75 52,76" stroke="#9a6040" stroke-width="1" fill="none"/>
  <path d="M70,78 Q70,75 68,76" stroke="#9a6040" stroke-width="1" fill="none"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── MAO */
  mao: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-mao" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Mao suit grey collarless -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#6a6a5a" filter="url(#sh-mao)"/>
  <!-- Collarless button line -->
  <line x1="60" y1="88" x2="60" y2="148" stroke="#5a5a4a" stroke-width="2"/>
  <circle cx="60" cy="96" r="2" fill="#5a5a4a"/>
  <circle cx="60" cy="106" r="2" fill="#5a5a4a"/>
  <circle cx="60" cy="116" r="2" fill="#5a5a4a"/>
  <!-- Red star -->
  <circle cx="36" cy="96" r="6" fill="#cc2222"/>
  <polygon points="36,90 37.5,94 42,94 38.5,97 40,101 36,98 32,101 33.5,97 30,94 34.5,94" fill="#FFD700" transform="scale(0.6) translate(24,92)"/>
  <!-- Little Red Book held up -->
  <rect x="76" y="96" width="20" height="28" rx="3" fill="#cc2222" filter="url(#sh-mao)"/>
  <text x="78" y="107" font-size="4" fill="#FFD700" font-family="Arial">Little</text>
  <text x="79" y="113" font-size="4" fill="#FFD700" font-family="Arial">Red</text>
  <text x="79" y="119" font-size="4" fill="#FFD700" font-family="Arial">Book</text>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#e8c89a"/>
  <!-- Head round -->
  <ellipse cx="60" cy="60" rx="26" ry="26" fill="#e8c89a" filter="url(#sh-mao)"/>
  <!-- Black hair short neat -->
  <path d="M34,48 Q36,28 60,26 Q84,28 86,48 Q80,30 60,30 Q40,30 34,48 Z" fill="#1a1a1a"/>
  <!-- Eyes ideological certainty -->
  <ellipse cx="49" cy="62" rx="6" ry="4" fill="white"/>
  <ellipse cx="71" cy="62" rx="6" ry="4" fill="white"/>
  <circle cx="50" cy="63" r="3" fill="#2a1a0a"/>
  <circle cx="72" cy="63" r="3" fill="#2a1a0a"/>
  <!-- Eyebrows flat thick -->
  <path d="M43,56 Q49,54 55,56" stroke="#1a1a1a" stroke-width="3" fill="none"/>
  <path d="M65,56 Q71,54 77,56" stroke="#1a1a1a" stroke-width="3" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="70" rx="5" ry="4" fill="#d4a870"/>
  <!-- Wart on chin mole -->
  <circle cx="54" cy="78" r="2" fill="#8a6040"/>
  <!-- Ideological certain mouth -->
  <path d="M50,76 Q60,80 70,76" stroke="#7a4020" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── THATCHER */
  thatcher: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-thatcher" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Iron handbag — metallic silver -->
  <rect x="78" y="112" width="32" height="24" rx="4" fill="#aaa" filter="url(#sh-thatcher)"/>
  <path d="M84,112 Q90,104 96,112" fill="none" stroke="#888" stroke-width="3"/>
  <rect x="78" y="128" width="32" height="2" fill="#999"/>
  <!-- Ridged texture on metal bag -->
  <line x1="80" y1="116" x2="108" y2="116" stroke="#ccc" stroke-width="1"/>
  <line x1="80" y1="120" x2="108" y2="120" stroke="#ccc" stroke-width="1"/>
  <line x1="80" y1="124" x2="108" y2="124" stroke="#ccc" stroke-width="1"/>
  <!-- Formal outfit body dark blue -->
  <rect x="24" y="88" width="58" height="60" rx="6" fill="#1a2a4a" filter="url(#sh-thatcher)"/>
  <!-- White shirt -->
  <rect x="44" y="88" width="18" height="60" rx="2" fill="#f0f0f0"/>
  <!-- Neck -->
  <rect x="48" y="78" width="18" height="13" rx="4" fill="#d4a080"/>
  <!-- Head -->
  <ellipse cx="57" cy="62" rx="26" ry="26" fill="#d4a080" filter="url(#sh-thatcher)"/>
  <!-- Iron-grey hair styled firmly -->
  <path d="M31,50 Q33,28 57,26 Q81,28 83,50 Q77,30 57,30 Q37,30 31,50 Z" fill="#c0c0c0"/>
  <path d="M31,54 Q31,68 33,74" fill="#b8b8b8"/>
  <path d="M83,54 Q83,68 81,74" fill="#b8b8b8"/>
  <!-- Hair set firmly like iron -->
  <path d="M33,48 Q35,40 57,38 Q79,40 81,48" fill="#d8d8d8"/>
  <!-- Eyes unmovable stern -->
  <ellipse cx="47" cy="63" rx="6" ry="4" fill="white"/>
  <ellipse cx="67" cy="63" rx="6" ry="4" fill="white"/>
  <circle cx="48" cy="64" r="3" fill="#3a2a1a"/>
  <circle cx="68" cy="64" r="3" fill="#3a2a1a"/>
  <circle cx="49" cy="63" r="1" fill="white"/>
  <circle cx="69" cy="63" r="1" fill="white"/>
  <!-- Eyebrows stern permanent -->
  <path d="M41,57 Q47,55 53,57" stroke="#888" stroke-width="2.5" fill="none"/>
  <path d="M61,57 Q67,55 73,57" stroke="#888" stroke-width="2.5" fill="none"/>
  <!-- Nose -->
  <ellipse cx="57" cy="71" rx="5" ry="4" fill="#c09070"/>
  <!-- Unmovable thin line -->
  <path d="M47,78 Q57,78 67,78" stroke="#7a4020" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── LULA */
  lula: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-lula" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Suit jacket body -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#1a3a2a" filter="url(#sh-lula)"/>
  <!-- Brazilian flag pin -->
  <ellipse cx="36" cy="98" rx="7" ry="5" fill="#009c3b"/>
  <ellipse cx="36" cy="98" rx="4" ry="2.5" fill="#FFDF00"/>
  <circle cx="36" cy="98" r="2" fill="#002776"/>
  <!-- Yellow hard hat -->
  <path d="M26,50 Q28,26 60,24 Q92,26 94,50 Q86,36 60,34 Q34,36 26,50 Z" fill="#FFD700" filter="url(#sh-lula)"/>
  <rect x="20" y="46" width="80" height="10" rx="4" fill="#E8C800"/>
  <!-- Raised fist -->
  <rect x="78" y="96" width="16" height="20" rx="5" fill="#5a2a1a" filter="url(#sh-lula)"/>
  <rect x="78" y="92" width="16" height="8" rx="3" fill="#5a2a1a"/>
  <!-- White shirt -->
  <rect x="50" y="88" width="20" height="60" rx="2" fill="#f0f0f0"/>
  <!-- Neck -->
  <rect x="50" y="74" width="20" height="16" rx="4" fill="#8a4a2a"/>
  <!-- Head -->
  <ellipse cx="60" cy="58" rx="26" ry="26" fill="#8a4a2a" filter="url(#sh-lula)"/>
  <!-- Hair and beard dark grey -->
  <path d="M34,56 Q36,72 60,76 Q84,72 86,56 Q78,70 60,72 Q42,70 34,56 Z" fill="#4a3a2a"/>
  <!-- Eyes working class pride -->
  <ellipse cx="49" cy="58" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="58" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="59" r="3.5" fill="#2a1a0a"/>
  <circle cx="72" cy="59" r="3.5" fill="#2a1a0a"/>
  <circle cx="51" cy="58" r="1.2" fill="white"/>
  <circle cx="73" cy="58" r="1.2" fill="white"/>
  <!-- Eyebrows -->
  <path d="M43,51 Q49,48 55,51" stroke="#4a3a2a" stroke-width="3" fill="none"/>
  <path d="M65,51 Q71,48 77,51" stroke="#4a3a2a" stroke-width="3" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="65" rx="6" ry="5" fill="#6a3a1a"/>
  <!-- Proud smile -->
  <path d="M46,72 Q60,84 74,72" fill="#6a2a1a" stroke="#4a1a0a" stroke-width="1"/>
  <path d="M48,72 Q60,82 72,72" fill="#8a4a2a"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── JACINDA */
  jacinda: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-jacinda" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Body suit -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#1a3a5a" filter="url(#sh-jacinda)"/>
  <!-- NZ flag pin -->
  <rect x="36" y="96" width="9" height="6" rx="1" fill="#002255"/>
  <circle cx="40" cy="99" r="2" fill="#cc2233"/>
  <!-- Hijab — white/cream from Christchurch memorial -->
  <path d="M20,54 Q20,30 60,26 Q100,30 100,54 Q100,80 84,88 Q70,94 60,96 Q50,94 36,88 Q20,80 20,54 Z" fill="#f8f4e8" filter="url(#sh-jacinda)"/>
  <!-- Hijab fabric drape -->
  <path d="M20,54 Q18,70 24,86 Q30,92 36,88" fill="#f0ece0"/>
  <path d="M100,54 Q102,70 96,86 Q90,92 84,88" fill="#f0ece0"/>
  <!-- Face opening of hijab -->
  <ellipse cx="60" cy="60" rx="24" ry="25" fill="#d4a080" filter="url(#sh-jacinda)"/>
  <!-- Neck -->
  <rect x="50" y="80" width="20" height="12" rx="4" fill="#d4a080"/>
  <!-- Eyes genuine warmth -->
  <ellipse cx="49" cy="60" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="60" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="61" r="3.5" fill="#3a2a1a"/>
  <circle cx="72" cy="61" r="3.5" fill="#3a2a1a"/>
  <circle cx="51" cy="60" r="1.2" fill="white"/>
  <circle cx="73" cy="60" r="1.2" fill="white"/>
  <!-- Eyebrows kind -->
  <path d="M43,53 Q49,50 55,53" stroke="#4a3a2a" stroke-width="2" fill="none"/>
  <path d="M65,53 Q71,50 77,53" stroke="#4a3a2a" stroke-width="2" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="68" rx="5" ry="4" fill="#c08060"/>
  <!-- Genuine warm kind smile -->
  <path d="M47,78 Q60,92 73,78" fill="#aa6644" stroke="#884422" stroke-width="1"/>
  <path d="M49,78 Q60,90 71,78" fill="#cc8866"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── CAESAR */
  caesar: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-caesar" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Toga body white with red trim -->
  <rect x="24" y="88" width="72" height="60" rx="8" fill="#f8f8f0" filter="url(#sh-caesar)"/>
  <rect x="24" y="88" width="72" height="8" rx="4" fill="#cc2222"/>
  <rect x="24" y="140" width="72" height="8" rx="4" fill="#cc2222"/>
  <!-- BEWARE THE IDES label on toga -->
  <rect x="28" y="108" width="64" height="14" rx="3" fill="#cc2222"/>
  <text x="60" y="119" font-size="5" fill="white" font-family="Arial" font-weight="bold" text-anchor="middle">BEWARE THE IDES</text>
  <!-- Knife tucked behind back — visible at side -->
  <rect x="84" y="100" width="4" height="28" rx="2" fill="#aaa" filter="url(#sh-caesar)"/>
  <path d="M84,100 Q86,96 88,100" fill="#ccc"/>
  <!-- Laurel crown -->
  <ellipse cx="60" cy="38" rx="28" ry="8" fill="none" stroke="#228822" stroke-width="3" filter="url(#sh-caesar)"/>
  <!-- Laurel leaves -->
  <ellipse cx="38" cy="36" rx="5" ry="3" fill="#22aa22" transform="rotate(-30,38,36)"/>
  <ellipse cx="46" cy="32" rx="5" ry="3" fill="#22aa22" transform="rotate(-15,46,32)"/>
  <ellipse cx="60" cy="30" rx="5" ry="3" fill="#22aa22"/>
  <ellipse cx="74" cy="32" rx="5" ry="3" fill="#22aa22" transform="rotate(15,74,32)"/>
  <ellipse cx="82" cy="36" rx="5" ry="3" fill="#22aa22" transform="rotate(30,82,36)"/>
  <!-- Neck -->
  <rect x="50" y="76" width="20" height="16" rx="4" fill="#d4a080"/>
  <!-- Head Roman features -->
  <ellipse cx="60" cy="60" rx="26" ry="26" fill="#d4a080" filter="url(#sh-caesar)"/>
  <!-- Short Roman hair -->
  <path d="M34,50 Q36,36 60,34 Q84,36 86,50 Q80,38 60,38 Q40,38 34,50 Z" fill="#8a6030"/>
  <!-- Eyes confident oblivious -->
  <ellipse cx="49" cy="61" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="61" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="62" r="3.5" fill="#3a2a1a"/>
  <circle cx="72" cy="62" r="3.5" fill="#3a2a1a"/>
  <circle cx="51" cy="61" r="1.2" fill="white"/>
  <circle cx="73" cy="61" r="1.2" fill="white"/>
  <!-- Roman nose prominent -->
  <path d="M56,66 Q60,78 64,66 Q62,74 60,72 Q58,74 56,66 Z" fill="#c09070"/>
  <!-- Confident smile -->
  <path d="M49,79 Q60,88 71,79" fill="#aa6644" stroke="#884422" stroke-width="1"/>
</svg>`,

  /* ──────────────────────────────────────────────────────── CLEOPATRA */
  cleopatra: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-cleo" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Egyptian robes body gold and white -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#f8f0d4" filter="url(#sh-cleo)"/>
  <rect x="26" y="88" width="68" height="6" fill="#FFD700"/>
  <rect x="26" y="142" width="68" height="6" fill="#FFD700"/>
  <!-- Gold collar ornate -->
  <ellipse cx="60" cy="90" rx="26" ry="10" fill="#FFD700" opacity="0.8"/>
  <ellipse cx="60" cy="90" rx="22" ry="8" fill="#cc8800"/>
  <!-- Asp snake around shoulders -->
  <path d="M26,96 Q18,90 20,104 Q22,114 30,116 Q36,112 34,104 Q32,98 40,96 Q52,94 60,98" stroke="#22aa22" stroke-width="4" fill="none" stroke-linecap="round"/>
  <ellipse cx="20" cy="104" rx="5" ry="4" fill="#228822" transform="rotate(-20,20,104)"/>
  <!-- Snake head -->
  <path d="M18,102 Q14,98 16,106 Q18,112 22,108 Z" fill="#22aa22"/>
  <circle cx="15" cy="102" r="1.5" fill="#FFD700"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#e8c890"/>
  <!-- Head -->
  <ellipse cx="60" cy="62" rx="24" ry="24" fill="#e8c890" filter="url(#sh-cleo)"/>
  <!-- Elaborate Egyptian headdress -->
  <rect x="30" y="38" width="60" height="28" rx="2" fill="#FFD700" filter="url(#sh-cleo)"/>
  <rect x="30" y="38" width="60" height="6" fill="#cc8800"/>
  <rect x="32" y="44" width="56" height="22" fill="#FFD700"/>
  <!-- Headdress stripes -->
  <rect x="32" y="46" width="56" height="3" fill="#cc2222"/>
  <rect x="32" y="52" width="56" height="3" fill="#2244aa"/>
  <rect x="32" y="58" width="56" height="3" fill="#cc2222"/>
  <!-- Uraeus serpent on headdress -->
  <path d="M58,38 Q60,30 62,38" stroke="#22aa22" stroke-width="3" fill="none"/>
  <circle cx="60" cy="29" r="4" fill="#22aa22"/>
  <!-- Dramatic eye makeup kohl lines -->
  <ellipse cx="48" cy="67" rx="7" ry="5" fill="white"/>
  <ellipse cx="72" cy="67" rx="7" ry="5" fill="white"/>
  <circle cx="49" cy="68" r="4" fill="#1a1a1a"/>
  <circle cx="73" cy="68" r="4" fill="#1a1a1a"/>
  <!-- Kohl lines extending dramatically -->
  <path d="M41,67 Q38,65 36,68" stroke="#1a1a1a" stroke-width="2.5" fill="none"/>
  <path d="M79,67 Q82,65 84,68" stroke="#1a1a1a" stroke-width="2.5" fill="none"/>
  <circle cx="50" cy="67" r="1.5" fill="white"/>
  <circle cx="74" cy="67" r="1.5" fill="white"/>
  <!-- Eye shadow gold -->
  <path d="M41,64 Q48,61 55,64" fill="#FFD700" opacity="0.6"/>
  <path d="M65,64 Q72,61 79,64" fill="#FFD700" opacity="0.6"/>
  <!-- Nose delicate -->
  <ellipse cx="60" cy="74" rx="4" ry="3" fill="#d4a870"/>
  <!-- Seductive red lips -->
  <path d="M50,80 Q60,88 70,80" fill="#cc1133"/>
  <path d="M50,80 Q55,77 60,80 Q65,77 70,80" fill="#ee2244"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── MLK */
  mlk: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-mlk" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Dark suit body -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#1a1a2a" filter="url(#sh-mlk)"/>
  <!-- American flag pin -->
  <rect x="36" y="96" width="9" height="6" rx="1" fill="#b22234"/>
  <rect x="36" y="98" width="9" height="2" fill="#f0f0f0"/>
  <rect x="36" y="96" width="3" height="6" fill="#3c3b6e"/>
  <!-- White shirt -->
  <rect x="50" y="88" width="20" height="60" rx="2" fill="#f0f0f0"/>
  <polygon points="60,92 55,128 65,128" fill="#444"/>
  <!-- Microphone in hand -->
  <rect x="76" y="94" width="8" height="24" rx="4" fill="#888" filter="url(#sh-mlk)"/>
  <rect x="72" y="88" width="16" height="12" rx="6" fill="#aaa"/>
  <!-- Mic grill lines -->
  <line x1="74" y1="90" x2="86" y2="90" stroke="#999" stroke-width="1"/>
  <line x1="73" y1="93" x2="87" y2="93" stroke="#999" stroke-width="1"/>
  <line x1="74" y1="96" x2="86" y2="96" stroke="#999" stroke-width="1"/>
  <!-- "I HAVE A DREAM" faintly -->
  <text x="60" y="135" font-size="4" fill="#f0f0f0" opacity="0.4" font-family="Arial" font-style="italic" text-anchor="middle">I HAVE A DREAM</text>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#3a1a0a"/>
  <!-- Head -->
  <ellipse cx="60" cy="60" rx="26" ry="27" fill="#3a1a0a" filter="url(#sh-mlk)"/>
  <!-- Hair short dark -->
  <path d="M34,48 Q36,28 60,26 Q84,28 86,48 Q80,30 60,30 Q40,30 34,48 Z" fill="#1a0a00"/>
  <!-- Eyes prophetic -->
  <ellipse cx="49" cy="60" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="60" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="61" r="3.5" fill="#1a0a00"/>
  <circle cx="72" cy="61" r="3.5" fill="#1a0a00"/>
  <circle cx="51" cy="60" r="1.2" fill="white"/>
  <circle cx="73" cy="60" r="1.2" fill="white"/>
  <!-- Eyebrows determined -->
  <path d="M43,53 Q49,50 55,53" stroke="#1a0a00" stroke-width="2.5" fill="none"/>
  <path d="M65,53 Q71,50 77,53" stroke="#1a0a00" stroke-width="2.5" fill="none"/>
  <!-- Nose broad -->
  <ellipse cx="60" cy="68" rx="6" ry="5" fill="#2a0a00"/>
  <!-- Prophetic determined expression -->
  <path d="M47,78 Q60,86 73,78" fill="#8a4422" stroke="#6a2a10" stroke-width="1"/>
  <path d="M49,78 Q60,84 71,78" fill="#aa6644"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── RAND */
  rand: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-rand" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Suit body -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#334" filter="url(#sh-rand)"/>
  <!-- DON'T TREAD ON ME badge -->
  <rect x="30" y="96" width="28" height="10" rx="2" fill="#FFD700"/>
  <text x="31" y="104" font-size="4" fill="#2a2a1a" font-family="Arial" font-weight="bold">DON'T TREAD</text>
  <!-- Small Constitution copy in hand -->
  <rect x="78" y="106" width="18" height="24" rx="2" fill="#8B6914" filter="url(#sh-rand)"/>
  <rect x="80" y="108" width="14" height="20" rx="1" fill="#f0e8d0"/>
  <text x="81" y="116" font-size="4" fill="#4a3a2a" font-family="Arial">WE THE</text>
  <text x="83" y="121" font-size="4" fill="#4a3a2a" font-family="Arial">PEOPLE</text>
  <!-- White shirt -->
  <rect x="50" y="88" width="20" height="60" rx="2" fill="#f0f0f0"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#c89a6a"/>
  <!-- Head -->
  <ellipse cx="60" cy="60" rx="26" ry="27" fill="#c89a6a" filter="url(#sh-rand)"/>
  <!-- Frizzy curly hair -->
  <ellipse cx="60" cy="44" rx="28" ry="20" fill="#6a4a2a" filter="url(#sh-rand)"/>
  <circle cx="40" cy="40" r="8" fill="#6a4a2a"/>
  <circle cx="80" cy="40" r="8" fill="#6a4a2a"/>
  <circle cx="52" cy="32" r="7" fill="#7a5a3a"/>
  <circle cx="68" cy="32" r="7" fill="#7a5a3a"/>
  <circle cx="60" cy="28" r="7" fill="#7a5a3a"/>
  <circle cx="36" cy="48" r="5" fill="#6a4a2a"/>
  <circle cx="84" cy="48" r="5" fill="#6a4a2a"/>
  <!-- Eyes libertarian intensity -->
  <ellipse cx="49" cy="62" rx="6" ry="5" fill="white"/>
  <ellipse cx="71" cy="62" rx="6" ry="5" fill="white"/>
  <circle cx="50" cy="63" r="3.5" fill="#3a2a1a"/>
  <circle cx="72" cy="63" r="3.5" fill="#3a2a1a"/>
  <circle cx="51" cy="62" r="1.2" fill="white"/>
  <circle cx="73" cy="62" r="1.2" fill="white"/>
  <!-- Eyebrows -->
  <path d="M43,55 Q49,52 55,55" stroke="#4a3a2a" stroke-width="2.5" fill="none"/>
  <path d="M65,55 Q71,52 77,55" stroke="#4a3a2a" stroke-width="2.5" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="70" rx="5" ry="4" fill="#a87050"/>
  <!-- Intense determined expression -->
  <path d="M50,78 Q60,82 70,78" stroke="#7a4020" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── DESANTIS */
  desantis: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-desantis" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Banned books pile next to him -->
  <rect x="82" y="118" width="28" height="8" rx="2" fill="#cc4422" filter="url(#sh-desantis)"/>
  <rect x="84" y="126" width="24" height="8" rx="2" fill="#2244aa"/>
  <rect x="80" y="134" width="30" height="8" rx="2" fill="#22aa44"/>
  <rect x="82" y="142" width="26" height="6" rx="2" fill="#aa2222"/>
  <text x="84" y="125" font-size="4" fill="white" font-family="Arial">BANNED</text>
  <!-- Florida state flag pin -->
  <rect x="36" y="96" width="10" height="7" rx="1" fill="white"/>
  <line x1="36" y1="96" x2="46" y2="103" stroke="#cc2222" stroke-width="1.5"/>
  <line x1="46" y1="96" x2="36" y2="103" stroke="#cc2222" stroke-width="1.5"/>
  <!-- Suit body -->
  <rect x="26" y="88" width="58" height="60" rx="6" fill="#1a2a4a" filter="url(#sh-desantis)"/>
  <!-- White shirt -->
  <rect x="48" y="88" width="18" height="60" rx="2" fill="#f0f0f0"/>
  <polygon points="57,92 53,122 61,122" fill="#cc2222"/>
  <!-- Neck -->
  <rect x="49" y="78" width="18" height="13" rx="4" fill="#c89a6a"/>
  <!-- Head -->
  <ellipse cx="58" cy="60" rx="25" ry="26" fill="#c89a6a" filter="url(#sh-desantis)"/>
  <!-- Hair dark -->
  <path d="M33,48 Q35,28 58,26 Q81,28 83,48 Q77,30 58,30 Q39,30 33,48 Z" fill="#2a1a0a"/>
  <!-- Eyes culture-war certainty -->
  <ellipse cx="48" cy="60" rx="6" ry="4" fill="white"/>
  <ellipse cx="68" cy="60" rx="6" ry="4" fill="white"/>
  <circle cx="49" cy="61" r="3" fill="#2a1a3a"/>
  <circle cx="69" cy="61" r="3" fill="#2a1a3a"/>
  <!-- Eyebrows furrowed -->
  <path d="M42,53 Q48,50 54,53" stroke="#2a1a0a" stroke-width="3" fill="none"/>
  <path d="M62,53 Q68,50 74,53" stroke="#2a1a0a" stroke-width="3" fill="none"/>
  <!-- Nose -->
  <ellipse cx="58" cy="68" rx="5" ry="4" fill="#a87050"/>
  <!-- Certain determined mouth -->
  <path d="M48,77 Q58,81 68,77" stroke="#7a4020" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── MUSK */
  musk: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-musk" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Body shirt -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#1a1a1a" filter="url(#sh-musk)"/>
  <!-- Rocket ship pin -->
  <polygon points="36,92 39,104 33,104" fill="#aaa"/>
  <rect x="32" y="102" width="8" height="6" rx="1" fill="#888"/>
  <!-- Twitter/X bird on lapel -->
  <circle cx="50" cy="98" r="6" fill="#1DA1F2"/>
  <text x="47" y="102" font-size="7" fill="white" font-family="Arial" font-weight="bold">X</text>
  <!-- White shirt underneath -->
  <rect x="50" y="88" width="20" height="60" rx="2" fill="#2a2a2a"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="4" fill="#c89a6a"/>
  <!-- Head slightly large -->
  <ellipse cx="60" cy="60" rx="27" ry="27" fill="#c89a6a" filter="url(#sh-musk)"/>
  <!-- Hair dark slightly dishevelled transplant -->
  <path d="M33,48 Q35,28 60,26 Q85,28 87,48 Q81,30 60,30 Q39,30 33,48 Z" fill="#2a1a0a"/>
  <path d="M33,52 Q35,44 40,42 Q36,48 33,52 Z" fill="#2a1a0a"/>
  <!-- Eyes slightly unhinged wide -->
  <ellipse cx="49" cy="60" rx="7" ry="7" fill="white"/>
  <ellipse cx="71" cy="60" rx="7" ry="7" fill="white"/>
  <circle cx="50" cy="61" r="4" fill="#4a3a1a"/>
  <circle cx="72" cy="61" r="4" fill="#4a3a1a"/>
  <circle cx="51" cy="59" r="1.5" fill="white"/>
  <circle cx="73" cy="59" r="1.5" fill="white"/>
  <!-- Eyebrows one raised chaotic visionary -->
  <path d="M42,52 Q49,49 56,52" stroke="#2a1a0a" stroke-width="2.5" fill="none"/>
  <path d="M64,50 Q71,48 78,52" stroke="#2a1a0a" stroke-width="2" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="68" rx="6" ry="5" fill="#b07850"/>
  <!-- Manic grin -->
  <path d="M46,78 Q60,90 74,78" fill="#aa6644" stroke="#884422" stroke-width="1"/>
  <path d="M48,78 Q60,88 72,78" fill="#cc8866"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── ROMNEY */
  romney: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-romney" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Binder in hand -->
  <rect x="78" y="104" width="28" height="36" rx="3" fill="#cc4422" filter="url(#sh-romney)"/>
  <rect x="80" y="106" width="24" height="32" rx="2" fill="#f8d8c8"/>
  <rect x="82" y="108" width="20" height="2" fill="#cc4422"/>
  <rect x="82" y="112" width="20" height="2" fill="#cc4422"/>
  <rect x="82" y="116" width="20" height="2" fill="#cc4422"/>
  <!-- Suit body -->
  <rect x="26" y="88" width="54" height="60" rx="6" fill="#1a2a4a" filter="url(#sh-romney)"/>
  <!-- White shirt -->
  <rect x="46" y="88" width="16" height="60" rx="2" fill="#f0f0f0"/>
  <polygon points="54,92 50,120 58,120" fill="#cc2222"/>
  <!-- Neck -->
  <rect x="48" y="78" width="18" height="13" rx="4" fill="#d4a080"/>
  <!-- Head -->
  <ellipse cx="57" cy="60" rx="26" ry="26" fill="#d4a080" filter="url(#sh-romney)"/>
  <!-- Shellacked perfect hair -->
  <path d="M31,48 Q33,26 57,24 Q81,26 83,48 Q77,28 57,28 Q37,28 31,48 Z" fill="#2a1a0a"/>
  <!-- Hair so perfect it looks sculpted -->
  <path d="M31,50 Q32,44 40,42 Q34,46 31,52 Z" fill="#1a0a00"/>
  <path d="M83,50 Q82,44 74,42 Q80,46 83,52 Z" fill="#1a0a00"/>
  <!-- Shine on hair -->
  <path d="M42,30 Q50,27 58,29" stroke="#4a3a2a" stroke-width="1.5" fill="none" opacity="0.5"/>
  <!-- Eyes uncomfortable -->
  <ellipse cx="47" cy="61" rx="6" ry="5" fill="white"/>
  <ellipse cx="67" cy="61" rx="6" ry="5" fill="white"/>
  <circle cx="48" cy="62" r="3.5" fill="#3a2a1a"/>
  <circle cx="68" cy="62" r="3.5" fill="#3a2a1a"/>
  <circle cx="49" cy="61" r="1.2" fill="white"/>
  <circle cx="69" cy="61" r="1.2" fill="white"/>
  <!-- Eyebrows -->
  <path d="M41,54 Q47,51 53,54" stroke="#2a1a0a" stroke-width="2.5" fill="none"/>
  <path d="M61,54 Q67,51 73,54" stroke="#2a1a0a" stroke-width="2.5" fill="none"/>
  <!-- Nose -->
  <ellipse cx="57" cy="69" rx="5" ry="4" fill="#c09060"/>
  <!-- Uncomfortable strained smile -->
  <path d="M47,78 Q57,84 67,78" fill="#cc8855" stroke="#aa6633" stroke-width="1"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── PENCE */
  pence: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-pence" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Very stiff body suit -->
  <rect x="28" y="88" width="64" height="60" rx="2" fill="#1a1a2a" filter="url(#sh-pence)"/>
  <!-- Cross pin tiny -->
  <rect x="36" y="97" width="3" height="8" rx="1" fill="#FFD700"/>
  <rect x="33" y="100" width="9" height="3" rx="1" fill="#FFD700"/>
  <!-- White shirt extremely crisp -->
  <rect x="50" y="88" width="20" height="60" rx="1" fill="#ffffff"/>
  <polygon points="60,92 55,124 65,124" fill="#2244aa"/>
  <!-- Neck -->
  <rect x="50" y="78" width="20" height="13" rx="2" fill="#d4b090"/>
  <!-- Head -->
  <ellipse cx="60" cy="60" rx="26" ry="26" fill="#d4b090" filter="url(#sh-pence)"/>
  <!-- Immaculately parted white hair -->
  <path d="M34,48 Q36,28 60,26 Q84,28 86,48 Q80,30 60,30 Q40,30 34,48 Z" fill="#e8e8e8"/>
  <!-- Perfect center part -->
  <line x1="60" y1="26" x2="60" y2="48" stroke="#d4b090" stroke-width="3"/>
  <!-- Eyes devout discomfort -->
  <ellipse cx="49" cy="61" rx="6" ry="4" fill="white"/>
  <ellipse cx="71" cy="61" rx="6" ry="4" fill="white"/>
  <circle cx="50" cy="62" r="3" fill="#3a3a4a"/>
  <circle cx="72" cy="62" r="3" fill="#3a3a4a"/>
  <circle cx="51" cy="61" r="1" fill="white"/>
  <circle cx="73" cy="61" r="1" fill="white"/>
  <!-- Eyebrows level and proper -->
  <path d="M43,55 Q49,53 55,55" stroke="#aaa" stroke-width="2" fill="none"/>
  <path d="M65,55 Q71,53 77,55" stroke="#aaa" stroke-width="2" fill="none"/>
  <!-- Nose -->
  <ellipse cx="60" cy="69" rx="4" ry="4" fill="#c0a080"/>
  <!-- Tight discomforted straight line mouth -->
  <path d="M50,78 Q60,78 70,78" stroke="#8a6040" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Stiff posture lines -->
  <line x1="60" y1="88" x2="60" y2="148" stroke="#0a0a1a" stroke-width="0.5" opacity="0.3"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── ERDOGAN */
  erdogan: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-erdogan" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Stern suit body -->
  <rect x="26" y="88" width="68" height="60" rx="6" fill="#1a1a2a" filter="url(#sh-erdogan)"/>
  <!-- Turkish flag pin -->
  <rect x="34" y="96" width="12" height="8" rx="1" fill="#cc2222"/>
  <circle cx="38" cy="100" r="2.5" fill="white"/>
  <path d="M40,97.5 L42,100 L40,102.5" fill="white" font-size="4"/>
  <!-- White shirt -->
  <rect x="50" y="88" width="20" height="60" rx="2" fill="#f0f0f0"/>
  <polygon points="60,92 55,124 65,124" fill="#cc2222"/>
  <!-- Neck thick -->
  <rect x="49" y="76" width="22" height="16" rx="5" fill="#c89060"/>
  <!-- Head large -->
  <ellipse cx="60" cy="60" rx="28" ry="27" fill="#c89060" filter="url(#sh-erdogan)"/>
  <!-- Dark hair receding -->
  <path d="M32,48 Q34,28 60,26 Q86,28 88,48 Q82,30 60,30 Q38,30 32,48 Z" fill="#1a1a1a"/>
  <!-- Thick moustache authoritarian -->
  <path d="M46,74 Q53,70 60,72 Q67,70 74,74 Q67,78 60,76 Q53,78 46,74 Z" fill="#1a1a1a"/>
  <!-- Eyes authoritarian calm -->
  <ellipse cx="49" cy="60" rx="6" ry="4" fill="white"/>
  <ellipse cx="71" cy="60" rx="6" ry="4" fill="white"/>
  <circle cx="50" cy="61" r="3" fill="#2a1a0a"/>
  <circle cx="72" cy="61" r="3" fill="#2a1a0a"/>
  <circle cx="51" cy="60" r="1" fill="white"/>
  <circle cx="73" cy="60" r="1" fill="white"/>
  <!-- Eyebrows heavy strong -->
  <path d="M43,53 Q49,51 55,53" stroke="#1a1a1a" stroke-width="3.5" fill="none"/>
  <path d="M65,53 Q71,51 77,53" stroke="#1a1a1a" stroke-width="3.5" fill="none"/>
  <!-- Nose prominent -->
  <ellipse cx="60" cy="68" rx="6" ry="5" fill="#a87050"/>
  <!-- Menacing calm mouth above moustache -->
  <path d="M50,70 Q60,72 70,70" stroke="#6a3010" stroke-width="2" fill="none"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── CHAVEZ */
  chavez: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-chavez" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Oil barrel next to him -->
  <rect x="82" y="122" width="24" height="30" rx="4" fill="#2a2a2a" filter="url(#sh-chavez)"/>
  <ellipse cx="94" cy="122" rx="12" ry="5" fill="#3a3a3a"/>
  <ellipse cx="94" cy="152" rx="12" ry="5" fill="#3a3a3a"/>
  <line x1="82" y1="130" x2="106" y2="130" stroke="#444" stroke-width="2"/>
  <line x1="82" y1="138" x2="106" y2="138" stroke="#444" stroke-width="2"/>
  <text x="86" y="136" font-size="5" fill="#FFD700" font-family="Arial">OIL</text>
  <!-- Military uniform red beret -->
  <path d="M26,48 Q28,28 60,26 Q92,28 94,48 Q86,34 60,32 Q34,34 26,48 Z" fill="#cc2222" filter="url(#sh-chavez)"/>
  <!-- Military body -->
  <rect x="24" y="88" width="60" height="60" rx="6" fill="#4a3a2a" filter="url(#sh-chavez)"/>
  <!-- Military decorations -->
  <circle cx="34" cy="96" r="5" fill="#FFD700"/>
  <circle cx="46" cy="96" r="5" fill="#cc4422"/>
  <circle cx="34" cy="108" r="4" fill="#cc4422"/>
  <!-- Neck -->
  <rect x="48" y="76" width="20" height="15" rx="4" fill="#8a5a2a"/>
  <!-- Head -->
  <ellipse cx="58" cy="60" rx="26" ry="26" fill="#8a5a2a" filter="url(#sh-chavez)"/>
  <!-- Hair dark under beret -->
  <path d="M32,50 Q34,38 58,36 Q82,38 84,50" fill="#2a1a0a"/>
  <!-- Eyes populist fire -->
  <ellipse cx="48" cy="60" rx="6" ry="5" fill="white"/>
  <ellipse cx="68" cy="60" rx="6" ry="5" fill="white"/>
  <circle cx="49" cy="61" r="3.5" fill="#2a1a0a"/>
  <circle cx="69" cy="61" r="3.5" fill="#2a1a0a"/>
  <circle cx="50" cy="60" r="1.2" fill="white"/>
  <circle cx="70" cy="60" r="1.2" fill="white"/>
  <!-- Eyebrows passionate -->
  <path d="M42,53 Q48,50 54,53" stroke="#2a1a0a" stroke-width="3" fill="none"/>
  <path d="M62,53 Q68,50 74,53" stroke="#2a1a0a" stroke-width="3" fill="none"/>
  <!-- Nose broad -->
  <ellipse cx="58" cy="68" rx="6" ry="5" fill="#6a4a1a"/>
  <!-- Populist passionate open mouth -->
  <path d="M46,76 Q58,88 70,76" fill="#6a2a10" stroke="#4a1a00" stroke-width="1"/>
  <ellipse cx="58" cy="82" rx="9" ry="6" fill="#6a2a10"/>
</svg>`,

  /* ──────────────────────────────────────────────────────────── CASTRO */
  castro: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-castro" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Old rifle -->
  <rect x="82" y="80" width="6" height="70" rx="2" fill="#6a4a1a" filter="url(#sh-castro)"/>
  <rect x="80" y="80" width="10" height="4" rx="1" fill="#8a6a3a"/>
  <rect x="86" y="112" width="6" height="4" rx="1" fill="#5a4010"/>
  <!-- Military fatigues body -->
  <rect x="24" y="88" width="60" height="60" rx="6" fill="#4a5a2a" filter="url(#sh-castro)"/>
  <!-- Camo pattern -->
  <ellipse cx="36" cy="100" rx="7" ry="5" fill="#3a4a1a" opacity="0.6"/>
  <ellipse cx="60" cy="112" rx="6" ry="4" fill="#3a4a1a" opacity="0.6"/>
  <ellipse cx="44" cy="124" rx="5" ry="4" fill="#3a4a1a" opacity="0.6"/>
  <!-- Large cigar -->
  <rect x="66" y="77" width="24" height="5" rx="2" fill="#c8a060"/>
  <circle cx="90" cy="79" r="4" fill="#ff6622" opacity="0.7"/>
  <!-- Neck -->
  <rect x="48" y="76" width="20" height="16" rx="4" fill="#8a5a2a"/>
  <!-- Head with large beard -->
  <ellipse cx="58" cy="60" rx="26" ry="26" fill="#8a5a2a" filter="url(#sh-castro)"/>
  <!-- Hair dark olive beret -->
  <path d="M32,48 Q34,26 58,24 Q82,26 84,48 Q78,30 58,30 Q38,30 32,48 Z" fill="#2a1a0a"/>
  <!-- Big beard covering lower face -->
  <path d="M32,64 Q34,88 58,92 Q82,88 84,64 Q76,80 58,82 Q40,80 32,64 Z" fill="#2a1a0a"/>
  <!-- Beard texture lines -->
  <path d="M36,70 Q40,76 38,82" stroke="#3a2a0a" stroke-width="1.5" fill="none"/>
  <path d="M80,70 Q76,76 78,82" stroke="#3a2a0a" stroke-width="1.5" fill="none"/>
  <!-- Eyes revolutionary veteran -->
  <ellipse cx="48" cy="58" rx="6" ry="4" fill="white"/>
  <ellipse cx="68" cy="58" rx="6" ry="4" fill="white"/>
  <circle cx="49" cy="59" r="3" fill="#2a1a0a"/>
  <circle cx="69" cy="59" r="3" fill="#2a1a0a"/>
  <circle cx="50" cy="58" r="1" fill="white"/>
  <circle cx="70" cy="58" r="1" fill="white"/>
  <!-- Eyebrows heavy -->
  <path d="M42,52 Q48,49 54,52" stroke="#2a1a0a" stroke-width="3" fill="none"/>
  <path d="M62,52 Q68,49 74,52" stroke="#2a1a0a" stroke-width="3" fill="none"/>
  <!-- Nose -->
  <ellipse cx="58" cy="65" rx="5" ry="4" fill="#6a4a1a"/>
</svg>`,

  /* ─────────────────────────────────────────────────────────── WARREN */
  warren: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
  <defs>
    <filter id="sh-warren" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="3" stdDeviation="3" flood-color="#00000055"/>
    </filter>
  </defs>
  <!-- Thick stack of policy papers -->
  <rect x="76" y="108" width="30" height="36" rx="3" fill="white" filter="url(#sh-warren)"/>
  <rect x="78" y="110" width="26" height="34" rx="2" fill="#f8f8f8"/>
  <line x1="80" y1="116" x2="102" y2="116" stroke="#aaa" stroke-width="1"/>
  <line x1="80" y1="120" x2="102" y2="120" stroke="#aaa" stroke-width="1"/>
  <line x1="80" y1="124" x2="102" y2="124" stroke="#aaa" stroke-width="1"/>
  <line x1="80" y1="128" x2="102" y2="128" stroke="#aaa" stroke-width="1"/>
  <line x1="80" y1="132" x2="102" y2="132" stroke="#aaa" stroke-width="1"/>
  <rect x="76" y="104" width="30" height="6" rx="2" fill="#2244aa"/>
  <text x="78" y="110" font-size="4" fill="white" font-family="Arial">PLAN FOR</text>
  <!-- Power suit body blue -->
  <rect x="26" y="88" width="52" height="60" rx="6" fill="#2244aa" filter="url(#sh-warren)"/>
  <!-- White blouse -->
  <rect x="46" y="88" width="16" height="60" rx="2" fill="#f0f0f0"/>
  <!-- Glasses on nose -->
  <!-- Neck -->
  <rect x="48" y="78" width="18" height="13" rx="4" fill="#d4a080"/>
  <!-- Head -->
  <ellipse cx="57" cy="60" rx="26" ry="26" fill="#d4a080" filter="url(#sh-warren)"/>
  <!-- Blonde-grey hair bob -->
  <path d="M31,48 Q33,26 57,24 Q81,26 83,48 Q77,28 57,28 Q37,28 31,48 Z" fill="#c0a860"/>
  <path d="M31,52 Q31,68 33,76" fill="#b0986a"/>
  <path d="M83,52 Q83,68 81,76" fill="#b0986a"/>
  <!-- Glasses -->
  <rect x="40" y="57" width="14" height="9" rx="3" fill="none" stroke="#4a3a2a" stroke-width="1.5"/>
  <rect x="57" y="57" width="14" height="9" rx="3" fill="none" stroke="#4a3a2a" stroke-width="1.5"/>
  <line x1="54" y1="61" x2="57" y2="61" stroke="#4a3a2a" stroke-width="1.5"/>
  <!-- Eyes determined behind glasses -->
  <circle cx="47" cy="62" r="3" fill="#3a2a1a"/>
  <circle cx="64" cy="62" r="3" fill="#3a2a1a"/>
  <circle cx="48" cy="61" r="1" fill="white"/>
  <circle cx="65" cy="61" r="1" fill="white"/>
  <!-- Eyebrows determined -->
  <path d="M40,55 Q47,52 54,55" stroke="#8a6a40" stroke-width="2" fill="none"/>
  <path d="M57,55 Q64,52 71,55" stroke="#8a6a40" stroke-width="2" fill="none"/>
  <!-- Nose -->
  <ellipse cx="57" cy="70" rx="4" ry="4" fill="#c08060"/>
  <!-- Determined expression -->
  <path d="M47,79 Q57,83 67,79" stroke="#7a4020" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`,

};

// Inject svgEl back into POLS array
if (window.PBData && window.PBData.POLS) {
  window.PBData.POLS.forEach(p => {
    p.svgEl = window.PBData.AVATARS[p.id] || null;
  });
}
