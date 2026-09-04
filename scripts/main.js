const preloader = document.getElementById('preloader');
function hidePreloader() {
  if (preloader && !preloader.classList.contains('loaded')) {
    preloader.classList.add('loaded');
  }
}

// 1. Снимаем прелоадер сразу после отрисовки DOM и завершения лазерной анимации (~850мс)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(hidePreloader, 850));
} else {
  setTimeout(hidePreloader, 850);
}

// 2. Страховочный предохранитель от подвисаний мобильной сети (максимум 1.5 сек)
setTimeout(hidePreloader, 1500);

// Появление при скролле
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if(entry.isIntersecting) entry.target.classList.add('visible');
  });
},{threshold: 0.12});
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// АВТОМАТИЧЕСКОЕ КЛОНИРОВАНИЕ ДЛЯ БЕСШОВНОЙ КАРУСЕЛИ
const reelsTrack = document.getElementById('reelsTrack');
if (reelsTrack) {
  const originalReels = Array.from(reelsTrack.children);
  originalReels.forEach(reel => {
    const clone = reel.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    reelsTrack.appendChild(clone);
  });
}

// Кастомный курсор
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');

if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  window.addEventListener('mousemove', (e) => {
    const posX = e.clientX;
    const posY = e.clientY;
    
    cursorDot.style.left = `${posX}px`;
    cursorDot.style.top = `${posY}px`;
    
    cursorOutline.animate({
      left: `${posX}px`,
      top: `${posY}px`
    }, { duration: 500, fill: "forwards" });
  });

  document.querySelectorAll('a, button, .hover-target, .reel').forEach(target => {
    target.addEventListener('mouseenter', () => {
      cursorOutline.style.width = '60px';
      cursorOutline.style.height = '60px';
      cursorOutline.style.backgroundColor = 'rgba(0, 229, 255, 0.1)';
    });
    target.addEventListener('mouseleave', () => {
      cursorOutline.style.width = '40px';
      cursorOutline.style.height = '40px';
      cursorOutline.style.backgroundColor = 'transparent';
    });
  });
}

// МАГНИТНЫЙ ЭФФЕКТ ДЛЯ БЕЙДЖА
const heroBadge = document.getElementById('heroBadge');
if (heroBadge && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  heroBadge.addEventListener('mousemove', (e) => {
    const rect = heroBadge.getBoundingClientRect();
    const badgeCenterX = rect.left + rect.width / 2;
    const badgeCenterY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - badgeCenterX) * 0.35;
    const deltaY = (e.clientY - badgeCenterY) * 0.35;
    heroBadge.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  });

  heroBadge.addEventListener('mouseleave', () => {
    heroBadge.style.transform = 'translate(0px, 0px)';
  });
}

// =========================================
// ДВИЖОК КАРУСЕЛИ: АВТОСКРОЛЛ + DRAG & SWIPE + ТАЧПАД
// =========================================
const filmTrackArea = document.getElementById('filmTrackArea');
const edgeCodeTracks = document.querySelectorAll('.edge-code-track');

let positionX = 0;
let autoSpeed = 48; // пикселей в секунду
let isPaused = false;
let isDragging = false;
let startPointerX = 0;
let dragStartPosition = 0;
let hasDragged = false;
let halfWidth = 0;

function calculateDimensions() {
  if (reelsTrack) {
    halfWidth = reelsTrack.scrollWidth / 2;
  }
}
window.addEventListener('load', calculateDimensions);
window.addEventListener('resize', calculateDimensions);

// Единый цикл анимации (requestAnimationFrame)
let lastTimestamp = performance.now();
function renderCarousel(now) {
  const delta = (now - lastTimestamp) / 1000;
  lastTimestamp = now;

  if (!isPaused && !isDragging) {
    positionX -= autoSpeed * delta;
  }

  // Бесшовный бесконечный цикл в обе стороны
  if (halfWidth > 0) {
    while (positionX <= -halfWidth) positionX += halfWidth;
    while (positionX > 0) positionX -= halfWidth;
  }

  // Обновление позиции видеокадров
  if (reelsTrack) {
    reelsTrack.style.transform = `translate3d(${positionX}px, 0, 0)`;
  }

  // Синхронизация таймкода киноплёнки
  edgeCodeTracks.forEach(track => {
    const trackHalf = track.scrollWidth / 2;
    let trackPos = halfWidth > 0 ? (positionX * (trackHalf / halfWidth)) : positionX;
    if (trackHalf > 0) {
      while (trackPos <= -trackHalf) trackPos += trackHalf;
      while (trackPos > 0) trackPos -= trackHalf;
    }
    track.style.transform = `translate3d(${trackPos}px, 0, 0)`;
  });

  requestAnimationFrame(renderCarousel);
}
requestAnimationFrame(renderCarousel);

// Обработка Drag мышкой и Swipe пальцем (Pointer Events)
if (filmTrackArea) {
  filmTrackArea.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startPointerX = e.clientX;
    dragStartPosition = positionX;
    hasDragged = false;
    filmTrackArea.classList.add('is-dragging');
    filmTrackArea.setPointerCapture(e.pointerId);
  });

  filmTrackArea.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const diff = e.clientX - startPointerX;
    if (Math.abs(diff) > 4) {
      hasDragged = true;
    }
    positionX = dragStartPosition + diff;
  });

  const stopDragging = (e) => {
    if (!isDragging) return;
    isDragging = false;
    filmTrackArea.classList.remove('is-dragging');
    try {
      filmTrackArea.releasePointerCapture(e.pointerId);
    } catch(err) {}
  };

  filmTrackArea.addEventListener('pointerup', stopDragging);
  filmTrackArea.addEventListener('pointercancel', stopDragging);

  // Скролл тачпадом (горизонтальный жест двумя пальцами)
  filmTrackArea.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey) {
      e.preventDefault();
      positionX -= (e.deltaX || e.deltaY);
    }
  }, { passive: false });

  // Пауза при наведении мыши на десктопе
  filmTrackArea.addEventListener('mouseenter', () => { isPaused = true; });
  filmTrackArea.addEventListener('mouseleave', () => {
    const anyVideoPlaying = Array.from(document.querySelectorAll('.portfolio-video')).some(v => !v.paused);
    if (!anyVideoPlaying) isPaused = false;
  });
}

// =========================================
// ЛОГИКА ЗВУКА И ВОСПРОИЗВЕДЕНИЯ ВИДЕО
// =========================================
const allReels = document.querySelectorAll('.reel');
const soundBtn = document.getElementById('soundBtn');
let isSoundEnabled = false;

const allVideos = document.querySelectorAll('.portfolio-video');
allVideos.forEach(v => {
  v.volume = 0;
  v.muted = true;
  v.addEventListener('loadedmetadata', () => {
    if (v.currentTime === 0) {
      v.currentTime = 0.001;
    }
  });
});

soundBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  isSoundEnabled = !isSoundEnabled;
  if(isSoundEnabled) {
    soundBtn.textContent = 'Sound: ON';
    soundBtn.classList.add('active');
    allVideos.forEach(v => { v.muted = false; });
  } else {
    soundBtn.textContent = 'Sound: OFF';
    soundBtn.classList.remove('active');
    allVideos.forEach(v => { v.muted = true; v.volume = 0; });
  }
});

function fadeInAudio(videoElement) {
  if(!isSoundEnabled) return;
  videoElement.volume = 0;
  let vol = 0;
  const fadeAudio = setInterval(() => {
    if (vol < 0.9) {
      vol += 0.1;
      videoElement.volume = vol.toFixed(1);
    } else {
      clearInterval(fadeAudio);
    }
  }, 50);
}

function fadeOutAudio(videoElement, callback) {
  if(!isSoundEnabled) {
    if(callback) callback();
    return;
  }
  let vol = videoElement.volume;
  const fadeAudio = setInterval(() => {
    if (vol > 0.1) {
      vol -= 0.1;
      videoElement.volume = vol.toFixed(1);
    } else {
      clearInterval(fadeAudio);
      videoElement.volume = 0;
      if(callback) callback();
    }
  }, 30);
}

// Управление воспроизведением (Desktop Hover & Mobile Tap)
allReels.forEach(reel => {
  const video = reel.querySelector('.portfolio-video');
  if(!video) return;

  // 1. Десктоп (воспроизведение при наведении)
  reel.addEventListener('mouseenter', () => {
    isPaused = true;
    reel.classList.add('is-playing');
    video.play().then(() => {
      fadeInAudio(video);
    }).catch(() => {});
  });
  
  reel.addEventListener('mouseleave', () => {
    reel.classList.remove('is-playing');
    fadeOutAudio(video, () => {
      video.pause();
    });
    const anyPlaying = Array.from(allVideos).some(v => !v.paused);
    if (!anyPlaying && !filmTrackArea.matches(':hover')) {
      isPaused = false;
    }
  });

  // 2. Мобильные устройства (тап без перетаскивания)
  reel.addEventListener('click', () => {
    if (hasDragged) return;

    if (video.paused) {
      allVideos.forEach(otherVideo => {
        if(otherVideo !== video) {
          otherVideo.pause();
          otherVideo.closest('.reel')?.classList.remove('is-playing');
        }
      });

      isPaused = true;
      reel.classList.add('is-playing');
      video.play().then(() => {
        fadeInAudio(video);
      }).catch(() => {});
    } else {
      reel.classList.remove('is-playing');
      fadeOutAudio(video, () => {
        video.pause();
        isPaused = false;
      });
    }
  });
});