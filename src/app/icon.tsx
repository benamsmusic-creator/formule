import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg,#C9A96E,#9A7A3A)',
          color: '#FAF7F2',
          fontSize: 22,
          fontWeight: 700,
          fontFamily: 'Georgia, serif',
          borderRadius: 7,
        }}
      >
        H
      </div>
    ),
    { ...size }
  );
}
