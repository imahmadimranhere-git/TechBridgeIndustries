// Identical copy of server/src/utils/stampSvg.js so the Settings preview matches the PDFs
const escapeXml = (value = '') =>
  String(value).replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]
  );

const SAFE_COLOR = /^#[0-9a-fA-F]{3,8}$/;

function fitFontSize(text, arcLength, { max, min = 7, charWidth = 0.7 }) {
  if (!text) return max;
  return Math.max(min, Math.min(max, arcLength / (text.length * charWidth)));
}

function starPoints(cx, cy, outer, inner, spikes = 5) {
  const points = [];
  for (let i = 0; i < spikes * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(' ');
}

export function generateStampSvg({ companyName = '', city = '', country = '', color = '#1d4ed8', size = 200 } = {}) {
  const ink = SAFE_COLOR.test(color) ? color : '#1d4ed8';
  const topText = companyName.trim().toUpperCase();
  const bottomText = [city, country]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' \u2022 ')
    .toUpperCase();

  const topSize = fitFontSize(topText, Math.PI * 70 * 0.92, { max: 15 });
  const bottomSize = fitFontSize(bottomText, Math.PI * 80 * 0.7, { max: 11 });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200">
  <defs>
    <path id="stamp-top" d="M 30,100 A 70,70 0 1,1 170,100"/>
    <path id="stamp-bottom" d="M 20,100 A 80,80 0 0,0 180,100"/>
  </defs>
  <g transform="rotate(-8 100 100)" opacity="0.85">
    <g fill="none" stroke="${ink}">
      <circle cx="100" cy="100" r="95" stroke-width="3.5"/>
      <circle cx="100" cy="100" r="88" stroke-width="1.2"/>
      <circle cx="100" cy="100" r="58" stroke-width="1.2"/>
    </g>
    <g fill="${ink}" font-family="Arial, Helvetica, sans-serif" font-weight="700">
      <text font-size="${topSize.toFixed(1)}" letter-spacing="1.5" text-anchor="middle">
        <textPath href="#stamp-top" startOffset="50%">${escapeXml(topText)}</textPath>
      </text>
      <text font-size="${bottomSize.toFixed(1)}" letter-spacing="1.2" text-anchor="middle">
        <textPath href="#stamp-bottom" startOffset="50%">${escapeXml(bottomText)}</textPath>
      </text>
      <circle cx="25" cy="100" r="3"/>
      <circle cx="175" cy="100" r="3"/>
      <polygon points="${starPoints(100, 100, 24, 10)}"/>
    </g>
  </g>
</svg>`;
}