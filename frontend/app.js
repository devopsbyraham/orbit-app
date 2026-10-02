const API = '/api';
const state = { service: 'movies', view: 'discover', token: localStorage.getItem('orbit_token'), user: null, items: [], activeItem: null, authMode: 'login', toastTimer: null, sort: 'Top picks' };
let serviceLoadId = 0;
document.body.dataset.service = state.service;
const $ = (selector, root = document) => root.querySelector(selector);
const content = $('#content');

const serviceInfo = {
    movies: { path: '/movies', array: 'movies', heading: 'ON THE BIG SCREEN', title: 'Worth going out for' },
    trains: { path: '/trains', array: 'trains', heading: 'YOUR NEXT DEPARTURE', title: 'A good way to get there' },
    dth: { path: '/dth', array: 'plans', heading: 'TONIGHT, WELL SPENT', title: 'Find your kind of TV' },
    recharge: { path: '/recharge/plans', array: 'plans', heading: 'STAY IN THE LOOP', title: 'A plan that keeps up' }
};
const icons = { movies: 'clapperboard', trains: 'train-front', dth: 'tv', recharge: 'smartphone' };
const databaseChecks = {
    account: { path: '/auth/me', table: 'users', key: 'user' },
    movies: { path: '/bookings', table: 'bookings', key: 'bookings', service: 'movies' },
    trains: { path: '/bookings', table: 'bookings', key: 'bookings', service: 'trains' },
    dth: { path: '/bookings', table: 'bookings', key: 'bookings', service: 'dth' },
    recharge: { path: '/recharge/orders', table: 'recharge_orders', key: 'orders' },
    notifications: { path: '/notifications', table: 'notifications', key: 'notifications' },
    bookings: { path: '/bookings', table: 'bookings', key: 'bookings' }
};
const money = amount => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount || 0));
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function refreshIcons() {
    if (window.lucide) window.lucide.createIcons();
}

async function api(path, options = {}) {
    const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
    if (state.token) headers.authorization = `Bearer ${state.token}`;
    const response = await fetch(`${API}${path}`, { ...options, headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        if (response.status === 401 && state.token) signOut(false);
        throw new Error(body.error || 'That did not work. Try again.');
    }
    return body;
}

function toast(message) {
    const node = $('#toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => node.classList.remove('show'), 3200);
}

function setUser(user) {
    state.user = user;
    $('#account-label').textContent = user ? user.name.split(' ')[0] : 'Sign in';
    $('.account-avatar').textContent = user ? user.name.trim().charAt(0).toUpperCase() : 'G';
    $('.notification-dot').classList.toggle('hidden', !user);
}

async function loadService() {
    const service = state.service;
    const definition = serviceInfo[service];
    const loadId = ++serviceLoadId;
    $('#result-heading').innerHTML = `<span class="eyebrow">${definition.heading}</span><h3>${definition.title}</h3>`;
    $('#search-input').placeholder = state.service === 'trains' ? 'Search city or train' : 'Search movies, places, plans';
    content.innerHTML = '<div class="loading-state"><span class="loader"></span>Finding the good stuff</div>';
    try {
        const result = await api(definition.path);
        if (loadId !== serviceLoadId) return;
        state.items = result[definition.array] || [];
        renderItems();
    } catch (error) {
        if (loadId !== serviceLoadId) return;
        content.innerHTML = `<div class="empty-state"><i data-lucide="wifi-off"></i><strong>We lost the signal.</strong><span>${escapeHtml(error.message)}</span></div>`;
        refreshIcons();
    }
}

function filteredItems() {
    const query = $('#search-input').value.trim().toLowerCase();
    const items = state.items.filter(item => Object.values(item).join(' ').toLowerCase().includes(query));
    if (state.sort === 'Price: low to high') return [...items].sort((a, b) => a.price - b.price);
    if (state.sort === 'Rating') return [...items].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    return items;
}

function renderMovies(items) {
    if (!items.length) return emptyState('No screenings found.', 'Try a different search.');
    content.innerHTML = `<div class="movie-grid">${items.map(movie => `
    <article class="movie-card">
      <div class="movie-poster" style="background-image:url('https://images.unsplash.com/${escapeHtml(movie.art)}?auto=format&fit=crop&w=720&q=82')">
        <span class="movie-rating"><i data-lucide="star"></i>${escapeHtml(movie.rating)}</span><span class="movie-price">from ${money(movie.price)}</span>
        <div class="movie-info"><div class="movie-tags"><span>${escapeHtml(movie.genre)}</span><span>${escapeHtml(movie.language)}</span><span>${escapeHtml(movie.runtime)}</span></div><h4>${escapeHtml(movie.title)}</h4></div>
        <button class="movie-action" data-book="${escapeHtml(movie.id)}" aria-label="Book ${escapeHtml(movie.title)}"><i data-lucide="arrow-up-right"></i></button>
      </div>
    </article>`).join('')}</div>`;
}

function renderTrains(items) {
    if (!items.length) return emptyState('No trains found.', 'Try another city or train number.');
    content.innerHTML = `<div class="train-list">${items.map(train => `
    <article class="train-row">
      <div class="train-name"><strong>${escapeHtml(train.name)}</strong><span>${escapeHtml(train.number)} · ${escapeHtml(train.class)}</span></div>
      <div class="train-route"><div><strong>${escapeHtml(train.depart)}</strong><span>${escapeHtml(train.from)}</span></div><div class="route-line">${escapeHtml(train.duration)}</div><div><strong>${escapeHtml(train.arrive)}</strong><span>${escapeHtml(train.to)}</span></div></div>
      <div class="train-fare"><strong>${money(train.price)}</strong><span>${escapeHtml(train.seats)} seats left</span></div>
      <button class="book-button" data-book="${escapeHtml(train.id)}">Book seat</button>
    </article>`).join('')}</div>`;
}

function renderPlans(items) {
    if (!items.length) return emptyState('No plans match that search.', 'Try a different provider or plan name.');
    content.innerHTML = `<div class="plan-grid">${items.map(plan => `
    <article class="plan-card"><div class="plan-provider"><span>${escapeHtml(plan.provider)}</span><span>${escapeHtml(plan.note || plan.validity)}</span></div><h4>${escapeHtml(plan.name)}</h4><div class="plan-details">${escapeHtml(plan.channels || plan.data)}${plan.calls ? ` · ${escapeHtml(plan.calls)}` : ''}</div><div class="plan-bottom"><strong>${money(plan.price)}</strong><button class="plan-button" data-book="${escapeHtml(plan.id)}">${state.service === 'dth' ? 'Choose' : 'Recharge'}</button></div></article>`).join('')}</div>`;
}

function renderRecharge(items) {
    if (!items.length) return emptyState('No plans match that search.', 'Try a different provider or plan name.');
    content.innerHTML = `<div class="recharge-layout"><aside class="recharge-aside"><div><span class="eyebrow"><span class="eyebrow-dot"></span> SIMPLE. QUICK. CONNECTED.</span><h3>Your people are one good plan away.</h3></div><div><i data-lucide="signal"></i><p>All major networks, all in one place.</p></div></aside><div class="recharge-options">${items.map(plan => `<button class="recharge-plan" data-book="${escapeHtml(plan.id)}"><strong>${escapeHtml(plan.provider)}</strong><span>${escapeHtml(plan.data)} · ${escapeHtml(plan.validity)}</span><span class="recharge-price">${money(plan.price)} <i data-lucide="arrow-up-right"></i></span></button>`).join('')}</div></div>`;
}

function emptyState(title, description) {
    content.innerHTML = `<div class="empty-state"><i data-lucide="search-x"></i><strong>${escapeHtml(title)}</strong><span>${escapeHtml(description)}</span></div>`;
}

function renderItems() {
    const items = filteredItems();
    if (state.service === 'movies') renderMovies(items);
    else if (state.service === 'trains') renderTrains(items);
    else if (state.service === 'recharge') renderRecharge(items);
    else renderPlans(items);
    refreshIcons();
}

function setService(service) {
    if (!serviceInfo[service]) return;
    state.view = 'discover';
    state.service = service;
    document.body.dataset.service = service;
    $('.service-section').classList.remove('hidden');
    $('#welcome-band').classList.remove('hidden');
    $('#service-section').classList.remove('hidden');
    document.querySelectorAll('.service-tab').forEach(tab => {
        const selected = tab.dataset.service === service;
        tab.classList.toggle('selected', selected);
        tab.setAttribute('aria-selected', String(selected));
    });
    document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.view === 'discover'));
    $('#search-input').value = '';
    $('#sort-button').classList.toggle('hidden', service === 'recharge');
    loadService();
}

function openAuth(mode = 'login') {
    state.authMode = mode;
    $('#auth-error').textContent = '';
    $('#auth-form').reset();
    const register = mode === 'register';
    $('#auth-title').textContent = register ? 'Let’s get you started.' : 'Good to have you.';
    $('#auth-description').textContent = register ? 'One account brings all your everyday plans together.' : 'Sign in to pick up where you left off.';
    $('#name-field').classList.toggle('hidden', !register);
    $('#auth-name').required = register;
    $('#auth-password').autocomplete = register ? 'new-password' : 'current-password';
    $('#auth-submit').innerHTML = `${register ? 'Create account' : 'Sign in'} <i data-lucide="arrow-right"></i>`;
    $('#switch-copy').textContent = register ? 'Already with us?' : 'New around here?';
    $('#switch-auth').textContent = register ? 'Sign in' : 'Create an account';
    $('#auth-dialog').showModal();
    refreshIcons();
}

function signOut(showMessage = true) {
    localStorage.removeItem('orbit_token');
    state.token = null;
    setUser(null);
    if (showMessage) toast('You have signed out.');
    if (state.view === 'activity') showActivity();
}

async function showActivity() {
    state.view = 'activity';
    $('#welcome-band').classList.add('hidden');
    $('#service-section').classList.remove('hidden');
    document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.view === 'activity'));
    $('#result-heading').innerHTML = '<span class="eyebrow">YOUR ORBIT</span><h3>Things you have set in motion</h3>';
    $('#sort-button').classList.add('hidden');
    if (!state.token) {
        content.innerHTML = '<div class="empty-state"><i data-lucide="user-round"></i><strong>Your story starts here.</strong><span>Sign in to see bookings and recharges.</span><button class="book-button" id="activity-sign-in">Sign in</button></div>';
        refreshIcons();
        $('#activity-sign-in').addEventListener('click', () => openAuth());
        return;
    }
    content.innerHTML = '<div class="loading-state"><span class="loader"></span>Gathering your activity</div>';
    try {
        const [bookingResult, rechargeResult] = await Promise.all([
            api('/bookings'), api('/recharge/orders').catch(() => ({ orders: [] }))
        ]);
        const events = [
            ...(bookingResult.bookings || []).map(item => ({ kind: item.service, title: item.itemName, amount: item.amount, status: item.status, date: item.createdAt })),
            ...(rechargeResult.orders || []).map(item => ({ kind: 'recharge', title: `${item.provider} · ${item.planName}`, amount: item.amount, status: item.status, date: item.createdAt }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));
        if (!events.length) return emptyState('Your orbit is quiet.', 'Your confirmed plans will show up here.');
        content.innerHTML = `<div class="activity-list">${events.map(item => `<article class="activity-row"><span class="activity-icon"><i data-lucide="${icons[item.kind] || 'receipt'}"></i></span><div class="activity-copy"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.kind)} · ${escapeHtml(item.status)} · ${new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div><strong class="activity-amount">${money(item.amount)}</strong></article>`).join('')}</div>`;
        refreshIcons();
    } catch (error) {
        content.innerHTML = `<div class="empty-state"><i data-lucide="wifi-off"></i><strong>We lost the signal.</strong><span>${escapeHtml(error.message)}</span></div>`;
        refreshIcons();
    }
}

function openCheckout(item) {
    state.activeItem = item;
    const recharge = state.service === 'recharge';
    $('#checkout-error').textContent = '';
    $('#checkout-form').reset();
    $('#checkout-field').classList.toggle('hidden', !recharge);
    $('#checkout-phone').required = recharge;
    $('#checkout-kicker').textContent = recharge ? 'TOP UP, ALL SORTED' : 'JUST ONE MORE THING';
    $('#checkout-title').textContent = recharge ? 'Keep the good going.' : 'Make it yours.';
    $('#checkout-summary').textContent = recharge
        ? `${item.provider} · ${item.name} · ${item.data} for ${item.validity}`
        : `${item.title || item.name}${item.from ? ` · ${item.from} to ${item.to}` : ''}`;
    $('#checkout-total-label').textContent = recharge ? 'Recharge amount' : 'Total';
    $('#checkout-total').textContent = money(item.price);
    $('#checkout-submit').innerHTML = `${recharge ? 'Recharge now' : 'Confirm booking'} <i data-lucide="arrow-right"></i>`;
    $('#checkout-dialog').showModal();
    refreshIcons();
}

async function handleAuth(event) {
    event.preventDefault();
    $('#auth-error').textContent = '';
    const form = new FormData(event.currentTarget);
    const endpoint = state.authMode === 'register' ? '/auth/register' : '/auth/login';
    try {
        const result = await api(endpoint, { method: 'POST', body: JSON.stringify(Object.fromEntries(form)) });
        state.token = result.token;
        localStorage.setItem('orbit_token', result.token);
        setUser(result.user);
        $('#auth-dialog').close();
        toast(state.authMode === 'register' ? 'Your Orbit account is ready.' : `Welcome back, ${result.user.name.split(' ')[0]}.`);
        if (state.view === 'activity') showActivity();
    } catch (error) {
        $('#auth-error').textContent = error.message;
    }
}

async function handleCheckout(event) {
    event.preventDefault();
    if (!state.token) {
        $('#checkout-dialog').close();
        openAuth();
        return;
    }
    const button = $('#checkout-submit');
    button.disabled = true;
    $('#checkout-error').textContent = '';
    try {
        if (state.service === 'recharge') {
            const result = await api('/recharge/orders', { method: 'POST', body: JSON.stringify({ planId: state.activeItem.id, phone: $('#checkout-phone').value }) });
            toast(`Recharge ${result.order.status}. Reference OR-${result.order.id}.`);
        } else {
            const result = await api('/bookings', { method: 'POST', body: JSON.stringify({ service: state.service, itemId: state.activeItem.id }) });
            toast(`Booking confirmed. Reference OR-${result.booking.id}.`);
        }
        $('#checkout-dialog').close();
        if (state.view === 'activity') showActivity();
    } catch (error) {
        $('#checkout-error').textContent = error.message;
    } finally {
        button.disabled = false;
    }
}

async function showNotifications() {
    if (!state.token) return openAuth();
    const list = $('#notification-list');
    list.innerHTML = '<div class="loading-state"><span class="loader"></span>Checking for updates</div>';
    $('#notification-dialog').showModal();
    try {
        const result = await api('/notifications');
        if (!result.notifications.length) list.innerHTML = '<div class="empty-state"><i data-lucide="bell-off"></i><strong>All caught up.</strong><span>New updates will find their way here.</span></div>';
        else list.innerHTML = result.notifications.map(item => `<article class="notification-item"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.message)}</p><time>${new Date(item.createdAt).toLocaleString('en-IN')}</time></article>`).join('');
        refreshIcons();
    } catch (error) {
        list.textContent = error.message;
    }
}

function updateDatabaseCommand() {
    const selection = $('#database-service').value;
    const check = databaseChecks[selection];
    const filter = check.service ? `, filtered to service = '${check.service}'` : '';
    $('#database-command').textContent = `GET ${API}${check.path} · ${check.table}${filter} · signed-in account only`;
    $('#database-result-meta').textContent = 'Ready to run.';
    $('#database-result').textContent = 'Select Run check to fetch the latest records.';
}

function openDatabaseCheck() {
    if (!state.token) return openAuth();
    updateDatabaseCommand();
    $('#database-dialog').showModal();
    refreshIcons();
}

async function runDatabaseCheck() {
    const selection = $('#database-service').value;
    const check = databaseChecks[selection];
    const button = $('#run-database-check');
    button.disabled = true;
    $('#database-result-meta').textContent = 'Checking service data...';
    $('#database-result').textContent = '';
    try {
        const result = await api(check.path);
        let rows = selection === 'account' ? (result[check.key] ? [result[check.key]] : []) : result[check.key] || [];
        if (check.service) rows = rows.filter(row => row.service === check.service);
        $('#database-result-meta').textContent = `${rows.length} ${rows.length === 1 ? 'record' : 'records'} found · ${new Date().toLocaleTimeString()}`;
        $('#database-result').textContent = JSON.stringify(rows, null, 2);
    } catch (error) {
        $('#database-result-meta').textContent = 'Check failed.';
        $('#database-result').textContent = error.message;
    } finally {
        button.disabled = false;
    }
}

document.querySelectorAll('.service-tab, [data-service]').forEach(button => button.addEventListener('click', () => setService(button.dataset.service)));
document.querySelectorAll('.nav-link').forEach(button => button.addEventListener('click', () => button.dataset.view === 'activity' ? showActivity() : setService(state.service)));
$('#search-input').addEventListener('input', renderItems);
$('#sort-button').addEventListener('click', () => {
    state.sort = state.sort === 'Top picks' ? 'Price: low to high' : state.sort === 'Price: low to high' ? 'Rating' : 'Top picks';
    $('#sort-button span').textContent = state.sort;
    renderItems();
});
$('#content').addEventListener('click', event => {
    const button = event.target.closest('[data-book]');
    if (!button) return;
    const item = state.items.find(entry => entry.id === button.dataset.book);
    if (item) openCheckout(item);
});
$('#auth-form').addEventListener('submit', handleAuth);
$('#checkout-form').addEventListener('submit', handleCheckout);
$('#switch-auth').addEventListener('click', () => openAuth(state.authMode === 'login' ? 'register' : 'login'));
$('#account-button').addEventListener('click', () => state.token ? (state.view === 'activity' ? signOut() : showActivity()) : openAuth());
$('#notifications-button').addEventListener('click', showNotifications);
$('#data-check-button').addEventListener('click', openDatabaseCheck);
$('#database-service').addEventListener('change', updateDatabaseCommand);
$('#run-database-check').addEventListener('click', runDatabaseCheck);
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
[...document.querySelectorAll('dialog')].forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
document.addEventListener('keydown', event => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { event.preventDefault(); $('#search-input').focus(); }
});

$('#today-label').textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date()).toUpperCase();
refreshIcons();
if (state.token) api('/auth/me').then(result => setUser(result.user)).catch(() => setUser(null));
loadService();
