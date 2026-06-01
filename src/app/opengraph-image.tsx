import { ImageResponse } from 'next/og';

export const alt = 'HabadLyon — Événements, dons & horaires de Chabbat';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #2C1810 0%, #4A2E18 100%)',
          color: '#FAF7F2',
          fontFamily: 'serif',
        }}
      >
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #C9A96E, #9A7A3A)',
            color: '#2C1810',
            fontSize: 64,
            fontWeight: 700,
            marginBottom: 36,
          }}
        >
          H
        </div>
        <div style={{ fontSize: 84, fontWeight: 300, letterSpacing: -1 }}>HabadLyon</div>
        <div style={{ fontSize: 34, color: '#C9A96E', marginTop: 16 }}>
          Événements · Dons · Horaires de Chabbat
        </div>
      </div>
    ),
    { ...size },
  );
}
