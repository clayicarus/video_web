/*
  Aria2 RPC 功能
*/
(function() {
  // 添加下载任务相关元素
  const testRpcBtn = document.getElementById('test-rpc-btn');
  const addDownloadBtn = document.getElementById('add-download-btn');
  const addDownloadModal = document.getElementById('add-download-modal');
  const addDownloadClose = document.getElementById('add-download-close');
  const downloadUrlInput = document.getElementById('download-url');
  const downloadPathInput = document.getElementById('download-path');
  const downloadFilenameInput = document.getElementById('download-filename');
  const downloadSubmitBtn = document.getElementById('download-submit');
  const downloadStatusEl = document.getElementById('download-status');

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

      const result = await testConnection();

      if (!result.success) {
        testRpcBtn.textContent = '❌ 连接失败';
        window.VideoModule.showError('Aria2 连接失败: ' + result.error);
        setTimeout(() => {
          testRpcBtn.textContent = '🔗 测试连接';
          testRpcBtn.disabled = false;
          window.VideoModule.clearError();
        }, 3000);
      } else {
        testRpcBtn.textContent = '✅ 连接成功';
        window.VideoModule.showError(`✓ Aria2 连接成功！版本: ${result.version}`);
        setTimeout(() => {
          testRpcBtn.textContent = '🔗 测试连接';
          testRpcBtn.disabled = false;
          window.VideoModule.clearError();
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
    sendCustomDownload
  };
})();

