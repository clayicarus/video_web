/*
  视频播放功能
*/
(function() {
  const videoEl = document.getElementById('video');
  const videoTipEl = document.getElementById('video-tip');
  const currentFileEl = document.getElementById('current-file');
  const downloadLinkEl = document.getElementById('download-link');
  const errorEl = document.getElementById('error');

  const { isHlsFile } = window.AppUtils;

  let onPlayCallback = null;
  let onStopCallback = null;

  // 显示错误
  function showError(msg) {
    errorEl.removeAttribute('hidden');
    errorEl.style.display = 'block';
    errorEl.textContent = msg;
  }

  // 清除错误
  function clearError() {
    errorEl.setAttribute('hidden', '');
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }

  // 停止播放
  function stopVideo() {
    try { videoEl.pause(); } catch (_) {}
    videoEl.removeAttribute('src');
    videoEl.load();
    videoTipEl.style.display = '';
    currentFileEl.textContent = '未选择文件';
    downloadLinkEl.setAttribute('hidden', '');
    downloadLinkEl.style.display = 'none';

    if (videoEl._hls) {
      videoEl._hls.destroy();
      videoEl._hls = null;
    }

    if (onStopCallback) {
      onStopCallback();
    }
  }

  // 播放视频
  function playVideo(url, name) {
    clearError();
    currentFileEl.textContent = name;
    downloadLinkEl.href = url;
    downloadLinkEl.removeAttribute('hidden');
    downloadLinkEl.style.display = '';

    const isHls = isHlsFile(name);
    if (isHls) {
      if (window.Hls && window.Hls.isSupported()) {
        if (videoEl._hls) videoEl._hls.destroy();
        const hls = new Hls();
        videoEl._hls = hls;
        hls.attachMedia(videoEl);
        hls.on(Hls.Events.MEDIA_ATTACHED, function () {
          hls.loadSource(url);
        });
        hls.on(Hls.Events.ERROR, function (event, data) {
          showError('HLS 播放错误：' + data.type + ' - ' + data.details);
        });
      } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
        videoEl.src = url;
      } else {
        showError('浏览器不支持 HLS 播放');
        return;
      }
    } else {
      videoEl.src = url;
    }

    videoEl.play().catch(() => {/* 可能需要用户交互后播放 */});
    videoTipEl.style.display = 'none';

    if (onPlayCallback) {
      onPlayCallback(url, name);
    }
  }

  // 设置回调
  function setPlayCallback(callback) {
    onPlayCallback = callback;
  }

  function setStopCallback(callback) {
    onStopCallback = callback;
  }

  // 导出到全局
  window.VideoModule = {
    playVideo,
    stopVideo,
    showError,
    clearError,
    setPlayCallback,
    setStopCallback
  };
})();

