"use strict";
const apps = [
    { id: 'crypto-ticker', name: 'Crypto Ticker', icon: '/static/icons/crypto.png', link: '/crypto' },
    { id: 'slideshow', name: 'Slideshow', icon: '/static/icons/slideshow.png', link: '/slideshow' },
    { id: 'app3', name: 'App 3', icon: '/static/icons/app3.png', link: '#' },
    { id: 'app4', name: 'App 4', icon: '/static/icons/app4.png', link: '#' },
    { id: 'app5', name: 'App 5', icon: '/static/icons/app5.png', link: '#' },
    { id: 'app6', name: 'App 6', icon: '/static/icons/app6.png', link: '#' },
];
function createAppCard(app) {
    const card = document.createElement('div');
    card.className = 'app-card';
    const icon = document.createElement('img');
    icon.src = app.icon;
    icon.alt = app.name;
    icon.className = 'app-icon';
    const name = document.createElement('div');
    name.className = 'app-name';
    name.textContent = app.name;
    card.appendChild(icon);
    card.appendChild(name);
    card.addEventListener('click', () => {
        if (app.link !== '#') {
            window.location.href = app.link;
        }
        else {
            alert('This application is not available yet.');
        }
    });
    return card;
}
function renderAppCards(apps) {
    const appDiv = document.getElementById('app');
    if (appDiv) {
        const grid = document.createElement('div');
        grid.className = 'app-grid';
        apps.forEach(app => {
            const card = createAppCard(app);
            grid.appendChild(card);
        });
        appDiv.appendChild(grid);
    }
}
document.addEventListener('DOMContentLoaded', () => {
    renderAppCards(apps);
});
