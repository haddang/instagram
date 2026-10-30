/**
 * Instagram Direct Message Archive Viewer
 * Handles virtual windowed scrolling for 300,000+ messages, media lightbox,
 * instant keyword search, date jumping, and responsive Instagram UI aesthetics.
 */

(function () {
  'use strict';

  // State Management
  const state = {
    data: null,
    total: 0,
    mySenderIdx: 1, // Default: 1 = 박하원 (sent/right), 0 = 이재인 (received/left)
    startIndex: 0,
    endIndex: 0,
    renderedIndices: new Set(),
    isScrolling: false,
    scrollCheckTimeout: null,
    
    // Search
    searchResults: [],
    currentSearchIdx: -1,
    searchQuery: '',

    // Gallery
    galleryFilter: 'all', // 'all', 'p', 'v'
    galleryPage: 0,
    galleryPageSize: 60,
    currentLightboxMedia: null,

    // Theme & Layout
    theme: localStorage.getItem('insta_theme') || 'dark',
    deviceMode: localStorage.getItem('insta_device') || 'desktop',
    bubbleColor: localStorage.getItem('insta_bubble_color') || 'purple',
    customAvatar: localStorage.getItem('insta_partner_avatar') || null
  };

  // DOM Elements Cache
  const el = {};

  function initElements() {
    el.loadingOverlay = document.getElementById('loadingOverlay');
    el.loadingText = document.getElementById('loadingText');
    el.appWrapper = document.getElementById('appWrapper');
    el.chatWindow = document.getElementById('chatWindow');
    el.messagesViewport = document.getElementById('messagesViewport');
    el.messagesList = document.getElementById('messagesList');
    el.floatingDatePill = document.getElementById('floatingDatePill');
    
    // Header
    el.headerAvatar = document.getElementById('headerAvatar');
    el.headerAvatarBtn = document.getElementById('headerAvatarBtn');
    el.partnerInfoBtn = document.getElementById('partnerInfoBtn');
    el.partnerNameText = document.getElementById('partnerNameText');
    el.partnerSubtext = document.getElementById('partnerSubtext');
    
    // Header Actions
    el.btnToggleSearch = document.getElementById('btnToggleSearch');
    el.btnOpenDateModal = document.getElementById('btnOpenDateModal');
    el.btnOpenGallery = document.getElementById('btnOpenGallery');
    el.btnToggleDevice = document.getElementById('btnToggleDevice');
    el.btnToggleTheme = document.getElementById('btnToggleTheme');
    el.btnOpenSettings = document.getElementById('btnOpenSettings');
    
    // Search
    el.searchBarContainer = document.getElementById('searchBarContainer');
    el.searchInput = document.getElementById('searchInput');
    el.searchResultCount = document.getElementById('searchResultCount');
    el.btnSearchPrev = document.getElementById('btnSearchPrev');
    el.btnSearchNext = document.getElementById('btnSearchNext');
    el.btnCloseSearch = document.getElementById('btnCloseSearch');
    
    // Floating buttons
    el.btnScrollTop = document.getElementById('btnScrollTop');
    el.btnScrollBottom = document.getElementById('btnScrollBottom');

    // Modals
    el.dateModal = document.getElementById('dateModal');
    el.monthChipsContainer = document.getElementById('monthChipsContainer');
    el.datePickerInput = document.getElementById('datePickerInput');
    el.btnJumpToExactDate = document.getElementById('btnJumpToExactDate');

    el.galleryModal = document.getElementById('galleryModal');
    el.galleryTotalCount = document.getElementById('galleryTotalCount');
    el.galleryGrid = document.getElementById('galleryGrid');

    el.lightboxOverlay = document.getElementById('lightboxOverlay');
    el.lightboxContent = document.getElementById('lightboxContent');
    el.btnLightboxClose = document.getElementById('btnLightboxClose');
    el.btnLightboxJump = document.getElementById('btnLightboxJump');

    el.settingsModal = document.getElementById('settingsModal');
    el.perspectiveSelect = document.getElementById('perspectiveSelect');
    el.settingThemeToggle = document.getElementById('settingThemeToggle');
    el.bubbleColorSelect = document.getElementById('bubbleColorSelect');
    el.avatarFileInput = document.getElementById('avatarFileInput');

    // Stats
    el.statTotalMsgs = document.getElementById('statTotalMsgs');
    el.statTotalDays = document.getElementById('statTotalDays');
    el.statPhotos = document.getElementById('statPhotos');
    el.statVideos = document.getElementById('statVideos');
  }

  // Application Entry Point
  function init() {
    initElements();
    applyTheme(state.theme);
    applyDeviceMode(state.deviceMode);
    applyBubbleColor(state.bubbleColor);

    if (window.CHAT_DATA && window.CHAT_DATA.messages) {
      loadData(window.CHAT_DATA);
    } else {
      el.loadingText.textContent = 'chat_data.js 파일을 찾는 중...';
      const checkInterval = setInterval(() => {
        if (window.CHAT_DATA && window.CHAT_DATA.messages) {
          clearInterval(checkInterval);
          loadData(window.CHAT_DATA);
        }
      }, 100);
    }

    bindEvents();
  }

  function loadData(chatData) {
    state.data = chatData;
    state.total = chatData.messages.length;

    // Load perspective preference
    const savedPerspective = localStorage.getItem('insta_perspective');
    if (savedPerspective !== null) {
      state.mySenderIdx = parseInt(savedPerspective, 10);
    }
    el.perspectiveSelect.value = state.mySenderIdx;

    updateHeaderInfo();
    updateStatsOverview();
    renderMonthChips();

    // Start with the latest 80 messages (or start from beginning if small)
    const initialWindow = 80;
    state.startIndex = Math.max(0, state.total - initialWindow);
    state.endIndex = state.total - 1;

    renderRange(state.startIndex, state.endIndex, 'replace');

    // Scroll directly to the bottom anchor
    setTimeout(() => {
      el.messagesViewport.scrollTop = el.messagesViewport.scrollHeight;
      updateFloatingDate();
      el.loadingOverlay.classList.add('hidden');
    }, 100);
  }

  function updateHeaderInfo() {
    const partnerIdx = state.mySenderIdx === 1 ? 0 : 1;
    const partnerName = state.data.participants[partnerIdx] || '이재인';
    el.partnerNameText.textContent = partnerName;
    el.partnerSubtext.textContent = `Instagram • ${state.total.toLocaleString()}개 메시지`;

    if (state.customAvatar) {
      el.headerAvatar.innerHTML = `<img src="${state.customAvatar}" alt="avatar" style="width:100%; height:100%; object-fit:cover;">`;
    } else {
      el.headerAvatar.textContent = partnerName.charAt(0);
    }
  }

  function updateStatsOverview() {
    el.statTotalMsgs.textContent = `${state.total.toLocaleString()}개`;
    el.statTotalDays.textContent = `${Object.keys(state.data.days).length}일`;
    
    let photoCount = 0;
    let videoCount = 0;
    if (state.data.media) {
      state.data.media.forEach(m => {
        if (m.y === 'p') photoCount++;
        else if (m.y === 'v') videoCount++;
      });
    }
    el.statPhotos.textContent = `${photoCount.toLocaleString()}장`;
    el.statVideos.textContent = `${videoCount.toLocaleString()}개`;
    el.galleryTotalCount.textContent = (photoCount + videoCount).toLocaleString();
  }

  // ============================================================
  // Date Utilities & Grouping
  // ============================================================

  const KOREAN_DAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

  function formatDividerDate(ts) {
    const d = new Date(ts);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const day = KOREAN_DAYS[d.getDay()];
    return `${year}년 ${month}월 ${date}일 ${day}`;
  }

  function formatShortDate(ts) {
    const d = new Date(ts);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}. ${month}. ${date}`;
  }

  function formatTimestampTooltip(ts) {
    const d = new Date(ts);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const date = d.getDate();
    const day = KOREAN_DAYS[d.getDay()];
    let hours = d.getHours();
    const ampm = hours >= 12 ? '오후' : '오전';
    hours = hours % 12 || 12;
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}년 ${month}월 ${date}일 (${day}) ${ampm} ${hours}:${minutes}`;
  }

  function formatDuration(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m > 0) return `${m}분 ${s}초`;
    return `${s}초`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function linkifyText(text) {
    if (!text) return '';
    const escaped = escapeHtml(text);
    const urlPattern = /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
    return escaped.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:inherit; text-decoration:underline;">$1</a>');
  }

  // ============================================================
  // Message Row HTML Generation
  // ============================================================

  function createMessageRowHtml(idx) {
    const msgs = state.data.messages;
    const m = msgs[idx];
    if (!m) return '';

    const prevM = idx > 0 ? msgs[idx - 1] : null;
    const nextM = idx < msgs.length - 1 ? msgs[idx + 1] : null;

    let html = '';

    // Date Divider if day changed
    const currDay = new Date(m.t).toDateString();
    const prevDay = prevM ? new Date(prevM.t).toDateString() : null;
    if (currDay !== prevDay) {
      html += `
        <div class="date-divider" data-date="${formatShortDate(m.t)}">
          <span class="date-divider-pill">${formatDividerDate(m.t)}</span>
        </div>
      `;
    }

    // Call duration or system call event
    if (m.cd !== undefined || (m.c && (m.c.includes('Video chat') || m.c.includes('audio call')))) {
      const durText = m.cd ? ` • ${formatDuration(m.cd)}` : '';
      const isVideo = (m.c && m.c.toLowerCase().includes('video')) || false;
      const iconSvg = isVideo
        ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`
        : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`;
      
      let label = isVideo ? '영상 통화' : '음성 통화';
      if (m.c && m.c.includes('ended')) label += ' 종료';
      else if (m.c && m.c.includes('started')) label += ' 시작';
      else if (m.c && m.c.includes('missed')) label = '부재중 ' + label;

      html += `
        <div class="call-event-pill" data-idx="${idx}" data-time="${m.t}">
          ${iconSvg}
          <span>${label}${durText}</span>
        </div>
      `;
      return html;
    }

    // Determine Sent vs Received
    const isSent = m.s === state.mySenderIdx;
    const rowClass = isSent ? 'sent' : 'received';

    // Consecutive message grouping logic (within 5 minutes)
    const isSameSenderAsPrev = prevM && prevM.s === m.s && (m.t - prevM.t < 300000) && currDay === prevDay;
    const isSameSenderAsNext = nextM && nextM.s === m.s && (nextM.t - m.t < 300000) && (new Date(nextM.t).toDateString() === currDay);

    let groupClass = '';
    if (!isSameSenderAsPrev && isSameSenderAsNext) groupClass = 'group-first';
    else if (isSameSenderAsPrev && isSameSenderAsNext) groupClass = 'group-middle';
    else if (isSameSenderAsPrev && !isSameSenderAsNext) groupClass = 'group-last';

    const spacingClass = !isSameSenderAsPrev ? 'spacing-change' : '';

    // Partner Avatar beside LAST message of consecutive group
    let avatarHtml = '';
    if (!isSent) {
      if (!isSameSenderAsNext) {
        const partnerName = state.data.participants[m.s] || '이재인';
        const initial = partnerName.charAt(0);
        avatarHtml = `
          <div class="partner-mini-avatar" title="${partnerName}">
            ${state.customAvatar ? `<img src="${state.customAvatar}" alt="avatar">` : initial}
          </div>
        `;
      } else {
        avatarHtml = `<div class="avatar-spacer"></div>`;
      }
    }

    // Inner Content Construction
    let innerContentHtml = '';
    let isSticker = false;

    // 1. Photos
    if (m.p && m.p.length > 0) {
      if (m.p.length === 1) {
        innerContentHtml += `
          <div class="media-container" onclick="window.viewMediaInLightbox('${m.p[0]}', 'p', ${idx})">
            <img src="${m.p[0]}" loading="lazy" alt="photo" onerror="this.parentElement.style.display='none';">
          </div>
        `;
      } else {
        const count = Math.min(m.p.length, 4);
        let gridItems = '';
        m.p.slice(0, 4).forEach((pUri, pIndex) => {
          const isExtra = pIndex === 3 && m.p.length > 4;
          gridItems += `
            <div class="grid-item" onclick="window.viewMediaInLightbox('${pUri}', 'p', ${idx})">
              <img src="${pUri}" loading="lazy" alt="photo" onerror="this.parentElement.style.display='none';">
              ${isExtra ? `<div class="grid-more-badge">+${m.p.length - 3}</div>` : ''}
            </div>
          `;
        });
        innerContentHtml += `<div class="photo-grid grid-${count}">${gridItems}</div>`;
      }
    }

    // 2. Videos
    if (m.v && m.v.length > 0) {
      m.v.forEach(vUri => {
        innerContentHtml += `
          <div class="video-wrapper">
            <video src="${vUri}" controls playsinline preload="metadata" onclick="event.stopPropagation();" onerror="this.parentElement.innerHTML='<div style=\'padding:10px; font-size:12px; color:#999;\'>만료되었거나 불러올 수 없는 동영상입니다.</div>';"></video>
          </div>
        `;
      });
    }

    // 3. Audio Voice Notes
    if (m.a && m.a.length > 0) {
      m.a.forEach((aUri, aIdx) => {
        const audioId = `audio_${idx}_${aIdx}`;
        // Generate pseudo-waveform bars
        let waveformHtml = '';
        for (let i = 0; i < 18; i++) {
          const h = 6 + Math.sin(i * 0.8) * 8 + (i % 3) * 3;
          waveformHtml += `<span class="waveform-bar" style="height:${Math.max(4, Math.min(22, h))}px;"></span>`;
        }

        innerContentHtml += `
          <div class="audio-voice-note">
            <audio id="${audioId}" src="${aUri}" preload="metadata" onended="window.onAudioEnded('${audioId}')"></audio>
            <button class="audio-play-btn" id="btn_${audioId}" onclick="window.toggleAudioPlay('${audioId}', event)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
            </button>
            <div class="audio-waveform-bars">${waveformHtml}</div>
            <span class="audio-time-label" id="label_${audioId}">0:00</span>
          </div>
        `;
      });
    }

    // 4. Gifs / Stickers
    if (m.g && m.g.length > 0) {
      isSticker = true;
      m.g.forEach(gUri => {
        innerContentHtml += `
          <div class="media-container" style="background:transparent;" onclick="window.viewMediaInLightbox('${gUri}', 'p', ${idx})">
            <img src="${gUri}" style="max-width:180px; max-height:180px;" loading="lazy" alt="gif">
          </div>
        `;
      });
    }

    // 5. Shared Link / Reel / Giphy Sticker
    if (m.sh) {
      const sh = m.sh;
      if (sh.l && (sh.l.includes('giphy.com') || sh.l.endsWith('.gif'))) {
        isSticker = true;
        innerContentHtml += `
          <div class="media-container" style="background:transparent;">
            <img src="${sh.l}" style="max-width:180px; max-height:180px;" loading="lazy" alt="gif sticker">
          </div>
        `;
      } else {
        const owner = sh.o ? `@${escapeHtml(sh.o)}` : 'Instagram 공유 콘텐츠';
        const text = sh.t ? escapeHtml(sh.t) : '';
        const link = sh.l || '#';
        innerContentHtml += `
          <a href="${link}" target="_blank" rel="noopener noreferrer" class="share-card" onclick="event.stopPropagation();">
            <div class="share-card-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              </svg>
              <span>${owner}</span>
            </div>
            ${text ? `<div class="share-card-body">${text}</div>` : ''}
          </a>
        `;
      }
    }

    // 6. Text Content
    if (m.c) {
      // Instagram's auto reactions sometimes export as "Liked a message"
      if (m.c === 'Liked a message') {
        innerContentHtml += `<span style="font-style:italic; opacity:0.85; font-size:13.5px;">❤️ 메시지에 공감함</span>`;
      } else {
        innerContentHtml += `<div>${linkifyText(m.c)}</div>`;
      }
    }

    // 7. Reactions Overlay
    let reactionsHtml = '';
    if (m.r && m.r.length > 0) {
      const reactionCount = m.r.length;
      const emojiList = Array.from(new Set(m.r.map(r => r.r))).join('');
      const actors = m.r.map(r => state.data.participants[r.a] || '').join(', ');
      reactionsHtml = `
        <div class="reaction-pill-badge" title="${actors} 님의 공감">
          <span>${emojiList}</span>
          ${reactionCount > 1 ? `<span style="font-size:10.5px; margin-left:1px;">${reactionCount}</span>` : ''}
        </div>
      `;
    }

    const bubbleClasses = ['msg-bubble'];
    if (isSticker) bubbleClasses.push('is-sticker');

    html += `
      <div class="msg-row ${rowClass} ${groupClass} ${spacingClass}" data-idx="${idx}" data-time="${m.t}">
        <div class="msg-wrapper">
          ${avatarHtml}
          <div class="${bubbleClasses.join(' ')}" id="msg_bubble_${idx}" onclick="window.copyMessageText(${idx})">
            ${innerContentHtml}
            ${reactionsHtml}
          </div>
        </div>
        <div class="msg-timestamp-tooltip">${formatTimestampTooltip(m.t)}</div>
      </div>
    `;

    return html;
  }

  // ============================================================
  // Virtual Scrolling Window Engine
  // ============================================================

  function renderRange(start, end, mode) {
    let fragmentHtml = '';
    for (let i = start; i <= end; i++) {
      fragmentHtml += createMessageRowHtml(i);
    }

    if (mode === 'replace') {
      el.messagesList.innerHTML = fragmentHtml;
      state.renderedIndices.clear();
      for (let i = start; i <= end; i++) state.renderedIndices.add(i);
    } else if (mode === 'prepend') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fragmentHtml;
      el.messagesList.insertBefore(tempDiv, el.messagesList.firstChild);
      // Unwrap
      while (tempDiv.firstChild) {
        el.messagesList.insertBefore(tempDiv.firstChild, tempDiv);
      }
      tempDiv.remove();
      for (let i = start; i <= end; i++) state.renderedIndices.add(i);
    } else if (mode === 'append') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = fragmentHtml;
      while (tempDiv.firstChild) {
        el.messagesList.appendChild(tempDiv.firstChild);
      }
      for (let i = start; i <= end; i++) state.renderedIndices.add(i);
    }
  }

  function handleScroll() {
    if (state.isScrolling) return;
    const vp = el.messagesViewport;
    const scrollTop = vp.scrollTop;
    const scrollHeight = vp.scrollHeight;
    const clientHeight = vp.clientHeight;

    // Toggle Scroll-to-Bottom Floating Button
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    if (distanceFromBottom > 500) {
      el.btnScrollBottom.classList.remove('hidden');
    } else {
      el.btnScrollBottom.classList.add('hidden');
    }

    // Prepend older messages when near top
    if (scrollTop < 350 && state.startIndex > 0) {
      state.isScrolling = true;
      const chunkSize = Math.min(state.startIndex, 40);
      const newStart = state.startIndex - chunkSize;
      const prevScrollHeight = scrollHeight;

      renderRange(newStart, state.startIndex - 1, 'prepend');
      state.startIndex = newStart;

      // Maintain scroll position perfectly
      const newScrollHeight = vp.scrollHeight;
      vp.scrollTop = scrollTop + (newScrollHeight - prevScrollHeight);

      // Trim bottom if DOM contains too many elements
      trimBottomIfNeeded();
      state.isScrolling = false;
    }

    // Append newer messages when near bottom
    if (distanceFromBottom < 350 && state.endIndex < state.total - 1) {
      state.isScrolling = true;
      const chunkSize = Math.min(state.total - 1 - state.endIndex, 40);
      const newEnd = state.endIndex + chunkSize;

      renderRange(state.endIndex + 1, newEnd, 'append');
      state.endIndex = newEnd;

      // Trim top if DOM contains too many elements
      trimTopIfNeeded();
      state.isScrolling = false;
    }

    // Throttled Floating Date Pill Update
    if (!state.scrollCheckTimeout) {
      state.scrollCheckTimeout = setTimeout(() => {
        updateFloatingDate();
        state.scrollCheckTimeout = null;
      }, 80);
    }
  }

  function trimBottomIfNeeded() {
    const rows = el.messagesList.querySelectorAll('.msg-row');
    if (rows.length > 250) {
      const removeCount = rows.length - 200;
      for (let i = 0; i < removeCount; i++) {
        const lastRow = el.messagesList.lastElementChild;
        if (lastRow) {
          const idx = parseInt(lastRow.getAttribute('data-idx'), 10);
          if (!isNaN(idx)) state.renderedIndices.delete(idx);
          lastRow.remove();
        }
      }
      const newLastRow = el.messagesList.lastElementChild;
      if (newLastRow) {
        state.endIndex = parseInt(newLastRow.getAttribute('data-idx'), 10);
      }
    }
  }

  function trimTopIfNeeded() {
    const rows = el.messagesList.querySelectorAll('.msg-row');
    if (rows.length > 250) {
      const removeCount = rows.length - 200;
      const vp = el.messagesViewport;
      let heightRemoved = 0;

      for (let i = 0; i < removeCount; i++) {
        const firstRow = el.messagesList.firstElementChild;
        if (firstRow) {
          heightRemoved += firstRow.offsetHeight;
          const idx = parseInt(firstRow.getAttribute('data-idx'), 10);
          if (!isNaN(idx)) state.renderedIndices.delete(idx);
          firstRow.remove();
        }
      }
      vp.scrollTop -= heightRemoved;

      const newFirstRow = el.messagesList.firstElementChild;
      if (newFirstRow) {
        state.startIndex = parseInt(newFirstRow.getAttribute('data-idx'), 10);
      }
    }
  }

  function updateFloatingDate() {
    const rows = el.messagesList.querySelectorAll('.msg-row');
    if (!rows.length) return;

    const vpTop = el.messagesViewport.getBoundingClientRect().top + 60;
    let visibleRow = rows[0];

    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      if (rect.top >= vpTop) {
        visibleRow = rows[i];
        break;
      }
    }

    const ts = visibleRow.getAttribute('data-time');
    if (ts) {
      el.floatingDatePill.textContent = formatDividerDate(parseInt(ts, 10));
    }
  }

  // Jump to specific message index (search result, date jump, media jump)
  function jumpToIndex(targetIdx, highlight = true) {
    if (targetIdx < 0 || targetIdx >= state.total) return;

    const windowHalf = 40;
    state.startIndex = Math.max(0, targetIdx - windowHalf);
    state.endIndex = Math.min(state.total - 1, targetIdx + windowHalf);

    renderRange(state.startIndex, state.endIndex, 'replace');

    setTimeout(() => {
      const targetEl = el.messagesList.querySelector(`[data-idx="${targetIdx}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        if (highlight) {
          const bubble = targetEl.querySelector('.msg-bubble');
          if (bubble) {
            bubble.classList.remove('highlight-target');
            void bubble.offsetWidth; // trigger reflow
            bubble.classList.add('highlight-target');
          }
        }
      }
      updateFloatingDate();
    }, 50);
  }

  // ============================================================
  // Search Engine
  // ============================================================

  function performSearch() {
    const query = el.searchInput.value.trim().toLowerCase();
    if (!query) {
      state.searchResults = [];
      state.currentSearchIdx = -1;
      el.searchResultCount.textContent = '0/0';
      return;
    }

    state.searchQuery = query;
    state.searchResults = [];

    // Search across all messages
    const msgs = state.data.messages;
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      if (m.c && m.c.toLowerCase().includes(query)) {
        state.searchResults.push(i);
      } else if (m.sh && m.sh.t && m.sh.t.toLowerCase().includes(query)) {
        state.searchResults.push(i);
      }
    }

    if (state.searchResults.length > 0) {
      state.currentSearchIdx = state.searchResults.length - 1; // start with latest match
      updateSearchNav();
      jumpToIndex(state.searchResults[state.currentSearchIdx], true);
    } else {
      state.currentSearchIdx = -1;
      el.searchResultCount.textContent = '0개 일치';
    }
  }

  function updateSearchNav() {
    const totalHits = state.searchResults.length;
    const currentPos = state.currentSearchIdx + 1;
    el.searchResultCount.textContent = `${currentPos}/${totalHits}`;
  }

  function searchNext() {
    if (!state.searchResults.length) return;
    state.currentSearchIdx = (state.currentSearchIdx + 1) % state.searchResults.length;
    updateSearchNav();
    jumpToIndex(state.searchResults[state.currentSearchIdx], true);
  }

  function searchPrev() {
    if (!state.searchResults.length) return;
    state.currentSearchIdx = (state.currentSearchIdx - 1 + state.searchResults.length) % state.searchResults.length;
    updateSearchNav();
    jumpToIndex(state.searchResults[state.currentSearchIdx], true);
  }

  // ============================================================
  // Date Navigator & Month Chips
  // ============================================================

  function renderMonthChips() {
    const days = state.data.days;
    const monthsMap = {};

    Object.keys(days).forEach(dateStr => {
      const ym = dateStr.substring(0, 7); // 'YYYY-MM'
      if (!monthsMap[ym]) {
        monthsMap[ym] = days[dateStr];
      }
    });

    const sortedYm = Object.keys(monthsMap).sort();
    let chipsHtml = '';

    sortedYm.forEach(ym => {
      const [year, month] = ym.split('-');
      const targetIdx = monthsMap[ym];
      chipsHtml += `
        <button class="month-chip" data-idx="${targetIdx}">
          <span>${year}년 ${parseInt(month, 10)}월</span>
          <span class="month-chip-badge">이동</span>
        </button>
      `;
    });

    el.monthChipsContainer.innerHTML = chipsHtml;

    el.monthChipsContainer.querySelectorAll('.month-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'), 10);
        closeModal(el.dateModal);
        jumpToIndex(idx, true);
      });
    });
  }

  function jumpToExactDate() {
    const inputVal = el.datePickerInput.value;
    if (!inputVal) return;

    const days = state.data.days;
    if (days[inputVal] !== undefined) {
      closeModal(el.dateModal);
      jumpToIndex(days[inputVal], true);
      return;
    }

    // Find closest date
    const sortedDays = Object.keys(days).sort();
    let closestDay = sortedDays[0];
    for (let d of sortedDays) {
      if (d <= inputVal) closestDay = d;
      else break;
    }

    closeModal(el.dateModal);
    jumpToIndex(days[closestDay], true);
  }

  // ============================================================
  // Media Gallery Modal
  // ============================================================

  function openMediaGallery() {
    state.galleryPage = 0;
    el.galleryGrid.innerHTML = '';
    el.galleryGrid.scrollTop = 0;
    renderGalleryChunk();
    openModal(el.galleryModal);
  }

  function getFilteredMedia() {
    if (!state.data.media) return [];
    if (state.galleryFilter === 'all') return state.data.media;
    return state.data.media.filter(m => m.y === state.galleryFilter);
  }

  function renderGalleryChunk() {
    const list = getFilteredMedia();
    const start = state.galleryPage * state.galleryPageSize;
    const end = Math.min(list.length, start + state.galleryPageSize);

    let html = '';
    for (let i = start; i < end; i++) {
      const item = list[i];
      const isVideo = item.y === 'v';
      html += `
        <div class="gallery-grid-item" onclick="window.viewMediaInLightbox('${item.u}', '${item.y}', ${item.i})">
          ${isVideo
            ? `<video src="${item.u}" preload="metadata" muted playsinline></video><div class="gallery-video-icon">▶ 영상</div>`
            : `<img src="${item.u}" loading="lazy" alt="media" onerror="this.parentElement.style.display='none';">`
          }
        </div>
      `;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    while (tempDiv.firstChild) {
      el.galleryGrid.appendChild(tempDiv.firstChild);
    }
  }

  // Infinite scroll in gallery
  function handleGalleryScroll() {
    const grid = el.galleryGrid;
    if (grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 300) {
      const list = getFilteredMedia();
      if ((state.galleryPage + 1) * state.galleryPageSize < list.length) {
        state.galleryPage++;
        renderGalleryChunk();
      }
    }
  }

  // Global Close Modal Helpers (Called directly from onclick as well as event listeners)
  window.closeAnyModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  };

  window.closeLightbox = function () {
    closeLightbox();
  };

  window.closeSearchBar = function () {
    if (el.searchBarContainer) {
      el.searchBarContainer.classList.remove('active');
    }
  };

  // ============================================================
  // Lightbox Modal
  // ============================================================

  window.viewMediaInLightbox = function (uri, type, messageIdx) {
    state.currentLightboxMedia = { uri, type, messageIdx };
    if (type === 'v') {
      el.lightboxContent.innerHTML = `<video src="${uri}" controls autoplay playsinline class="lightbox-video"></video>`;
    } else {
      el.lightboxContent.innerHTML = `<img src="${uri}" class="lightbox-img" alt="lightbox view">`;
    }
    el.lightboxOverlay.classList.add('active');
  };

  function closeLightbox() {
    el.lightboxOverlay.classList.remove('active');
    el.lightboxContent.innerHTML = '';
    state.currentLightboxMedia = null;
  }

  function jumpFromLightbox() {
    if (state.currentLightboxMedia && state.currentLightboxMedia.messageIdx !== undefined) {
      const idx = state.currentLightboxMedia.messageIdx;
      closeLightbox();
      closeModal(el.galleryModal);
      jumpToIndex(idx, true);
    }
  }

  // ============================================================
  // Audio Voice Note Player Helper
  // ============================================================

  window.toggleAudioPlay = function (audioId, event) {
    event.stopPropagation();
    const audio = document.getElementById(audioId);
    const btn = document.getElementById(`btn_${audioId}`);
    const label = document.getElementById(`label_${audioId}`);
    if (!audio) return;

    if (audio.paused) {
      // Pause any other playing audio
      document.querySelectorAll('audio').forEach(a => {
        if (a !== audio && !a.paused) {
          a.pause();
          const oBtn = document.getElementById(`btn_${a.id}`);
          if (oBtn) oBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
        }
      });

      audio.play();
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;

      audio.ontimeupdate = () => {
        const cur = Math.floor(audio.currentTime);
        const m = Math.floor(cur / 60);
        const s = String(cur % 60).padStart(2, '0');
        label.textContent = `${m}:${s}`;
      };
    } else {
      audio.pause();
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    }
  };

  window.onAudioEnded = function (audioId) {
    const btn = document.getElementById(`btn_${audioId}`);
    if (btn) {
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    }
  };

  // Copy message text helper
  window.copyMessageText = function (idx) {
    const m = state.data.messages[idx];
    if (m && m.c) {
      navigator.clipboard.writeText(m.c).then(() => {
        showToast('메시지가 복사되었습니다');
      }).catch(() => {});
    }
  };

  function showToast(text) {
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(40, 40, 40, 0.9);
      color: #fff;
      padding: 8px 18px;
      border-radius: 20px;
      font-size: 13px;
      z-index: 1000;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
      animation: popIn 0.2s ease;
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1600);
  }

  // ============================================================
  // Theme & Settings
  // ============================================================

  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('insta_theme', theme);
    if (el.settingThemeToggle) {
      el.settingThemeToggle.checked = theme === 'dark';
    }
  }

  function applyDeviceMode(mode) {
    state.deviceMode = mode;
    el.appWrapper.classList.remove('device-desktop', 'device-mobile');
    el.appWrapper.classList.add(`device-${mode}`);
    localStorage.setItem('insta_device', mode);
  }

  function applyBubbleColor(color) {
    state.bubbleColor = color;
    localStorage.setItem('insta_bubble_color', color);
    const root = document.documentElement;
    if (color === 'purple') {
      root.style.setProperty('--gradient-bubble-sent', 'linear-gradient(135deg, #7F00FF 0%, #E100FF 100%)');
    } else if (color === 'insta') {
      root.style.setProperty('--gradient-bubble-sent', 'linear-gradient(45deg, #f09433 0%, #dc2743 50%, #bc1888 100%)');
    } else if (color === 'ocean') {
      root.style.setProperty('--gradient-bubble-sent', 'linear-gradient(135deg, #0095f6 0%, #00b4d8 100%)');
    } else if (color === 'sunset') {
      root.style.setProperty('--gradient-bubble-sent', 'linear-gradient(135deg, #ff512f 0%, #dd2476 100%)');
    }
    if (el.bubbleColorSelect) el.bubbleColorSelect.value = color;
  }

  // ============================================================
  // Modal Utilities
  // ============================================================

  function openModal(modal) {
    modal.classList.add('active');
  }

  function closeModal(modal) {
    modal.classList.remove('active');
  }

  // ============================================================
  // Event Bindings
  // ============================================================

  function bindEvents() {
    // Virtual Scroll Listener
    el.messagesViewport.addEventListener('scroll', handleScroll, { passive: true });

    // Scroll Control Buttons
    el.btnScrollTop.addEventListener('click', () => {
      jumpToIndex(0, false);
    });

    el.btnScrollBottom.addEventListener('click', () => {
      jumpToIndex(state.total - 1, false);
      setTimeout(() => {
        el.messagesViewport.scrollTop = el.messagesViewport.scrollHeight;
      }, 100);
    });

    // Search Controls
    if (el.btnToggleSearch) {
      el.btnToggleSearch.addEventListener('click', () => {
        el.searchBarContainer.classList.toggle('active');
        if (el.searchBarContainer.classList.contains('active')) {
          el.searchInput.focus();
        }
      });
    }

    if (el.btnCloseSearch) {
      el.btnCloseSearch.addEventListener('click', () => {
        el.searchBarContainer.classList.remove('active');
      });
    }

    if (el.searchInput) {
      el.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') performSearch();
      });
    }

    if (el.btnSearchNext) el.btnSearchNext.addEventListener('click', searchNext);
    if (el.btnSearchPrev) el.btnSearchPrev.addEventListener('click', searchPrev);

    // Date Modal
    if (el.btnOpenDateModal) el.btnOpenDateModal.addEventListener('click', () => openModal(el.dateModal));
    if (el.btnJumpToExactDate) el.btnJumpToExactDate.addEventListener('click', jumpToExactDate);

    // Media Gallery Modal
    if (el.btnOpenGallery) el.btnOpenGallery.addEventListener('click', openMediaGallery);
    if (el.galleryGrid) el.galleryGrid.addEventListener('scroll', handleGalleryScroll, { passive: true });

    document.querySelectorAll('.gallery-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.gallery-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.galleryFilter = tab.getAttribute('data-filter');
        state.galleryPage = 0;
        el.galleryGrid.innerHTML = '';
        el.galleryGrid.scrollTop = 0;
        renderGalleryChunk();
      });
    });

    // Lightbox Controls
    if (el.btnLightboxClose) el.btnLightboxClose.addEventListener('click', closeLightbox);
    if (el.lightboxOverlay) {
      el.lightboxOverlay.addEventListener('click', (e) => {
        if (e.target === el.lightboxOverlay) closeLightbox();
      });
    }
    if (el.btnLightboxJump) el.btnLightboxJump.addEventListener('click', jumpFromLightbox);

    // Device Mode Toggle (Desktop / Mobile Frame)
    if (el.btnToggleDevice) {
      el.btnToggleDevice.addEventListener('click', () => {
        const newMode = state.deviceMode === 'desktop' ? 'mobile' : 'desktop';
        applyDeviceMode(newMode);
      });
    }

    // Theme Toggle
    if (el.btnToggleTheme) {
      el.btnToggleTheme.addEventListener('click', () => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme(newTheme);
      });
    }

    // Settings Modal
    if (el.btnOpenSettings) el.btnOpenSettings.addEventListener('click', () => openModal(el.settingsModal));
    if (el.partnerInfoBtn) el.partnerInfoBtn.addEventListener('click', () => openModal(el.settingsModal));
    if (el.headerAvatarBtn) el.headerAvatarBtn.addEventListener('click', () => openModal(el.settingsModal));

    // Perspective Selector
    if (el.perspectiveSelect) {
      el.perspectiveSelect.addEventListener('change', (e) => {
        state.mySenderIdx = parseInt(e.target.value, 10);
        localStorage.setItem('insta_perspective', state.mySenderIdx);
        updateHeaderInfo();
        renderRange(state.startIndex, state.endIndex, 'replace');
      });
    }

    // Setting Theme Toggle switch
    if (el.settingThemeToggle) {
      el.settingThemeToggle.addEventListener('change', (e) => {
        applyTheme(e.target.checked ? 'dark' : 'light');
      });
    }

    // Bubble Color Selector
    if (el.bubbleColorSelect) {
      el.bubbleColorSelect.addEventListener('change', (e) => {
        applyBubbleColor(e.target.value);
      });
    }

    // Avatar File Input
    if (el.avatarFileInput) {
      el.avatarFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            state.customAvatar = event.target.result;
            localStorage.setItem('insta_partner_avatar', state.customAvatar);
            updateHeaderInfo();
            renderRange(state.startIndex, state.endIndex, 'replace');
          };
          reader.readAsDataURL(file);
        }
      });
    }

    // Close Modal Buttons (Delegated and direct)
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-target');
        const modal = document.getElementById(targetId);
        if (modal) closeModal(modal);
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    // Keyboard Shortcuts (Esc to close modals, Arrow keys in search)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (el.lightboxOverlay && el.lightboxOverlay.classList.contains('active')) closeLightbox();
        document.querySelectorAll('.modal-backdrop.active').forEach(m => closeModal(m));
        if (el.searchBarContainer && el.searchBarContainer.classList.contains('active')) {
          el.searchBarContainer.classList.remove('active');
        }
      }
    });
  }

  // Initialize on DOM load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
