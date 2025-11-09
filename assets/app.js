/*
  主应用入口
  整合所有模块，处理 UI 交互和路由
*/
(function () {
  // DOM 元素
  const fileListEl = document.getElementById('file-list');
  const emptyTipEl = document.getElementById('empty-tip');
  const breadcrumbsEl = document.getElementById('breadcrumbs');
  const refreshBtn = document.getElementById('refresh');
  const searchEl = document.getElementById('search');

  // 导入模块
  const { getHashPath, setHashPath, joinUrl, isVideoByLower, isHlsByLower } = window.AppUtils;
  const { fetchDirectory } = window.DirectoryModule;
  const { playVideo, stopVideo, showError, clearError } = window.VideoModule;

  // 防止重复加载
  let isLoading = false;

  // ========== UI 渲染 ==========
  
  // 渲染面包屑导航
  function renderBreadcrumbs(relPath) {
    breadcrumbsEl.innerHTML = '';
    const parts = relPath.split('/').filter(Boolean);

    const rootLink = document.createElement('a');
    rootLink.href = '#/';
    rootLink.textContent = '根目录';
    rootLink.addEventListener('click', interceptHashNav);
    breadcrumbsEl.appendChild(rootLink);

    let acc = '/';
    for (let i = 0; i < parts.length; i++) {
      const sep = document.createElement('span');
      sep.textContent = ' / ';
      breadcrumbsEl.appendChild(sep);
      acc = joinUrl(acc, parts[i]);
      const link = document.createElement('a');
      link.href = '#' + acc;
      link.textContent = parts[i];
      link.addEventListener('click', interceptHashNav);
      breadcrumbsEl.appendChild(link);
    }
  }

  // 渲染文件列表
  function renderList(items, filterText) {
    fileListEl.innerHTML = '';
    const keyword = (filterText || '').trim().toLowerCase();
    let shown = 0;

    for (const item of items) {
      const nameLower = item.name.toLowerCase();
      if (keyword && !nameLower.includes(keyword)) continue;

      const li = document.createElement('li');
      li.dataset.href = item.href;
      li.dataset.type = item.isDirectory ? 'dir' : 'file';
      li.title = item.name;

      // 标签
      const tag = document.createElement('span');
      tag.className = 'tag';
      if (item.isParent) {
        tag.textContent = '上级';
      } else if (item.isDirectory) {
        tag.textContent = '目录';
      } else if (isHlsByLower(item.normLowerName)) {
        tag.textContent = 'HLS';
      } else if (isVideoByLower(item.normLowerName)) {
        tag.textContent = '视频';
      } else {
        tag.textContent = '文件';
      }

      // 文件名
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = item.name;

      // 占位符
      const size = document.createElement('span');
      size.className = 'size';
      size.textContent = '';

      li.appendChild(tag);
      li.appendChild(name);
      li.appendChild(size);

      // 点击事件
      li.addEventListener('click', () => {
        if (item.isDirectory || item.isParent) {
          setHashPath(item.relPath);
        } else if (isVideoByLower(item.normLowerName) || isHlsByLower(item.normLowerName)) {
          playVideo(item.href, item.name);
        } else {
          window.open(item.href, '_blank');
        }
      });

      fileListEl.appendChild(li);
      shown++;
    }

    emptyTipEl.hidden = shown > 0;
  }

  // ========== 路由和导航 ==========
  
  function interceptHashNav(e) {
    e.preventDefault();
    const hash = e.currentTarget.getAttribute('href');
    const p = (hash || '').replace(/^#/, '');
    setHashPath(p);
  }

  async function loadCurrentDirectory() {
    // 防止重复调用
    if (isLoading) {
      console.log('⏸️ 已有加载任务进行中，跳过');
      return;
    }
    
    isLoading = true;
    
    try {
      clearError();

      const relPath = getHashPath();
      renderBreadcrumbs(relPath);
      
      const absPath = window.AppUtils.relToAbs(relPath);
      
      try {
        const items = await fetchDirectory(absPath);
        renderList(items, searchEl.value);
      } catch (err) {
        showError(err.message);
      }
    } finally {
      isLoading = false;
    }
  }

  // ========== 事件绑定 ==========
  
  // Hash 变化时重新加载目录（确保只绑定一次）
  if (!window.__hashChangeListenerBound) {
    window.addEventListener('hashchange', loadCurrentDirectory);
    window.__hashChangeListenerBound = true;
  }

  // 刷新当前目录
  refreshBtn.addEventListener('click', () => {
    console.log('🔄 手动刷新目录');
    loadCurrentDirectory();
  });

  // 搜索过滤
  searchEl.addEventListener('input', () => {
    const lis = Array.from(fileListEl.querySelectorAll('li'));
    const keyword = searchEl.value.trim().toLowerCase();
    let shown = 0;

    for (const li of lis) {
      const name = li.querySelector('.name').textContent.toLowerCase();
      const match = !keyword || name.includes(keyword);
      li.style.display = match ? '' : 'none';
      if (match) shown++;
    }

    emptyTipEl.hidden = shown > 0;
  });

  // ========== 初始化 ==========
  
  // 首次加载
  (function init() {
    const hash = window.location.hash;
    if (!hash || hash === '#') {
      // 设置默认 hash，会触发 hashchange 事件，从而调用 loadCurrentDirectory
      window.location.hash = '#/';
    } else {
      // 已有 hash，手动加载一次
      loadCurrentDirectory();
    }
  })();
})();
