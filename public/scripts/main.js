// =============================================
// 📸 光影集 — 主 JavaScript
// =============================================

(function () {
  'use strict';

  // ===== 工具函数 =====
  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ===== 1. 滚动渐显 =====
  function initScrollReveal() {
    var items = document.querySelectorAll(
      '.media-card, .category-card, .hero-section, .page-header, h4.border-bottom'
    );
    if (items.length === 0) return;

    items.forEach(function (el, i) {
      el.classList.add('reveal', 'reveal-up');
      var d = Math.min((i % 8) + 1, 8);
      el.classList.add('reveal-delay-' + d);
    });

    if ('IntersectionObserver' in window) {
      var obs = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add('revealed');
              obs.unobserve(e.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
      );
      items.forEach(function (el) { obs.observe(el); });
    } else {
      items.forEach(function (el) { el.classList.add('revealed'); });
    }
  }

  // ===== 3. 无限滚动 =====
  var currentPage = 1;
  var isLoading = false;
  var hasMore = true;
  var category = null;

  function initInfiniteScroll() {
    var pagination = document.querySelector('.pagination');
    var grid = document.querySelector('.masonry-grid');
    if (!grid) return;

    // 解析分类
    var m = window.location.pathname.match(/\/category\/(.+)/);
    if (m) category = decodeURIComponent(m[1]);

    // 隐藏旧分页
    if (pagination) pagination.style.display = 'none';

    // 创建 sentinel
    var sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    sentinel.className = 'scroll-sentinel';
    sentinel.innerHTML =
      '<div class="loading-dots" style="display:none"><span></span><span></span><span></span></div>';
    grid.parentElement.appendChild(sentinel);

    function loadMore() {
      if (isLoading || !hasMore) return;
      isLoading = true;
      var dots = sentinel.querySelector('.loading-dots');
      if (dots) dots.style.display = 'flex';

      var url = '/api/media?page=' + (currentPage + 1);
      if (category) url += '&category=' + encodeURIComponent(category);

      fetch(url)
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (dots) dots.style.display = 'none';
          if (d.items && d.items.length) {
            appendItems(d.items, grid);
            currentPage++;
            hasMore = d.hasMore;
          } else {
            hasMore = false;
          }
          if (!hasMore)
            sentinel.innerHTML =
              '<p class="text-muted small py-3" style="opacity:0.4">— 已加载全部 —</p>';
          isLoading = false;
        })
        .catch(function () {
          if (dots) dots.style.display = 'none';
          isLoading = false;
        });
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          if (entries[0].isIntersecting && !isLoading && hasMore) loadMore();
        },
        { rootMargin: '0px 0px 200px 0px' }
      ).observe(sentinel);
    } else {
      window.addEventListener(
        'scroll',
        function () {
          if (
            !isLoading &&
            hasMore &&
            window.innerHeight + window.scrollY >= document.body.offsetHeight - 400
          )
            loadMore();
        },
        { passive: true }
      );
    }
  }

  function appendItems(items, grid) {
    items.forEach(function (item) {
      var div = document.createElement('div');
      div.className = 'masonry-item';
      div.innerHTML = buildCard(item);
      grid.appendChild(div);
      // 直接显示
      var card = div.querySelector('.media-card');
      if (card) {
        card.classList.add('reveal', 'reveal-up', 'revealed');
      }
    });
  }

  function buildCard(item) {
    var isVideo = item.type === 'video';
    var src = isVideo
      ? '/uploads/videos/' + item.filename
      : '/uploads/photos/' + item.filename;
    var html = '<a href="/media/' + item.id + '" class="text-decoration-none">';
    html += '<div class="card media-card">';
    if (isVideo) {
      html +=
        '<div class="card-img-wrap video-thumb"><video preload="metadata" muted><source src="' +
        src +
        '"></video><div class="play-overlay"><span class="play-icon">▶</span></div></div>';
    } else {
      html += '<div class="card-img-wrap">';
      html += '<div class="image-placeholder"></div>';
      html +=
        '<img src="' +
        src +
        '" alt="' +
        esc(item.title) +
        '" loading="lazy" onload="this.previousElementSibling&&this.previousElementSibling.remove()" onerror="this.parentElement.innerHTML=\'<div class=\\\'no-preview\\\'><span>🖼</span><br>暂无预览</div>\'">';
      html += '</div>';
    }
    html +=
      '<div class="card-body p-2"><h6 class="card-title text-truncate mb-1">' +
      esc(item.title) +
      '</h6><div class="d-flex justify-content-between align-items-center"><span class="badge category-badge">' +
      esc(item.category) +
      '</span><small class="text-muted">' +
      (item.uploaded_at || '') +
      '</small></div></div></div></a>';
    return html;
  }

  function esc(s) {
    if (!s) return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ===== 4. Toast =====
  function showToast(msg, icon) {
    var c = document.querySelector('.toast-container');
    if (!c) {
      c = document.createElement('div');
      c.className = 'toast-container';
      document.body.appendChild(c);
    }
    var t = document.createElement('div');
    t.className = 'toast-notification';
    t.innerHTML = '<span>' + (icon || '✨') + '</span> ' + msg;
    c.appendChild(t);
    setTimeout(function () {
      t.classList.add('toast-exit');
      setTimeout(function () { t.remove(); }, 350);
    }, 3500);
  }

  // ===== 5. 上传完成通知 =====
  function initUploadToast() {
    var m = window.location.search.match(/uploaded=(\d+)/);
    if (window.location.pathname === '/' && m) {
      var n = parseInt(m[1], 10);
      var msg = n > 1 ? '成功上传 ' + n + ' 个文件！' : '上传成功！';
      setTimeout(function () { showToast(msg, '🎉'); }, 300);
      if (window.history.replaceState)
        window.history.replaceState({}, '', '/');
    }
  }

  // ===== 6. 导航栏滚动阴影 =====
  function initNavShadow() {
    var nav = document.querySelector('.navbar');
    if (!nav) return;
    function tick() {
      nav.style.boxShadow =
        window.scrollY > 60 ? '0 2px 20px rgba(0,0,0,0.08)' : 'none';
    }
    window.addEventListener('scroll', tick, { passive: true });
    tick();
  }

  // ===== 7. 音效挂载 =====
  function initSounds() {
    if (typeof Sound === 'undefined') return;

    // 创建右下角固定音效开关
    var btn = document.createElement('div');
    btn.id = 'soundToggle';
    btn.textContent = '🔊';
    btn.title = '音效开关';
    btn.style.cssText =
      'position:fixed;bottom:28px;right:28px;z-index:9999;' +
      'width:46px;height:46px;border-radius:50%;' +
      'background:rgba(255,255,255,0.9);backdrop-filter:blur(12px);' +
      'border:1px solid rgba(255,255,255,0.3);' +
      'box-shadow:0 4px 20px rgba(0,0,0,0.1);' +
      'display:flex;align-items:center;justify-content:center;' +
      'font-size:20px;cursor:pointer;transition:all 0.3s ease;' +
      'user-select:none;';
    btn.onmouseenter = function () {
      btn.style.transform = 'scale(1.1)';
      btn.style.boxShadow = '0 6px 28px rgba(0,0,0,0.15)';
    };
    btn.onmouseleave = function () {
      btn.style.transform = '';
      btn.style.boxShadow = '';
    };
    btn.onclick = function () {
      var on = Sound.toggle();
      btn.textContent = on ? '🔊' : '🔇';
    };
    document.body.appendChild(btn);

    // 所有点击 — 先播声音再跳转
    document.addEventListener('click', function (e) {
      if (e.target.id === 'soundToggle') return;

      var link = e.target.closest('a[href]');
      if (link && !link.hasAttribute('download') && !(link.getAttribute('href')||'').includes('delete')) {
        var href = link.getAttribute('href') || '';
        // 内部导航链接：播 nav 音，延迟20ms跳转
        if (href.startsWith('/') && !href.startsWith('//') && href !== '/upload') {
          e.preventDefault();
          Sound.nav();
          setTimeout(function () { window.location.href = link.href; }, 20);
          return;
        }
      }

      // 其他可点击元素：普通轻触音
      if (e.target.closest('a, button, .btn, .card, .page-link, .upload-dropzone, .nav-link, [role=button]')) {
        Sound.click();
      }
    });

    // 上传成功 Toast
    var _orig = window.showToast;
    if (_orig) {
      window.showToast = function (msg, icon) {
        if (msg.indexOf('成功') !== -1 || msg.indexOf('文件') !== -1) Sound.success();
        _orig(msg, icon);
      };
    }
  }

  // ===== 初始化 =====
  function init() {
    try {
      initScrollReveal();
      initInfiniteScroll();
      initUploadToast();
      initNavShadow();
      initSounds();
      window.showToast = showToast;
    } catch (e) {
      console.warn('Init error:', e);
    }
  }

  if (document.readyState === 'complete') init();
  else window.addEventListener('load', init);
})();

// ===== 上传页拖拽 + 多文件功能（可累加） =====
(function () {
  var dropzone = document.getElementById('dropzone');
  var fileInput = document.getElementById('fileInput');
  var dropzoneContent = document.getElementById('dropzoneContent');
  var dropzonePreview = document.getElementById('dropzonePreview');
  var previewContent = document.getElementById('previewContent');
  var changeFileBtn = document.getElementById('changeFileBtn');
  var submitBtn = document.getElementById('submitBtn');
  var uploadProgress = document.getElementById('uploadProgress');
  var progressBar = document.getElementById('progressBar');
  var uploadForm = document.getElementById('uploadForm');
  if (!dropzone) return;

  // 所有已选文件（累加）
  var allFiles = [];

  // ===== 把 allFiles 写回 fileInput =====
  function syncInput() {
    try {
      var dt = new DataTransfer();
      for (var i = 0; i < allFiles.length; i++) {
        dt.items.add(allFiles[i]);
      }
      fileInput.files = dt.files;
    } catch (e) {}
  }

  // ===== 刷新预览 =====
  function renderPreview() {
    if (allFiles.length === 0) {
      dropzoneContent.classList.remove('d-none');
      dropzonePreview.classList.add('d-none');
      submitBtn.disabled = true;
      return;
    }

    dropzoneContent.classList.add('d-none');
    dropzonePreview.classList.remove('d-none');

    var html = '<div class="file-list">';
    var count = Math.min(allFiles.length, 8);
    for (var i = 0; i < count; i++) {
      var f = allFiles[i];
      html += '<div class="file-item d-flex align-items-center gap-2 mb-1">';
      html += '<span>' + (f.type.startsWith('video/') ? '🎬' : '🖼') + '</span>';
      html += '<span class="text-truncate small">' + f.name + '</span>';
      html += '<span class="text-muted small flex-shrink-0">' + formatSize(f.size) + '</span>';
      html += '</div>';
    }
    if (allFiles.length > 8) {
      html += '<div class="text-muted small">...还有 ' + (allFiles.length - 8) + ' 个文件</div>';
    }
    html += '<div class="mt-2 badge bg-success">共 ' + allFiles.length + ' 个文件</div>';
    html += '</div>';
    previewContent.innerHTML = html;
    checkSubmitReady();
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ===== 添加文件（累加，去重） =====
  function addFiles(newFiles) {
    for (var i = 0; i < newFiles.length; i++) {
      var f = newFiles[i];
      // 按 name + size 去重
      var dup = false;
      for (var j = 0; j < allFiles.length; j++) {
        if (allFiles[j].name === f.name && allFiles[j].size === f.size) {
          dup = true;
          break;
        }
      }
      if (!dup) allFiles.push(f);
    }
    syncInput();
    renderPreview();
  }

  // ===== 清空 =====
  function clearFiles() {
    allFiles = [];
    fileInput.value = '';
    syncInput();
    renderPreview();
  }

  // ===== 事件绑定 =====

  // 点击 dropzone → 打开文件选择器
  dropzone.addEventListener('click', function () { fileInput.click(); });

  // 拖拽 hover
  dropzone.addEventListener('dragover', function (e) {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', function () {
    dropzone.classList.remove('dragover');
  });

  // 拖拽放下 → 累加文件
  dropzone.addEventListener('drop', function (e) {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      if (typeof Sound !== 'undefined') Sound.drop();
      addFiles(e.dataTransfer.files);
    }
  });

  // 文件选择器 → 累加文件
  fileInput.addEventListener('change', function () {
    if (this.files.length > 0) {
      addFiles(this.files);
    }
    // 清空 input.value 以便下次可以选同样的文件
    this.value = '';
  });

  // 更换文件 → 清空重选
  changeFileBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    clearFiles();
  });

  // 分类选择
  var categoryRadios = document.querySelectorAll('.category-radio');
  categoryRadios.forEach(function (r) { r.addEventListener('change', checkSubmitReady); });

  function checkSubmitReady() {
    var hasCat = document.querySelector('.category-radio:checked') !== null;
    submitBtn.disabled = !(allFiles.length > 0 && hasCat);
  }

  // 表单提交 — 用 XHR + FormData（最可靠）
  if (uploadForm) {
    uploadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (allFiles.length === 0) return;

      var cat = document.querySelector('.category-radio:checked');
      if (!cat) return;

      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>上传 ' + allFiles.length + ' 个文件...';
      uploadProgress.classList.remove('d-none');
      progressBar.style.width = '10%';
      progressBar.textContent = '10%';

      var fd = new FormData();
      fd.append('category', cat.value);
      var titleEl = document.getElementById('title');
      if (titleEl && titleEl.value) fd.append('title', titleEl.value);
      var descEl = document.getElementById('description');
      if (descEl && descEl.value) fd.append('description', descEl.value);
      var privEl = document.getElementById('isPrivate');
      if (privEl && privEl.checked) fd.append('is_private', '1');

      for (var i = 0; i < allFiles.length; i++) {
        fd.append('file', allFiles[i]);
      }

      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/upload', true);

      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
          var pct = Math.round((e.loaded / e.total) * 70) + 10;
          progressBar.style.width = pct + '%';
          progressBar.textContent = pct + '%';
        }
      };

      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 400) {
          // 成功：跳转到首页
          window.location.href = xhr.responseURL || '/?uploaded=' + allFiles.length;
        } else {
          // 失败：找错误信息
          var match = xhr.responseText.match(/alert-danger[^>]*>([^<]+)/);
          alert(match ? match[1].trim() : '上传失败');
          submitBtn.disabled = false;
          submitBtn.innerHTML = '⬆ 上传';
          uploadProgress.classList.add('d-none');
        }
      };

      xhr.onerror = function () {
        alert('网络错误，请重试');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '⬆ 上传';
        uploadProgress.classList.add('d-none');
      };

      xhr.send(fd);
    });
  }
})();
