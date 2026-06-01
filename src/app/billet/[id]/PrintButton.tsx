'use client';

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden text-sm text-brown-500 hover:text-brown-900 border border-beige-200 px-4 py-2 rounded-xl hover:bg-beige-100 transition-colors"
    >
      🖨️ Imprimer / PDF
    </button>
  );
}
