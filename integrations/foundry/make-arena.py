"""Original vector test arena, aligned with the Foundry grid (no paid assets)."""
import pathlib, random
random.seed(47)
p=pathlib.Path(__file__).parent/'noma-roguelite/assets/arena.svg'
parts=['''<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000">
<defs><radialGradient id="floor"><stop stop-color="#383b40"/><stop offset="1" stop-color="#171b22"/></radialGradient><radialGradient id="halo"><stop stop-color="#ca9d50" stop-opacity=".35"/><stop offset="1" stop-color="#bd8545" stop-opacity="0"/></radialGradient><linearGradient id="wall" x2="1" y2="1"><stop stop-color="#686357"/><stop offset=".4" stop-color="#393b3e"/><stop offset="1" stop-color="#131923"/></linearGradient><filter id="grain"><feTurbulence baseFrequency=".35" numOctaves="3" seed="8" result="n"/><feColorMatrix type="saturate" values="0"/><feBlend in="SourceGraphic" mode="soft-light"/></filter><pattern id="stars" width="90" height="90" patternUnits="userSpaceOnUse"><circle cx="13" cy="29" r=".8" fill="#8b959d" opacity=".3"/></pattern></defs>
<rect width="1600" height="1000" fill="#080c13"/><rect width="1600" height="1000" fill="url(#stars)"/>
<rect x="175" y="75" width="1250" height="850" rx="8" fill="#05080d" stroke="#725e3c" stroke-width="3"/>
<rect x="200" y="100" width="1200" height="800" fill="url(#floor)"/>
''']
for row in range(8):
    for col in range(12):
        shade=random.randint(31,45)
        parts.append(f'<rect x="{200+col*100+2}" y="{100+row*100+2}" width="96" height="96" rx="3" fill="rgb({shade},{shade+3},{shade+7})" stroke="#646158" stroke-opacity=".2"/>')
parts.append('<g fill="none" stroke="#9c8050" opacity=".37"><circle cx="850" cy="500" r="220" stroke-width="2"/><circle cx="850" cy="500" r="210"/><circle cx="850" cy="500" r="150" stroke-dasharray="3 15"/><path d="M850 310L1015 595H685Z M850 690L685 405H1015Z"/><circle cx="850" cy="500" r="70"/></g>')
for x,y in [(650,250),(650,750),(1050,250),(1050,750)]:
    parts.append(f'<rect x="{x+8}" y="{y+10}" width="76" height="76" fill="#000" opacity=".5"/><rect x="{x}" y="{y}" width="70" height="70" fill="url(#wall)" stroke="#797060" stroke-width="3"/><rect x="{x+10}" y="{y+10}" width="50" height="50" fill="#34363a" stroke="#9c8b65" stroke-opacity=".5"/><path d="M{x+35} {y+16}L{x+53} {y+35}L{x+35} {y+54}L{x+17} {y+35}Z" fill="none" stroke="#b6995e"/>')
for x,y in [(350,200),(1250,200),(350,800),(1250,800)]:
    parts.append(f'<circle cx="{x}" cy="{y}" r="110" fill="url(#halo)"/><circle cx="{x}" cy="{y}" r="16" fill="#181717" stroke="#7f663f" stroke-width="4"/><circle cx="{x}" cy="{y}" r="7" fill="#e8bf70"/>')
parts.append('<g fill="none" stroke="url(#wall)" stroke-width="22"><path d="M200 100H1400V900H200Z"/></g><g stroke="#b29459" opacity=".4"><path d="M210 110H1390V890H210Z" fill="none"/></g>')
for x in [220,1320]:
    for i in range(6):parts.append(f'<rect x="{x}" y="{350+i*48}" width="60" height="40" fill="#38393a" stroke="#6c6453" stroke-opacity=".4"/>')
parts.append('<text x="800" y="52" text-anchor="middle" font-family="Georgia,serif" font-size="15" letter-spacing="8" fill="#9c8459">EL UMBRAL</text><text x="800" y="959" text-anchor="middle" font-family="Georgia,serif" font-size="10" letter-spacing="5" fill="#74644b">N O M A · R O G U E L I T E</text></svg>')
p.write_text(''.join(parts),encoding='utf8')
