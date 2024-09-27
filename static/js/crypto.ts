declare var echarts: any;

interface CryptoCard {
    cardElement: HTMLElement;
    priceElement: HTMLElement;
    changeElement: HTMLElement;
    chartContainer: HTMLElement;
    chart: any;
    lastPrice: number;
    wsKline?: WebSocket;
    wsTicker?: WebSocket;
}

const availableSymbols = [
    'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT',
    'BNBUSDT', 'PEPEUSDT', 'SHIBUSDT', 'DOGEUSDT',
    'TONUSDT', 'SUIUSDT', '1000SATSUSDT', 'CATIUSDT'
];

let presets = JSON.parse(localStorage.getItem('presets') || 'null') || [
    ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT'],
    ['BNBUSDT', 'PEPEUSDT', 'SHIBUSDT', 'DOGEUSDT'],
    ['TONUSDT', 'SUIUSDT', '1000SATSUSDT', 'CATIUSDT']
];

let currentPresetIndex = 0;
let cryptoSymbols = presets[currentPresetIndex];

const cryptoCards: { [symbol: string]: CryptoCard } = {};

function createCryptoCard(symbol: string): HTMLElement {
    const card = document.createElement('div');
    card.className = 'crypto-card';

    const header = document.createElement('div');
    header.className = 'crypto-header';

    const logo = document.createElement('img');
    logo.src = `/static/icons/crypto/${symbol.slice(0, -4).toLowerCase()}.png`;
    logo.alt = symbol.slice(0, -4);
    logo.className = 'crypto-logo';

    const name = document.createElement('div');
    name.className = 'crypto-name';
    name.textContent = symbol.slice(0, -4);

    const priceContainer = document.createElement('div');
    priceContainer.className = 'price-container';

    const price = document.createElement('div');
    price.className = 'crypto-price';
    price.textContent = `$--`;

    const change = document.createElement('div');
    change.className = 'crypto-change';
    change.textContent = `--`;

    priceContainer.appendChild(price);
    header.appendChild(logo);
    header.appendChild(name);
    header.appendChild(priceContainer);

    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';

    card.appendChild(header);
    card.appendChild(change);
    card.appendChild(chartContainer);

    cryptoCards[symbol] = {
        cardElement: card,
        priceElement: price,
        changeElement: change,
        chartContainer: chartContainer,
        chart: null,
        lastPrice: 0,
        wsKline: undefined,
        wsTicker: undefined,
    };

    return card;
}

function renderCryptoCards(): void {
    const appDiv = document.getElementById('crypto-app');
    if (appDiv) {
        appDiv.innerHTML = '';
        const grid = document.createElement('div');
        grid.className = 'crypto-grid';

        cryptoSymbols.forEach(symbol => {
            const card = createCryptoCard(symbol);
            grid.appendChild(card);
        });

        appDiv.appendChild(grid);

        cryptoSymbols.forEach(symbol => {
            initializeChart(symbol);
        });
    }
}

function initializeChart(symbol: string): void {
    const symbolData = cryptoCards[symbol];
    if (symbolData) {
        const chartContainer = symbolData.chartContainer;
        chartContainer.style.width = '100%';
        chartContainer.style.flexGrow = '1';

        const chart = echarts.init(chartContainer);

        const option = {
            animation: false,
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                },
                backgroundColor: 'rgba(50, 50, 50, 0.7)',
                textStyle: {
                    color: '#fff'
                },
                borderWidth: 0
            },
            grid: {
                left: '15%',
                right: '15%',
                bottom: '15%',
                top: '10%',
            },
            xAxis: {
                type: 'category',
                data: [],
                scale: true,
                boundaryGap: false,
                axisLine: { onZero: false },
                splitLine: { show: false },
                min: 'dataMin',
                max: 'dataMax',
                axisLabel: {
                    formatter: function (value: string) {
                        const date = new Date(parseInt(value));
                        return echarts.format.formatTime('MM-dd hh:mm', date);
                    },
                    color: getComputedStyle(document.body).color
                },
                axisTick: { show: false },
            },
            yAxis: {
                scale: true,
                boundaryGap: [0, 0],
                splitArea: {
                    show: false
                },
                splitLine: { show: false },
                axisLabel: {
                    color: getComputedStyle(document.body).color
                },
                axisTick: { show: false },
                axisLine: { show: false },
            },
            series: [
                {
                    type: 'candlestick',
                    data: [],
                    itemStyle: {
                        color: '#4caf50',
                        color0: '#f44336',
                        borderColor: '#4caf50',
                        borderColor0: '#f44336'
                    },
                    barWidth: '100%',
                    barGap: '-100%',
                    barCategoryGap: '0%'
                }
            ]
        };

        chart.setOption(option);

        fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=15m&limit=30`)
            .then(response => response.json())
            .then(data => {
                const dates = data.map((kline: any) => kline[0]);
                const candleData = data.map((kline: any) => [
                    parseFloat(kline[1]),
                    parseFloat(kline[4]),
                    parseFloat(kline[3]),
                    parseFloat(kline[2])
                ]);

                const lowPrices = candleData.map(d => d[2]);
                const highPrices = candleData.map(d => d[3]);
                const minPrice = Math.min(...lowPrices);
                const maxPrice = Math.max(...highPrices);
                const priceRange = maxPrice - minPrice;
                const padding = priceRange * 0.1;

                chart.setOption({
                    xAxis: {
                        data: dates
                    },
                    series: [
                        {
                            data: candleData
                        }
                    ],
                    yAxis: {
                        min: minPrice - padding,
                        max: maxPrice + padding
                    }
                });
            })
            .catch(error => console.error(`Error fetching initial kline data for ${symbol}:`, error));

        symbolData.chart = chart;

        window.addEventListener('resize', () => {
            chart.resize();
        });
    }
}

function formatPrice(price: number): string {
    // Format the price to have 7 digits
    if (price >= 1) {
        return price.toFixed(7 - Math.floor(price).toString().length);
    } else {
        return price.toPrecision(7);
    }
}

function connectWebSockets(): void {
    Object.values(cryptoCards).forEach(symbolData => {
        if (symbolData.wsKline) {
            symbolData.wsKline.close();
        }
        if (symbolData.wsTicker) {
            symbolData.wsTicker.close();
        }
    });

    cryptoSymbols.forEach(symbol => {
        const symbolLower = symbol.toLowerCase();

        const wsKline = new WebSocket(`wss://stream.binance.com:9443/ws/${symbolLower}@kline_15m`);

        wsKline.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.e === 'kline') {
                const kline = message.k;
                if (kline.x) {
                    const date = kline.t;
                    const candle = [
                        parseFloat(kline.o),
                        parseFloat(kline.c),
                        parseFloat(kline.l),
                        parseFloat(kline.h)
                    ];

                    const symbolData = cryptoCards[symbol];
                    if (symbolData && symbolData.chart) {
                        const chart = symbolData.chart;

                        const option = chart.getOption();
                        const xData = option.xAxis[0].data;
                        const seriesData = option.series[0].data;

                        xData.push(date);
                        seriesData.push(candle);

                        if (xData.length > 15) {
                            xData.shift();
                            seriesData.shift();
                        }

                        const lowPrices = seriesData.map(d => d[2]);
                        const highPrices = seriesData.map(d => d[3]);
                        const minPrice = Math.min(...lowPrices);
                        const maxPrice = Math.max(...highPrices);
                        const priceRange = maxPrice - minPrice;
                        const padding = priceRange * 0.1;

                        chart.setOption({
                            xAxis: { data: xData },
                            series: [{ data: seriesData }],
                            yAxis: {
                                min: minPrice - padding,
                                max: maxPrice + padding
                            }
                        });
                    }
                }
            }
        };

        wsKline.onerror = (error) => {
            console.error(`WebSocket error for ${symbol} kline:`, error);
        };

        const wsTicker = new WebSocket(`wss://stream.binance.com:9443/ws/${symbolLower}@ticker`);

        wsTicker.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const price = parseFloat(data.c);
            const priceChangePercent = parseFloat(data.P);
            const priceChange = parseFloat(data.p);

            const symbolData = cryptoCards[symbol];
            if (symbolData) {
                const lastPrice = symbolData.lastPrice;
                symbolData.lastPrice = price;

                const formattedPrice = formatPrice(price);

                symbolData.priceElement.textContent = `$${formattedPrice}`;

                if (lastPrice !== 0) {
                    if (price > lastPrice) {
                        symbolData.priceElement.style.color = '#4caf50';
                    } else if (price < lastPrice) {
                        symbolData.priceElement.style.color = '#f44336';
                    } else {
                        symbolData.priceElement.style.color = getComputedStyle(document.body).color;
                    }
                }

                const arrow = priceChange >= 0 ? '▲' : '▼';
                const changeColor = priceChange >= 0 ? '#4caf50' : '#f44336';
                const changeText = `${arrow} ${priceChangePercent.toFixed(2)}% (${priceChange >= 0 ? '+' : '-'} $${Math.abs(priceChange).toFixed(3)})`;

                symbolData.changeElement.textContent = changeText;
                symbolData.changeElement.style.color = changeColor;
            }
        };

        wsTicker.onerror = (error) => {
            console.error(`WebSocket error for ${symbol} ticker:`, error);
        };

        cryptoCards[symbol].wsKline = wsKline;
        cryptoCards[symbol].wsTicker = wsTicker;
    });
}

function handleResize() {
    if (window.innerWidth <= 1024) {
        document.body.classList.add('small-screen');
    } else {
        document.body.classList.remove('small-screen');
    }
}

window.addEventListener('resize', handleResize);
handleResize();

document.addEventListener('DOMContentLoaded', () => {
    renderCryptoCards();
    connectWebSockets();

    let touchStartX = 0;
    let touchEndX = 0;
    let isSwiping = false;

    const appDiv = document.getElementById('crypto-app');
    if (appDiv) {
        appDiv.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });

        appDiv.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleGesture();
        });

        appDiv.addEventListener('mousedown', (e) => {
            touchStartX = e.screenX;
            isSwiping = true;
        });

        appDiv.addEventListener('mouseup', (e) => {
            if (isSwiping) {
                touchEndX = e.screenX;
                isSwiping = false;
                handleGesture();
            }
        });

        function handleGesture() {
            if (touchEndX < touchStartX - 50) {
                currentPresetIndex = (currentPresetIndex + 1) % presets.length;
                cryptoSymbols = presets[currentPresetIndex];
                renderCryptoCards();
                connectWebSockets();
            }
            if (touchEndX > touchStartX + 50) {
                currentPresetIndex = (currentPresetIndex - 1 + presets.length) % presets.length;
                cryptoSymbols = presets[currentPresetIndex];
                renderCryptoCards();
                connectWebSockets();
            }
        }
    }

    const homeButton = document.getElementById('home-button');
    if (homeButton) {
        homeButton.addEventListener('click', () => {
            window.location.href = '/';
        });
    }

    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            showConfigScreen();
        });
    }

    const themeToggleButton = document.getElementById('theme-toggle-button');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            toggleTheme();
        });
    }
});


function showConfigScreen(): void {
    const configScreen = document.getElementById('config-screen');
    if (configScreen) {
        configScreen.style.display = 'flex';
        configScreen.innerHTML = '';

        const form = document.createElement('form');
        form.style.width = '100%';

        presets.forEach((preset, presetIndex) => {
            const presetCard = document.createElement('div');
            presetCard.className = 'preset-card';

            const presetTitle = document.createElement('h3');
            presetTitle.textContent = `Preset ${presetIndex + 1}`;
            presetCard.appendChild(presetTitle);

            const gridDiv = document.createElement('div');
            gridDiv.className = 'config-grid';

            preset.forEach((symbol, slotIndex) => {
                const slotDiv = document.createElement('div');
                slotDiv.className = 'config-slot';

                const label = document.createElement('label');
                label.textContent = `Slot ${slotIndex + 1}: `;

                const select = document.createElement('select');
                availableSymbols.forEach(sym => {
                    const option = document.createElement('option');
                    option.value = sym;
                    option.textContent = sym.slice(0, -4);
                    if (sym === symbol) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });

                label.appendChild(select);
                slotDiv.appendChild(label);

                select.dataset.presetIndex = presetIndex.toString();
                select.dataset.slotIndex = slotIndex.toString();

                gridDiv.appendChild(slotDiv);
            });

            presetCard.appendChild(gridDiv);
            form.appendChild(presetCard);
        });

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.textContent = 'Save';
        saveButton.addEventListener('click', () => {
            const selects = form.querySelectorAll('select');
            selects.forEach((select: HTMLSelectElement) => {
                const presetIndex = parseInt(select.dataset.presetIndex || '0');
                const slotIndex = parseInt(select.dataset.slotIndex || '0');
                const value = select.value;
                presets[presetIndex][slotIndex] = value;
            });
            localStorage.setItem('presets', JSON.stringify(presets));
            configScreen.style.display = 'none';
            cryptoSymbols = presets[currentPresetIndex];
            renderCryptoCards();
            connectWebSockets();
        });

        form.appendChild(saveButton);

        configScreen.appendChild(form);
    }
}

function toggleTheme(): void {
    const body = document.body;
    const homeButton = document.getElementById('home-button') as HTMLButtonElement;
    const settingsButton = document.getElementById('settings-button') as HTMLButtonElement;
    const themeToggleButton = document.getElementById('theme-toggle-button') as HTMLButtonElement;

    if (body.classList.contains('dark-mode')) {
        body.classList.remove('dark-mode');
        homeButton.innerHTML = '<img src="/static/icons/theme/light/home.png" alt="Home">';
        settingsButton.innerHTML = '<img src="/static/icons/theme/light/settings.png" alt="Settings">';
        themeToggleButton.innerHTML = '<img src="/static/icons/theme/light/dark.png" alt="Dark Mode">';
    } else {
        body.classList.add('dark-mode');
        homeButton.innerHTML = '<img src="/static/icons/theme/dark/home.png" alt="Home">';
        settingsButton.innerHTML = '<img src="/static/icons/theme/dark/settings.png" alt="Settings">';
        themeToggleButton.innerHTML = '<img src="/static/icons/theme/dark/dark.png" alt="Dark Mode">';
    }
}
