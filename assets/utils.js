/*
  工具函数
*/

// URL 路径处理
function joinUrl(base, seg) {
  if (!base.endsWith('/')) base += '/';
  return base + seg.replace(/^\//, '');
}

function ensureLeadingSlash(p) {
  return p.startsWith('/') ? p : '/' + p;
}

function ensureTrailingSlash(p) {
  return p.endsWith('/') ? p : p + '/';
}

function lastSegment(p) {
  const s = p.replace(/\/$/, '').split('/');
  return s[s.length - 1] || '';
}

// 绝对路径与相对路径转换
function absToRel(absPath) {
  try {
    if (!absPath.startsWith('/')) absPath = '/' + absPath;
    if (!absPath.startsWith(window.AppConfig.BROWSE_ROOT)) return '/';
    const rest = absPath.slice(window.AppConfig.BROWSE_ROOT.length);
    return '/' + rest;
  } catch (_) {
    return '/';
  }
}

function relToAbs(relPath) {
  relPath = ensureLeadingSlash(relPath);
  return joinUrl(window.AppConfig.BROWSE_ROOT, relPath);
}

// Hash 路径处理
function getHashPath() {
  const h = window.location.hash || '';
  let p = h.replace(/^#/, '');
  if (p === '') p = '/';
  if (!p.startsWith('/')) p = '/' + p;
  // 目录一律以 / 结尾
  if (!/[.][^/]+$/.test(p)) p = ensureTrailingSlash(p);
  return p;
}

function setHashPath(relPath) {
  // 规范化目标路径
  relPath = ensureLeadingSlash(relPath);
  if (!/[.][^/]+$/.test(relPath)) relPath = ensureTrailingSlash(relPath);
  
  // 规范化当前 hash 进行比较，防止循环
  let currentHash = window.location.hash.replace(/^#/, '') || '/';
  currentHash = ensureLeadingSlash(currentHash);
  if (!/[.][^/]+$/.test(currentHash)) currentHash = ensureTrailingSlash(currentHash);
  
  // 比较规范化后的路径
  if (currentHash === relPath) {
    return; // 已经是目标路径，不需要修改
  }
  
  window.location.hash = '#' + relPath;
}

// 文件类型判断
function isVideoFile(name) {
  const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
  return window.AppConfig.VIDEO_EXTS.includes(ext);
}

function isHlsFile(name) {
  const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
  return window.AppConfig.HLS_EXTS.includes(ext);
}

function isVideoByLower(lower) {
  return window.AppConfig.VIDEO_EXTS.some(ext => lower.endsWith(ext));
}

function isHlsByLower(lower) {
  return window.AppConfig.HLS_EXTS.some(ext => lower.endsWith(ext));
}

function getLowercaseNameFromAbsPath(absPath) {
  const seg = lastSegment(absPath);
  try {
    return decodeURIComponent(seg).toLowerCase();
  } catch (_) {
    return seg.toLowerCase();
  }
}

// 导出到全局
window.AppUtils = {
  joinUrl,
  ensureLeadingSlash,
  ensureTrailingSlash,
  lastSegment,
  absToRel,
  relToAbs,
  getHashPath,
  setHashPath,
  isVideoFile,
  isHlsFile,
  isVideoByLower,
  isHlsByLower,
  getLowercaseNameFromAbsPath
};

