/*
  目录浏览功能
*/
(function() {
  const { BROWSE_ROOT } = window.AppConfig;
  const { 
    absToRel, 
    ensureTrailingSlash, 
    lastSegment, 
    getLowercaseNameFromAbsPath,
    isVideoFile,
    isHlsFile,
    isVideoByLower,
    isHlsByLower
  } = window.AppUtils;

  // 解析 autoindex HTML
  function parseAutoIndex(html, baseAbsPath) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const links = Array.from(doc.querySelectorAll('a'));
    const items = [];

    for (const a of links) {
      const href = a.getAttribute('href');
      if (!href) continue;
      if (href.startsWith('?') || href.startsWith('#')) continue;

      const text = (a.textContent || '').trim();
      if (text === '.' || text === './') continue;

      // 解析成绝对路径
      let absPath;
      try {
        const u = new URL(href, window.location.origin + baseAbsPath);
        absPath = u.pathname;
      } catch (_) {
        continue;
      }

      // 限制在 BROWSE_ROOT 下
      if (!absPath.startsWith(BROWSE_ROOT)) {
        const isParentLike = text === '..' || text === '../' || href === '../';
        if (!isParentLike) continue;
        absPath = BROWSE_ROOT;
      }

      const isDir = absPath.endsWith('/');
      const relPath = isDir ? ensureTrailingSlash(absToRel(absPath)) : absToRel(absPath);
      const isParent = text === '..' || text === '../' || href === '../';

      // 从路径中获取文件名
      let name;
      if (isParent) {
        name = '..';
      } else {
        name = lastSegment(absPath);
        if (isDir) {
          name = name || lastSegment(absPath.slice(0, -1));
        }
        try { name = decodeURIComponent(name); } catch (_) {}
      }

      // 过滤掉 .aria2 临时文件
      if (!isDir && !isParent && name.endsWith('.aria2')) {
        continue;
      }

      const normLowerName = getLowercaseNameFromAbsPath(absPath);

      items.push({
        name,
        isDirectory: isDir,
        isParent,
        relPath,
        href: absPath,
        normLowerName
      });
    }

    // 去重
    const seen = new Set();
    const uniq = [];
    for (const it of items) {
      const key = (it.isDirectory ? 'd' : 'f') + '|' + it.relPath + '|' + it.name;
      if (seen.has(key)) continue;
      seen.add(key);
      uniq.push(it);
    }

    // 排序：上级、目录、文件
    uniq.sort((a, b) => {
      if (a.isParent && !b.isParent) return -1;
      if (!a.isParent && b.isParent) return 1;
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name, 'zh');
    });

    return uniq;
  }

  // 获取目录数据
  async function fetchDirectory(absPath) {
    try {
      const res = await fetch(absPath, { headers: { 'Accept': 'text/html' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      return parseAutoIndex(html, absPath);
    } catch (err) {
      throw new Error('目录读取失败：' + (err && err.message ? err.message : String(err)));
    }
  }

  // 导出到全局
  window.DirectoryModule = {
    parseAutoIndex,
    fetchDirectory
  };
})();

