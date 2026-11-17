import React from 'react';
const paths = {
  home: 'M3 10 12 3l9 7v10H15v-7H9v7H3Z', search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
  book: 'M12 5v16M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2Z', church: 'M4 21V11l8-6 8 6v10ZM9 21v-7h6v7M12 5V1M10 3h4',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-4m-1-12a4 4 0 0 1 0 8',
  document: 'M14 2H5v20h16V9Zm0 0v7h7M7 13h10M7 17h7', certificate: 'M6 2h12v14H6ZM9 6h6m-6 4h6M8 16l-1 6 5-3 5 3-1-6',
  arrows: 'M3 7h17l-4-4m4 4-4 4M21 17H4l4 4m-4-4 4-4', shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6ZM8 12l3 3 5-6',
  chart: 'M3 3v18h18M7 16v-4m5 4V7m5 9v-7', settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2-6h4l1 3 3 1 3-1 2 4-2 3 1 3-1 3-4 1-3 3h-4l-1-3-3-1-3 1-2-4 2-3-1-3 1-3 4-1Z',
  logout: 'M9 3H4v18h5M9 12h13l-4-4m4 4-4 4', sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
  moon: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10Z', star: 'm12 2 3 6 7 1-5 5 1 8-6-4-6 4 1-8-5-5 7-1Z', plus: 'M12 5v14M5 12h14', arrow: 'M5 12h14m-6-6 6 6-6 6',
  download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5', refresh: 'M20 7a9 9 0 1 0 1 8M20 2v6h-6', check: 'M5 12l4 4L19 6', clock: 'M12 7v5l3 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z', grid: 'M3 3h7v7H3Zm11 0h7v7h-7ZM3 14h7v7H3Zm11 0h7v7h-7Z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h1m-1 6h1m-1 6h1', close: 'm6 6 12 12M6 18 18 6', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm13 0a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z',
  lock: 'M5 10h14v12H5Zm3 0V6a4 4 0 0 1 8 0v4', menu: 'M3 6h18M3 12h18M3 18h18', heart: 'M20 4c-4-3-8 1-8 1s-4-4-8-1-1 8 8 16c9-8 12-13 8-16Z',
};
export default function Icon({ name = 'document', size = 20, className = '', ...props }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} {...props}><path d={paths[name] || paths.document} /></svg>; }
export function BrandMark({ size = 38 }) { return <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="1" y="1" width="46" height="46" rx="14" stroke="currentColor" opacity=".45" /><path d="M24 10v26M16 18h16M12 30c0 6 5 9 12 9 7 0 12-3 12-9M15 29c0 4 3 7 9 7s9-3 9-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>; }
