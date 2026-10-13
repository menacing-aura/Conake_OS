import React from 'react';

export const MinimalistWallpaper: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" className="w-full h-full object-cover">
    <rect width="1920" height="1080" fill="#101820" />
    <path d="M0 770 630 300l420 300 420-390 450 350v520H0z" fill="#173b43" />
    <path d="m0 900 580-370 390 270 390-350 560 390v240H0z" fill="#205d62" />
    <path d="m0 1010 610-310 420 210 370-230 520 260v140H0z" fill="#68d5bb" />
    <circle cx="1480" cy="250" r="92" fill="#e5c77a" />
  </svg>
);

export const MoonlitWallpaper: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" className="w-full h-full object-cover">
    <defs>
      <linearGradient id="moonlit_sky" x2="0" y2="1">
        <stop stopColor="#101b35" />
        <stop offset=".58" stopColor="#234a66" />
        <stop offset="1" stopColor="#5a8290" />
      </linearGradient>
      <linearGradient id="moonlit_water" x2="0" y2="1">
        <stop stopColor="#315c70" />
        <stop offset="1" stopColor="#122b42" />
      </linearGradient>
      <linearGradient id="moonlit_jacket" x2="1" y2="1">
        <stop stopColor="#70d8cb" />
        <stop offset="1" stopColor="#398e9b" />
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#moonlit_sky)" />
    <circle cx="1450" cy="250" r="92" fill="#f4e5bd" />
    <circle cx="1488" cy="214" r="84" fill="#182843" />
    <g fill="#f6edda" opacity=".82">
      <circle cx="210" cy="150" r="3" /><circle cx="382" cy="270" r="2" />
      <circle cx="560" cy="135" r="3" /><circle cx="780" cy="228" r="2" />
      <circle cx="985" cy="115" r="2" /><circle cx="1190" cy="310" r="3" />
      <circle cx="1660" cy="405" r="2" /><circle cx="1760" cy="170" r="3" />
      <circle cx="900" cy="370" r="2" /><circle cx="310" cy="440" r="2" />
    </g>
    <path d="M0 570 230 390l195 157 220-233 205 244 190-161 184 190 195-190 214 181 287-220v365H0z" fill="#29445d" />
    <path d="M0 625q270-84 480 5t452-8q350-97 988 16v190H0z" fill="#1b3a53" />
    <path d="M0 754h1920v326H0z" fill="url(#moonlit_water)" />
    <path d="M1220 755h460l-68 21h-326zm104 58h267l-45 14h-194zm-220 76h608l-86 13h-446zm176 73h392l-50 12h-294zm-280 70h754l-96 13h-562z" fill="#8dcac4" opacity=".38" />
    <g fill="#17263e">
      <path d="M0 670h80v205H0zm98-76h68v251H98zm85 44h102v207H183zm-58-87h55v42h-55z" />
      <path d="M1680 628h74v210h-74zm93-78h95v290h-95zm112 45h35v245h-35z" />
    </g>
    <g fill="#f4c88b" opacity=".85">
      <path d="M110 625h17v22h-17zm29 0h17v22h-17zm-29 37h17v22h-17zm98-1h20v24h-20zm31 0h20v24h-20z" />
      <path d="M1795 587h22v28h-22zm36 0h22v28h-22zm-36 44h22v28h-22zm88-6h18v24h-18z" />
    </g>
    <g transform="translate(900 540)">
      <path d="M-142 540q9-145 52-218 34-54 90-55 68 0 104 62 39 68 48 211z" fill="url(#moonlit_jacket)" />
      <path d="M-76 322q-51-51-45-139 8-113 115-130 99-16 135 70 28 69-10 147l-7 49-59-8-90 9z" fill="#152640" />
      <path d="M-102 185q33-103 124-100 61 2 96 58-68-30-120-4-45 22-100 46z" fill="#283d5b" />
      <path d="M-76 309l-39 50-24-99q-12-69 18-132 8 99 45 181zm161-3 38 46 25-99q11-65-22-125 5 97-41 178z" fill="#111e35" />
      <path d="M-59 335q55 31 112 1l31 47q-89 51-176 0z" fill="#d4a7a2" />
      <path d="M-53 405q53 34 106 0l-12 131h-85z" fill="#e9c4a4" />
      <path d="M-17 411h18v102h-18z" fill="#658b9b" />
    </g>
    <path d="M0 927q350-90 680-4t620 0q310-72 620 15v142H0z" fill="#11243a" />
    <g fill="#b4eee0" opacity=".7">
      <circle cx="680" cy="863" r="3" /><circle cx="1115" cy="927" r="2" />
      <circle cx="1245" cy="815" r="3" /><circle cx="530" cy="995" r="2" />
    </g>
  </svg>
);

export const SakuraWallpaper: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" className="w-full h-full object-cover">
    <defs>
      <linearGradient id="sakura_sky" x2="0" y2="1">
        <stop stopColor="#18243f" />
        <stop offset=".48" stopColor="#765477" />
        <stop offset="1" stopColor="#f19b8e" />
      </linearGradient>
      <radialGradient id="sakura_sun">
        <stop stopColor="#fff4d2" stopOpacity=".9" />
        <stop offset="1" stopColor="#ffc7a6" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="sakura_coat" x2="1" y2="1">
        <stop stopColor="#e98983" />
        <stop offset="1" stopColor="#9e5575" />
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#sakura_sky)" />
    <circle cx="1370" cy="345" r="250" fill="url(#sakura_sun)" />
    <circle cx="1370" cy="345" r="82" fill="#ffe6c8" />
    <g fill="#fff0dc" opacity=".72">
      <circle cx="250" cy="180" r="3" /><circle cx="426" cy="270" r="2" />
      <circle cx="690" cy="132" r="3" /><circle cx="934" cy="230" r="2" />
      <circle cx="1120" cy="120" r="2" /><circle cx="1585" cy="150" r="3" />
      <circle cx="1740" cy="275" r="2" /><circle cx="795" cy="335" r="2" />
    </g>
    <path d="M0 650 250 410l170 155 290-330 260 330 205-210 240 255 200-180 305 255v395H0z" fill="#394568" />
    <path d="m570 354 140-119 117 150-93-44-44 36-42-21-43 29zM1195 430l220-201 190 228-129-58-65 35-58-33-56 45z" fill="#e8a7a6" opacity=".78" />
    <path d="M0 690q270-160 530-34t520 0q300-140 870 44v380H0z" fill="#384d63" />
    <path d="M0 800q340-166 685-45t624-27q300-88 611 35v317H0z" fill="#263c53" />
    <path d="M0 941q270-92 561-35t544-13q380-88 815 15v202H0z" fill="#192d43" />
    <g fill="#ffd5ba" opacity=".82">
      <path d="M1090 704q13-19 26 0-13 19-26 0m26 0q13-19 26 0-13 19-26 0m-13-13q13-19 26 0-13 19-26 0m0 26q13-19 26 0-13 19-26 0" />
      <path d="M1215 758q11-16 22 0-11 16-22 0m22 0q11-16 22 0-11 16-22 0m-11-11q11-16 22 0-11 16-22 0" />
    </g>
    <g transform="translate(1440 565)">
      <path d="M-122 515q13-147 45-208l59-34 67 6 55 37q48 64 61 199z" fill="url(#sakura_coat)" />
      <path d="M-57 315q-72-31-74-116-3-90 75-122 97-40 153 25 49 58 13 143-27 64-104 80z" fill="#17243b" />
      <path d="M-67 169q11-72 81-75 72 0 94 66-50-27-98-8-35 14-77 17z" fill="#26304a" />
      <path d="M-83 202q-18 93 17 152l-41 42q-47-95-13-207zM75 187q34 104-13 174l43 39q52-107 9-223z" fill="#101b31" />
      <path d="M-48 310q46 27 94 0l35 43q-78 63-160 2z" fill="#f2b5a6" />
      <path d="M-85 384q86 53 170 0l-22 131H-59z" fill="#6d4868" opacity=".82" />
      <path d="M-18 388h20v100h-20z" fill="#ffd4b2" opacity=".8" />
    </g>
    <g fill="#f2a8aa" opacity=".9">
      <path d="M340 740q13-19 26 0-13 19-26 0m26 0q13-19 26 0-13 19-26 0m-13-13q13-19 26 0-13 19-26 0" />
      <path d="M1780 610q13-19 26 0-13 19-26 0m26 0q13-19 26 0-13 19-26 0m-13-13q13-19 26 0-13 19-26 0" />
    </g>
  </svg>
);

export const ConakeLogoIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 44 46" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M22 0L44 12V34L22 46L0 34V12L22 0Z" fill="#68d5bb" />
    <path d="M15 15H29V22H15V15Z" fill="#101820" />
    <path d="M15 27H29V34H15V27Z" fill="#101820" />
  </svg>
);
