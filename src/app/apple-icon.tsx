import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
          background: 'linear-gradient(135deg,#2C1810,#4A2E18)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: 28,
            background: 'linear-gradient(135deg,#E8C97E,#C9A96E,#9A7A3A)',
            color: '#2C1810',
            fontSize: 84,
            fontWeight: 700,
            fontFamily: 'Georgia, serif',
          }}
        >
          H
        </div>
      </div>
    ),
    { ...size }
  );
}
