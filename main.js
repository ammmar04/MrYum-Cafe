// MrYum Cafe — Interactions

// DOM helpers
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

// Focus trap utility
function createFocusTrap(container){
  let lastFocused = document.activeElement;
  const focusables = () => $$('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])', container)
    .filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
  function onKey(e){
    if(e.key !== 'Tab') return;
    const items = focusables();
    if(items.length === 0) return;
    const first = items[0], last = items[items.length - 1];
    if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
    else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
  }
  function activate(){
    container.addEventListener('keydown', onKey);
    const items = focusables();
    (items[0] || container).focus();
  }
  function deactivate(){
    container.removeEventListener('keydown', onKey);
    if(lastFocused && document.body.contains(lastFocused)) lastFocused.focus();
  }
  return { activate, deactivate };
}

// Backdrop
const backdrop = $('#backdrop');
function showBackdrop(){ backdrop.hidden = false; requestAnimationFrame(()=>backdrop.style.opacity = '1'); }
function hideBackdrop(){ backdrop.style.opacity = '0'; setTimeout(()=>backdrop.hidden = true, 180); }

// Sticky header shadow
const header = $('#site-header');
function onScroll(){
  if(window.scrollY > 8) header.classList.add('shadow');
  else header.classList.remove('shadow');
}
window.addEventListener('scroll', onScroll);
onScroll();

// Mobile Drawer
const mobileDrawer = $('#mobile-drawer');
const navOpen = $('#nav-open');
let mobileTrap;
function openDrawer(drawer){
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden','false');
  document.body.classList.add('no-scroll');
  showBackdrop();
  const trap = createFocusTrap(drawer);
  trap.activate();
  if(drawer === mobileDrawer) mobileTrap = trap;
  if(drawer === cartDrawer) cartTrap = trap;
}
function closeDrawer(drawer){
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden','true');
  document.body.classList.remove('no-scroll');
  hideBackdrop();
  if(drawer === mobileDrawer && mobileTrap){ mobileTrap.deactivate(); mobileTrap = null; }
  if(drawer === cartDrawer && cartTrap){ cartTrap.deactivate(); cartTrap = null; }
}
navOpen?.addEventListener('click', ()=>{
  openDrawer(mobileDrawer);
  navOpen.setAttribute('aria-expanded','true');
});
$$('[data-close="mobile-drawer"]').forEach(btn=>btn.addEventListener('click', ()=>{
  closeDrawer(mobileDrawer);
  navOpen.setAttribute('aria-expanded','false');
}));

// Backdrop click closes any open drawer/modal
backdrop.addEventListener('click', ()=>{
  [mobileDrawer, cartDrawer].forEach(d => {
    if(d.classList.contains('open')) closeDrawer(d);
  });
  if(searchModal.classList.contains('open')) closeModal(searchModal);
});

// Search Modal
const searchOpen = $('#search-open');
const searchModal = $('#search-modal');
let searchTrap;
function openModal(modal){
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('no-scroll');
  showBackdrop();
  const trap = createFocusTrap(modal);
  trap.activate();
  if(modal === searchModal) searchTrap = trap;
  const input = modal.querySelector('input[autofocus]') || modal.querySelector('input[type="search"]');
  if(input) setTimeout(()=> input.focus(), 10);
}
function closeModal(modal){
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  document.body.classList.remove('no-scroll');
  hideBackdrop();
  if(modal === searchModal && searchTrap){ searchTrap.deactivate(); searchTrap = null; }
}
searchOpen?.addEventListener('click', ()=>{
  openModal(searchModal);
  searchOpen.setAttribute('aria-expanded','true');
});
$$('[data-close="search-modal"]').forEach(btn=>btn.addEventListener('click', ()=>{
  closeModal(searchModal);
  searchOpen.setAttribute('aria-expanded','false');
}));

// ESC to close overlays
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape'){
    if(searchModal.classList.contains('open')) closeModal(searchModal);
    if(mobileDrawer.classList.contains('open')) closeDrawer(mobileDrawer);
    if($('#cart-drawer').classList.contains('open')) closeDrawer($('#cart-drawer'));
  }
});

// Smooth scroll for hero CTA
$$('[data-scroll]').forEach(el=>{
  el.addEventListener('click', (e)=>{
    e.preventDefault();
    const target = $(el.getAttribute('data-scroll'));
    if(target) target.scrollIntoView({behavior:'smooth', block:'start'});
  });
});

// Carousel
const track = $('#feat-track');
const dotsWrap = $('#feat-dots');
const prevBtn = $('#feat-prev');
const nextBtn = $('#feat-next');
const cards = $$('.card', track);
let slideIndex = 0;
let autoTimer = null;

function visibleCount(){
  const w = window.innerWidth;
  if(w <= 639) return 1;
  if(w <= 1023) return 2;
  return 3;
}
function updateDots(){
  const total = Math.max(1, cards.length - visibleCount() + 1);
  dotsWrap.innerHTML = '';
  for(let i=0;i<total;i++){
    const b = document.createElement('button');
    if(i === slideIndex) b.classList.add('active');
    b.addEventListener('click', ()=>goTo(i));
    dotsWrap.appendChild(b);
  }
}
function goTo(index){
  const maxIndex = Math.max(0, cards.length - visibleCount());
  slideIndex = Math.max(0, Math.min(index, maxIndex));
  const cardW = cards[0].getBoundingClientRect().width + 16; // card + gap
  track.style.transform = `translateX(${-slideIndex * cardW}px)`;
  updateDots();
}
function next(){ goTo(slideIndex + 1); }
function prev(){ goTo(slideIndex - 1); }
nextBtn.addEventListener('click', next);
prevBtn.addEventListener('click', prev);

// Auto-advance
function startAuto(){ stopAuto(); autoTimer = setInterval(()=>{
  const maxIndex = Math.max(0, cards.length - visibleCount());
  if(slideIndex >= maxIndex) goTo(0); else next();
}, 5000); }
function stopAuto(){ if(autoTimer) clearInterval(autoTimer); autoTimer = null; }
$('#featured-carousel').addEventListener('mouseenter', stopAuto);
$('#featured-carousel').addEventListener('mouseleave', startAuto);

// Swipe on touch
let startX = 0, isDown = false;
track.addEventListener('pointerdown', (e)=>{ isDown = true; startX = e.clientX; track.setPointerCapture(e.pointerId); });
track.addEventListener('pointerup', (e)=>{
  if(!isDown) return; isDown = false;
  const dx = e.clientX - startX;
  const threshold = 40;
  if(Math.abs(dx) > threshold){ if(dx < 0) next(); else prev(); }
});
window.addEventListener('resize', ()=>{ goTo(slideIndex); });
goTo(0); startAuto();

// Add-to-cart + Cart Drawer
const cartDrawer = $('#cart-drawer');
let cartTrap;
const cartCount = $('#cart-count');
const cartEmpty = $('#cart-empty');
const cartListWrap = $('#cart-list');
const cartItemsEl = $('#cart-items');
const cartSubtotalEl = $('#cart-subtotal');
const CURRENCY_PREFIX = 'PKR Rs ';

const addBtns = $$('.add-btn');
const cart = new Map(); // id -> {id, name, price, qty}

function openCart(){
  openDrawer(cartDrawer);
  $('#cart-open')?.setAttribute('aria-expanded','true');
}
function updateCartUI(){
  const items = Array.from(cart.values());
  const count = items.reduce((s,it)=>s + it.qty, 0);
  cartCount.textContent = String(count);
  if(items.length === 0){
    cartEmpty.hidden = false;
    cartListWrap.hidden = true;
  }else{
    cartEmpty.hidden = true;
    cartListWrap.hidden = false;
    cartItemsEl.innerHTML = '';
    let subtotal = 0;
    for(const it of items){
      subtotal += it.qty * it.price;
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML = `
        <div class="cart-thumb" aria-hidden="true">${it.img ? `<img src="${it.img}" alt="${it.name}" class="cart-thumb-img"/>` : it.name.split(" ").slice(0,2).join(" ")}</div>
        <div>
          <div class="cart-title">${it.name}</div>
          <div class="cart-meta">${CURRENCY_PREFIX + it.price.toLocaleString(undefined, {maximumFractionDigits:0})}</div>
        </div>
        <div class="stepper-wrap">
          <div class="stepper">
            <button aria-label="Decrease quantity">−</button>
            <input type="text" inputmode="numeric" aria-label="Quantity" value="${it.qty}" />
            <button aria-label="Increase quantity">+</button>
          </div>
        </div>
      `;
      const [decBtn, qtyInput, incBtn] = $$('button, input', li);
      incBtn.addEventListener('click', ()=>{ it.qty++; updateCartUI(); });
      decBtn.addEventListener('click', ()=>{ it.qty = Math.max(0, it.qty-1); if(it.qty===0){ cart.delete(it.id); } updateCartUI(); });
      qtyInput.addEventListener('change', ()=>{
        const n = parseInt(qtyInput.value.replace(/\D/g,'')) || 1;
        it.qty = Math.max(1, n); updateCartUI();
      });
      cartItemsEl.appendChild(li);
    }
    cartSubtotalEl.textContent = CURRENCY_PREFIX + subtotal.toLocaleString(undefined, {maximumFractionDigits:0});
  }
}
addBtns.forEach(btn=>{
  btn.addEventListener('click', ()=>{
    const card = btn.closest('.card');
    const id = card.dataset.id;
    const name = card.dataset.name;
    const price = parseFloat(card.dataset.price);
    const img = card.dataset.img || '';

    if(!cart.has(id)) cart.set(id, {id, name, price, qty: 0, img});
    cart.get(id).qty++;
    updateCartUI();
  });
});
$('#cart-open')?.addEventListener('click', openCart);
$$('[data-close="cart-drawer"]').forEach(btn=>btn.addEventListener('click', ()=>{
  closeDrawer(cartDrawer);
  $('#cart-open')?.setAttribute('aria-expanded','false');
}));

// Cookie bar
const cookieBar = $('#cookie-bar');
const cookieAccept = $('#cookie-accept');
const cookieDeny = $('#cookie-deny');
const COOKIE_KEY = 'mryum_cookie_pref';

function showCookieIfNeeded(){
  try{
    const pref = localStorage.getItem(COOKIE_KEY);
    if(!pref){
      cookieBar.hidden = false;
    }
  }catch(e){ cookieBar.hidden = false; }
}
cookieAccept?.addEventListener('click', ()=>{
  try{ localStorage.setItem(COOKIE_KEY, 'accepted'); }catch{}
  cookieBar.hidden = true;
});
cookieDeny?.addEventListener('click', ()=>{
  try{ localStorage.setItem(COOKIE_KEY, 'denied'); }catch{}
  cookieBar.hidden = true;
});
showCookieIfNeeded();

// Year
$('#year').textContent = String(new Date().getFullYear());
