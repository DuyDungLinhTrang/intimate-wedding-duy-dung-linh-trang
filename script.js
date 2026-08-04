const body = document.body;
const cover = document.querySelector('#cover');
let invitationOpened = false;

function openInvitation() {
  if (invitationOpened) return;
  invitationOpened = true;
  cover.classList.add('opening');
  cover.setAttribute('aria-disabled', 'true');
  window.setTimeout(() => cover.classList.add('revealing'), 720);
  window.setTimeout(() => {
    body.classList.remove('locked');
    cover.setAttribute('aria-hidden', 'true');
    cover.removeAttribute('tabindex');
  }, 1220);
}

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
  venueTimer = window.setInterval(showNextVenueSlide, 3000);
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
const galleryCount = document.querySelector('#gallery-count');

function currentGalleryIndex() {
  const center = gallery.scrollLeft + gallery.clientWidth / 2;
  let closest = 0;
  let distance = Infinity;
  cards.forEach((card, index) => {
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
  const index = currentGalleryIndex();
  cards.forEach((card, cardIndex) => card.classList.toggle('is-center', index === cardIndex));
  galleryCount.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}`;
}

function moveGallery(direction) {
  const target = Math.max(0, Math.min(cards.length - 1, currentGalleryIndex() + direction));
  cards[target].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
}

gallery.addEventListener('scroll', () => requestAnimationFrame(updateGallery), { passive: true });
gallery.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowRight') moveGallery(1);
  if (event.key === 'ArrowLeft') moveGallery(-1);
});
document.querySelector('#gallery-prev').addEventListener('click', () => moveGallery(-1));
document.querySelector('#gallery-next').addEventListener('click', () => moveGallery(1));
window.addEventListener('resize', updateGallery);
updateGallery();

const lightbox = document.querySelector('#lightbox');
const lightboxImage = document.querySelector('#lightbox-image');
cards.forEach((card) => card.addEventListener('click', () => {
  lightboxImage.src = card.dataset.full;
  lightboxImage.alt = card.querySelector('img').alt;
  lightbox.showModal();
}));
document.querySelector('#lightbox-close').addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) lightbox.close();
});
