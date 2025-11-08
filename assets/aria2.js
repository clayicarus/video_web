/*
  Aria2 RPC 功能
*/
(function() {
  // 添加下载任务相关元素
  const testRpcBtn = document.getElementById('test-rpc-btn');
  const testRpcStatus = document.getElementById('test-rpc-status');
  const downloadProgressContainer = document.getElementById('download-progress-container');
  const downloadProgressList = document.getElementById('download-progress-list');
  const addDownloadBtn = document.getElementById('add-download-btn');
  const addDownloadModal = document.getElementById('add-download-modal');
  const addDownloadClose = document.getElementById('add-download-close');
  const downloadUrlInput = document.getElementById('download-url');
  const downloadPathInput = document.getElementById('download-path');
  const downloadFilenameInput = document.getElementById('download-filename');
  const downloadSubmitBtn = document.getElementById('download-submit');
  const downloadStatusEl = document.getElementById('download-status');

  // 轮询相关变量
  let progressInterval = null;

  // ========== 硬编码配置 ==========
  const ARIA2_CONFIG = {
    url: 'http://localhost:6800/jsonrpc',
    secret: '', // 如果需要密钥，在这里填写
    downloadRoot: ".." + window.AppConfig.BROWSE_ROOT
  };

  // ========== RPC 调用 ==========
  async function rpcCall(method, params = []) {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method: method,
      params: ARIA2_CONFIG.secret ? [`token:${ARIA2_CONFIG.secret}`, ...params] : params
    };

    try {
      const request = {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      };
      
      const response = await fetch(ARIA2_CONFIG.url, request);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.error) {
        throw new Error(`Aria2 错误 (${result.error.code}): ${result.error.message}`);
      }

      return result.result;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('无法连接到 Aria2 服务器，请检查服务是否运行');
      }
      throw new Error(err.message || String(err));
    }
  }

  // 测试连接
  async function testConnection() {
    try {
      const version = await rpcCall('aria2.getVersion');
      return { success: true, version: version.version };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // 获取活动下载任务
  async function getActiveDownloads() {
    try {
      const downloads = await rpcCall('aria2.tellActive');
      return downloads || [];
    } catch (err) {
      console.error('获取下载任务失败:', err);
      return [];
    }
  }

  // 格式化文件大小
  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  }

  // 格式化速度
  function formatSpeed(bytesPerSec) {
    return formatSize(bytesPerSec) + '/s';
  }

  // 更新下载进度显示
  async function updateDownloadProgress() {
    const downloads = await getActiveDownloads();
    
    if (downloads.length === 0) {
      // 没有活动下载，隐藏进度区域
      if (downloadProgressContainer) {
        downloadProgressContainer.hidden = true;
      }
      return;
    }

    // 显示进度区域
    if (downloadProgressContainer) {
      downloadProgressContainer.hidden = false;
    }

    // 生成下载项的 HTML
    if (downloadProgressList) {
      downloadProgressList.innerHTML = downloads.map(download => {
        const totalLength = parseInt(download.totalLength) || 0;
        const completedLength = parseInt(download.completedLength) || 0;
        const downloadSpeed = parseInt(download.downloadSpeed) || 0;
        
        const percentage = totalLength > 0 ? Math.round((completedLength / totalLength) * 100) : 0;
        const filename = download.files && download.files[0] && download.files[0].path 
          ? download.files[0].path.split('/').pop() 
          : '下载中...';

        return `
          <div class="download-progress-item">
            <div class="download-filename" title="${filename}">${filename}</div>
            <div class="download-stats">
              <span class="download-percentage">${percentage}% (${formatSize(completedLength)} / ${formatSize(totalLength)})</span>
              <span class="download-speed">${formatSpeed(downloadSpeed)}</span>
            </div>
            <div class="download-progress-bar">
              <div class="download-progress-fill" style="width: ${percentage}%"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // 启动进度监控
  function startProgressMonitor() {
    if (progressInterval) {
      return; // 已经在运行
    }
    
    // 立即执行一次
    updateDownloadProgress();
    
    // 每2秒更新一次
    progressInterval = setInterval(updateDownloadProgress, 2000);
  }

  // 停止进度监控
  function stopProgressMonitor() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    
    if (downloadProgressContainer) {
      downloadProgressContainer.hidden = true;
    }
    if (downloadProgressList) {
      downloadProgressList.innerHTML = '';
    }
  }

  // 发送自定义下载任务（带路径和文件名）
  async function sendCustomDownload(url, dirPath, filename) {
    try {
      const options = {};
      
      // 计算完整的下载目录路径
      let fullDownloadPath = ARIA2_CONFIG.downloadRoot;
      
      if (dirPath && dirPath.trim()) {
        // 清理相对路径：去除前导/后缀斜杠
        const relativePath = dirPath.trim().replace(/^\/+|\/+$/g, '');
        if (relativePath) {
          // 拼接根目录和相对路径
          fullDownloadPath = fullDownloadPath.replace(/\/$/, '') + '/' + relativePath;
        }
      }
      
      options.dir = fullDownloadPath;
      
      // 设置文件名
      if (filename && filename.trim()) {
        options.out = filename.trim();
      }

      console.log('📂 下载配置:', {
        url,
        downloadRoot: ARIA2_CONFIG.downloadRoot,
        relativePath: dirPath,
        fullPath: fullDownloadPath,
        filename: filename || '(使用原文件名)'
      });

      const gid = await rpcCall('aria2.addUri', [[url], options]);
      return { success: true, gid };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  // ========== UI 交互 ==========
  // 添加下载对话框
  function showDownloadStatus(message, isSuccess) {
    downloadStatusEl.textContent = message;
    downloadStatusEl.className = 'status-msg ' + (isSuccess ? 'success' : 'error');
    downloadStatusEl.removeAttribute('hidden');
    downloadStatusEl.style.display = 'block';
  }

  function hideDownloadStatus() {
    downloadStatusEl.setAttribute('hidden', '');
    downloadStatusEl.style.display = 'none';
  }

  function openDownloadModal() {
    // 获取当前浏览目录路径作为默认保存路径（相对路径）
    const currentPath = window.AppUtils ? window.AppUtils.getHashPath() : '/';
    // 转换为相对路径：去除前导和尾部的斜杠
    const relativePath = currentPath === '/' ? '' : currentPath.replace(/^\//, '').replace(/\/$/, '');
    
    downloadPathInput.value = relativePath;
    downloadUrlInput.value = '';
    downloadFilenameInput.value = '';
    
    console.log('📂 打开下载对话框:', {
      currentPath,
      relativePath,
      downloadRoot: ARIA2_CONFIG.downloadRoot,
      fullPath: relativePath ? `${ARIA2_CONFIG.downloadRoot}/${relativePath}` : ARIA2_CONFIG.downloadRoot
    });
    
    hideDownloadStatus();
    addDownloadModal.removeAttribute('hidden');
    addDownloadModal.style.display = 'flex';
  }

  function closeDownloadModal() {
    addDownloadModal.setAttribute('hidden', '');
    addDownloadModal.style.display = 'none';
  }

  // ========== 事件处理 ==========
  // 顶部测试连接按钮
  if (testRpcBtn) {
    testRpcBtn.addEventListener('click', async () => {
      testRpcBtn.disabled = true;
      testRpcBtn.textContent = '⏳ 测试中...';
      
      // 隐藏之前的状态提示
      if (testRpcStatus) {
        testRpcStatus.hidden = true;
      }

      const result = await testConnection();

      testRpcBtn.textContent = '🔗 测试连接';
      testRpcBtn.disabled = false;

      if (testRpcStatus) {
        if (!result.success) {
          testRpcStatus.textContent = `❌ 连接失败: ${result.error}`;
          testRpcStatus.className = 'test-rpc-status error';
        } else {
          testRpcStatus.textContent = `✅ 成功！版本: ${result.version}`;
          testRpcStatus.className = 'test-rpc-status success';
        }
        testRpcStatus.hidden = false;
        
        // 3秒后自动隐藏
        setTimeout(() => {
          testRpcStatus.hidden = true;
        }, 3000);
      }
    });
  }

  // ========== 添加下载任务 ==========
  // 打开添加下载对话框
  if (addDownloadBtn) {
    addDownloadBtn.addEventListener('click', openDownloadModal);
  }

  // 关闭添加下载对话框
  if (addDownloadClose) {
    addDownloadClose.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeDownloadModal();
    });
  }

  // 点击对话框外部关闭
  if (addDownloadModal) {
    addDownloadModal.addEventListener('click', (e) => {
      if (e.target === addDownloadModal) {
        closeDownloadModal();
      }
    });
  }

  // ESC 键关闭下载对话框
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && addDownloadModal && addDownloadModal.style.display !== 'none' && !addDownloadModal.hasAttribute('hidden')) {
      closeDownloadModal();
    }
  });

  // 提交下载任务
  if (downloadSubmitBtn) {
    downloadSubmitBtn.addEventListener('click', async () => {
      const url = downloadUrlInput.value.trim();
      const path = downloadPathInput.value.trim();
      const filename = downloadFilenameInput.value.trim();

      if (!url) {
        showDownloadStatus('请输入下载链接', false);
        return;
      }

      // 验证 URL 格式
      try {
        new URL(url);
      } catch (_) {
        showDownloadStatus('请输入有效的下载链接', false);
        return;
      }

      hideDownloadStatus();
      downloadSubmitBtn.disabled = true;
      downloadSubmitBtn.textContent = '正在添加...';

      const result = await sendCustomDownload(url, path, filename);

      if (result.success) {
        showDownloadStatus(`✓ 下载任务已添加 (GID: ${result.gid})`, true);
        
        // 启动进度监控
        startProgressMonitor();
        
        setTimeout(() => {
          closeDownloadModal();
        }, 2000);
      } else {
        showDownloadStatus('添加失败: ' + result.error, false);
      }

      downloadSubmitBtn.disabled = false;
      downloadSubmitBtn.textContent = '开始下载';
    });
  }

  // 导出到全局
  window.Aria2Module = {
    testConnection,
    sendCustomDownload,
    startProgressMonitor,
    stopProgressMonitor
  };

  // 页面加载时启动监控（如果有活动下载）
  startProgressMonitor();
})();

