const body = document.body;
const cover = document.querySelector('#cover');
const coverWipe = cover.querySelector('.cover__wipe');
const backgroundMusic = document.querySelector('#background-music');
const musicToggle = document.querySelector('#music-toggle');
let invitationOpened = false;
let invitationReady = false;
let musicFadeFrame;
let resumeMusicOnReturn = false;

const progressiveImages = [...document.querySelectorAll('img[loading="lazy"]:not(.photo-card img)')];

progressiveImages.forEach((image) => {
  const source = image.getAttribute('src');
  if (!source) return;
  image.dataset.progressiveSrc = source;
  image.removeAttribute('src');
});

function loadProgressiveImage(image) {
  const source = image.dataset.progressiveSrc;
  if (!source) return;
  image.src = source;
  image.removeAttribute('data-progressive-src');
}

const progressiveImageObserver = new IntersectionObserver((entries, observer) => {
  entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => {
      const position = a.target.compareDocumentPosition(b.target);
      return position & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    })
    .forEach((entry) => {
      loadProgressiveImage(entry.target);
      observer.unobserve(entry.target);
    });
}, { rootMargin: '140% 0px', threshold: 0.01 });

progressiveImages.forEach((image) => progressiveImageObserver.observe(image));

function updateMusicButton(isPlaying) {
  musicToggle.classList.toggle('is-playing', isPlaying);
  musicToggle.setAttribute('aria-pressed', String(isPlaying));
  musicToggle.setAttribute('aria-label', isPlaying ? 'Pause music' : 'Play music');
}

function fadeMusic(targetVolume, duration, onComplete) {
  window.cancelAnimationFrame(musicFadeFrame);
  const startingVolume = backgroundMusic.volume;
  const startedAt = performance.now();

  function updateVolume(timestamp) {
    const progress = Math.min((timestamp - startedAt) / duration, 1);
    backgroundMusic.volume = startingVolume + (targetVolume - startingVolume) * progress;
    if (progress < 1) musicFadeFrame = window.requestAnimationFrame(updateVolume);
    else if (onComplete) onComplete();
  }

  musicFadeFrame = window.requestAnimationFrame(updateVolume);
}

async function playMusic() {
  try {
    backgroundMusic.volume = 0;
    await backgroundMusic.play();
    updateMusicButton(true);
    fadeMusic(1, 1800);
  } catch {
    updateMusicButton(false);
  }
}

function pauseMusic(fadeDuration = 500) {
  fadeMusic(0, fadeDuration, () => {
    backgroundMusic.pause();
    updateMusicButton(false);
  });
}

musicToggle.addEventListener('click', () => {
  if (backgroundMusic.paused) playMusic();
  else pauseMusic(650);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    resumeMusicOnReturn = !backgroundMusic.paused;
    if (resumeMusicOnReturn) pauseMusic(350);
  } else if (resumeMusicOnReturn) {
    resumeMusicOnReturn = false;
    playMusic();
  }
});

function finishOpening() {
  if (invitationReady) return;
  invitationReady = true;
  cover.classList.add('is-complete');
  cover.setAttribute('aria-hidden', 'true');
  cover.removeAttribute('tabindex');
  body.classList.add('invitation-ready');
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => body.classList.remove('locked'));
  });
}

function holdOpeningScroll(event) {
  if (body.classList.contains('locked')) event.preventDefault();
}

document.addEventListener('touchmove', holdOpeningScroll, { passive: false });
document.addEventListener('wheel', holdOpeningScroll, { passive: false });

function openInvitation() {
  if (invitationOpened) {
    finishOpening();
    return;
  }
  invitationOpened = true;
  musicToggle.classList.add('is-ready');
  playMusic();
  cover.classList.add('opening');
  cover.setAttribute('aria-disabled', 'true');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const openingDuration = reducedMotion ? 1200 : 4000;
  window.setTimeout(() => cover.classList.add('revealing'), reducedMotion ? 400 : 1210);
  window.setTimeout(finishOpening, openingDuration + 300);
}

coverWipe.addEventListener('animationend', (event) => {
  if (event.animationName === 'coverWipe') finishOpening();
});

cover.addEventListener('click', openInvitation);
cover.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openInvitation();
  }
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.16, rootMargin: '0px 0px -5% 0px' });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const imageMotionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-in-view');
      imageMotionObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.18 });

document.querySelectorAll('.cinematic, .finale').forEach((section) => imageMotionObserver.observe(section));

const typedInvitationParagraphs = [
  document.querySelector('#typed-invitation-lead'),
  document.querySelector('#typed-invitation')
].map((element) => {
  const text = element.textContent.trim();
  element.style.minHeight = `${element.getBoundingClientRect().height}px`;
  element.setAttribute('aria-label', text);
  element.textContent = '';
  element.classList.add('typewriter');
  return { element, text };
});
let typingStarted = false;
let typingFinished = false;
let typingCancelled = false;

function finishTypedInvitation() {
  typingCancelled = true;
  typingFinished = true;
  typedInvitationParagraphs.forEach(({ element, text }) => {
    element.textContent = text;
    element.classList.remove('is-typing');
  });
}

function typeParagraph({ element, text }, duration = 2500) {
  return new Promise((resolve) => {
    let startedAt;
    element.classList.add('is-typing');

    function typeNextFrame(timestamp) {
      if (typingCancelled) {
        element.textContent = text;
        element.classList.remove('is-typing');
        resolve();
        return;
      }
      if (!startedAt) startedAt = timestamp;
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const visibleCharacters = Math.floor(progress * text.length);
      element.textContent = text.slice(0, visibleCharacters);

      if (progress < 1) {
        window.requestAnimationFrame(typeNextFrame);
      } else {
        element.classList.remove('is-typing');
        resolve();
      }
    }

    window.requestAnimationFrame(typeNextFrame);
  });
}

const typewriterObserver = new IntersectionObserver(async ([entry], observer) => {
  if (!entry.isIntersecting) return;

  observer.unobserve(entry.target);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    finishTypedInvitation();
    return;
  }

  typingStarted = true;
  for (const paragraph of typedInvitationParagraphs) {
    await typeParagraph(paragraph, 2500);
    if (typingCancelled) break;
  }
  typingFinished = true;
}, { threshold: 0.55 });

typewriterObserver.observe(document.querySelector('.invitation__copy'));

window.addEventListener('scroll', () => {
  if (!typingStarted || typingFinished) return;
  const invitationBounds = document.querySelector('.invitation').getBoundingClientRect();
  if (invitationBounds.bottom < 80 || invitationBounds.top > window.innerHeight - 80) finishTypedInvitation();
}, { passive: true });

const venue = document.querySelector('.venue');
const venueSlides = [...document.querySelectorAll('.venue__slide')];
let venueIndex = 0;
let venueTimer;

function showNextVenueSlide() {
  venueSlides[venueIndex].classList.remove('is-active');
  venueIndex = (venueIndex + 1) % venueSlides.length;
  venueSlides[venueIndex].classList.add('is-active');
}

function startVenueSlideshow() {
  if (venueTimer) return;
  venueTimer = window.setInterval(showNextVenueSlide, 4800);
}

function stopVenueSlideshow() {
  window.clearInterval(venueTimer);
  venueTimer = undefined;
}

const venueObserver = new IntersectionObserver(([entry]) => {
  if (entry.isIntersecting) startVenueSlideshow();
  else stopVenueSlideshow();
}, { threshold: 0.18 });
venueObserver.observe(venue);

document.querySelector('#save-date').addEventListener('click', () => {
  const content = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Duy Dung and Linh Trang//Wedding Invitation//EN',
    'BEGIN:VEVENT',
    'UID:duydung-linhtrang-20260926@wedding',
    'DTSTAMP:20260804T000000Z',
    'DTSTART;TZID=Asia/Ho_Chi_Minh:20260926T170000',
    'DTEND;TZID=Asia/Ho_Chi_Minh:20260926T200000',
    'SUMMARY:Duy Dũng & Linh Trang — An Intimate Wedding Celebration',
    'LOCATION:Second Floor\\, 51 Hang Bo Street\\, Hanoi\\, Vietnam',
    'DESCRIPTION:Following our wedding on September 20\\, join us for a relaxed evening of love\\, laughter\\, and celebration.',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'Duy-Dung-Linh-Trang-Wedding.ics';
  link.click();
  URL.revokeObjectURL(link.href);
});

const gallery = document.querySelector('#gallery-track');
const cards = [...document.querySelectorAll('.photo-card')];
const initiallyLoadedGalleryIndexes = new Set([9, 10, 11]);

cards.forEach((card, index) => {
  const image = card.querySelector('img');
  const source = image.getAttribute('src');
  card.dataset.galleryIndex = index;
  image.dataset.src = source;
  image.removeAttribute('src');

  if (initiallyLoadedGalleryIndexes.has(index)) {
    image.loading = 'eager';
    image.fetchPriority = index === 10 ? 'high' : 'auto';
  } else {
    image.loading = 'lazy';
  }
});
cards.forEach((card) => gallery.append(card.cloneNode(true)));
cards.slice().reverse().forEach((card) => gallery.prepend(card.cloneNode(true)));
const galleryCards = [...gallery.querySelectorAll('.photo-card')];

function loadGalleryCard(card) {
  const image = card.querySelector('img[data-src]');
  if (!image) return;
  image.src = image.dataset.src;
  image.removeAttribute('data-src');
}

const gallerySectionObserver = new IntersectionObserver(([entry], observer) => {
  if (!entry.isIntersecting) return;
  galleryCards
    .filter((card) => initiallyLoadedGalleryIndexes.has(Number(card.dataset.galleryIndex)))
    .forEach(loadGalleryCard);
  observer.unobserve(entry.target);
}, { rootMargin: '120% 0px', threshold: 0.01 });

gallerySectionObserver.observe(document.querySelector('#gallery'));

const galleryImageObserver = new IntersectionObserver((entries, observer) => {
  entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => {
      const galleryCenter = gallery.getBoundingClientRect().left + gallery.clientWidth / 2;
      const aBounds = a.target.getBoundingClientRect();
      const bBounds = b.target.getBoundingClientRect();
      const aDistance = Math.abs(aBounds.left + aBounds.width / 2 - galleryCenter);
      const bDistance = Math.abs(bBounds.left + bBounds.width / 2 - galleryCenter);
      return aDistance - bDistance;
    })
    .forEach((entry) => {
      loadGalleryCard(entry.target);
      observer.unobserve(entry.target);
    });
}, { root: gallery, rootMargin: '0px 75%', threshold: 0.01 });

galleryCards.forEach((card) => {
  if (card.querySelector('img[data-src]')) galleryImageObserver.observe(card);
});

function currentGalleryCardIndex() {
  const center = gallery.scrollLeft + gallery.clientWidth / 2;
  let closest = 0;
  let distance = Infinity;
  galleryCards.forEach((card, index) => {
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    const nextDistance = Math.abs(cardCenter - center);
    if (nextDistance < distance) {
      closest = index;
      distance = nextDistance;
    }
  });
  return closest;
}

function updateGallery() {
  const index = currentGalleryCardIndex();
  galleryCards.forEach((card, cardIndex) => card.classList.toggle('is-center', index === cardIndex));
}

function moveGallery(direction) {
  const targetIndex = (currentGalleryCardIndex() + direction + galleryCards.length) % galleryCards.length;
  const target = galleryCards[targetIndex];
  gallery.scrollTo({
    left: target.offsetLeft - (gallery.clientWidth - target.offsetWidth) / 2,
    behavior: 'smooth'
  });
}

let galleryScrollTimer;
gallery.addEventListener('scroll', () => {
  requestAnimationFrame(updateGallery);
  window.clearTimeout(galleryScrollTimer);
  galleryScrollTimer = window.setTimeout(() => {
    const index = currentGalleryCardIndex();
    let equivalentIndex = index;
    if (index < cards.length) equivalentIndex += cards.length;
    if (index >= cards.length * 2) equivalentIndex -= cards.length;
    if (equivalentIndex !== index) {
      const target = galleryCards[equivalentIndex];
      gallery.scrollLeft = target.offsetLeft - (gallery.clientWidth - target.offsetWidth) / 2;
      updateGallery();
    }
  }, 120);
}, { passive: true });
gallery.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') moveGallery(1);
  if (event.key === 'ArrowLeft') moveGallery(-1);
});
document.querySelector('#gallery-prev').addEventListener('click', () => moveGallery(-1));
document.querySelector('#gallery-next').addEventListener('click', () => moveGallery(1));
window.addEventListener('resize', updateGallery);
window.requestAnimationFrame(() => {
  const startingCard = galleryCards[cards.length + 10];
  gallery.scrollLeft = startingCard.offsetLeft - (gallery.clientWidth - startingCard.offsetWidth) / 2;
  updateGallery();
});

const lightbox = document.querySelector('#lightbox');
const lightboxImage = document.querySelector('#lightbox-image');
gallery.addEventListener('click', (event) => {
  const card = event.target.closest('.photo-card');
  if (!card) return;
  lightboxImage.src = card.dataset.full;
  lightboxImage.alt = card.querySelector('img').alt;
  lightbox.showModal();
});
document.querySelector('#lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) lightbox.close();
});
lightbox.addEventListener('cancel', () => lightbox.close());

let lightboxTouchStartY = 0;
lightbox.addEventListener('touchstart', (event) => {
  lightboxTouchStartY = event.changedTouches[0].clientY;
}, { passive: true });
lightbox.addEventListener('touchend', (event) => {
  const distance = event.changedTouches[0].clientY - lightboxTouchStartY;
  if (distance > 90) lightbox.close();
}, { passive: true });

const scrollProgressBar = document.querySelector('#scroll-progress-bar');
let progressFrame;

function updateScrollProgress() {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
  scrollProgressBar.style.transform = `scaleY(${Math.min(Math.max(progress, 0), 1)})`;
  progressFrame = undefined;
}

window.addEventListener('scroll', () => {
  if (!progressFrame) progressFrame = window.requestAnimationFrame(updateScrollProgress);
}, { passive: true });
window.addEventListener('resize', updateScrollProgress);
updateScrollProgress();
