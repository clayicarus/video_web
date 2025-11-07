/*
  配置和常量
*/
const CONFIG = window.APP_CONFIG || {};
const BROWSE_ROOT = normalizeRoot(CONFIG.BROWSE_ROOT || '/files/');

const VIDEO_EXTS = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.m4v'];
const HLS_EXTS = ['.m3u8'];

function normalizeRoot(root) {
  if (!root.startsWith('/')) root = '/' + root;
  if (!root.endsWith('/')) root += '/';
  return root;
}

// 导出到全局
window.AppConfig = {
  BROWSE_ROOT,
  VIDEO_EXTS,
  HLS_EXTS
};

