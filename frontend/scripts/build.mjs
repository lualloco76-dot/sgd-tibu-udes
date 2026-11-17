// Vite also loads .env from development machines. Explicit process defaults keep
// portable/Render builds on the serving origin unless the builder selects an API.
process.env.VITE_API_URL ||= process.env.REACT_APP_API_URL || '/api';
process.env.REACT_APP_API_URL ||= process.env.VITE_API_URL;
const { build } = await import('vite');
await build();
