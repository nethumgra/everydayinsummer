/*
================================================================
| |
| --- 1. YOUTUBE API LOADER & GLOBAL PLAYER LOGIC --- |
| (මෙම කොටස API එක load කිරීමට සහ player පාලනයට global scope එකේ තිබිය යුතුය) |
| |
================================================================
*/

// YouTube IFrame Player API කේතය load කිරීම
if (!window.YT) {
    var tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    console.log("YouTube API script loaded.");
}

// Global player කළමනාකරණ object එක
var players = {
    hero: { player: null, ready: false, sectionVisible: true, sectionId: 'hero-section', elementId: 'hero-youtube-video', hasPlayedOnce: false, observerSetup: false },
    ella: { player: null, ready: false, sectionVisible: false, sectionId: 'ella-beauty', elementId: 'ella-youtube-video', hasPlayedOnce: false, observerSetup: false },
    perahera: { player: null, ready: false, sectionVisible: false, sectionId: 'perahera-youtube', elementId: 'perahera-youtube-video', hasPlayedOnce: false, observerSetup: false },
    beach: { player: null, ready: false, sectionVisible: false, sectionId: 'beaches-youtube', elementId: 'beach-youtube-video', hasPlayedOnce: false, observerSetup: false },
    religion: { player: null, ready: false, sectionVisible: false, sectionId: 'religions', elementId: 'religion-youtube-video', hasPlayedOnce: false, observerSetup: false, currentVideoIndex: 0 }
};

var apiReady = false;
var userInteracted = false;

// Sound icons update කරන සාමාන්‍ය function එක
function updateGenericSoundIcon(playerKey, isMuted) {
    const buttonId = `sound-toggle-btn${playerKey === 'hero' ? '' : '-' + playerKey}`;
    const button = document.getElementById(buttonId);
    if (button) {
        const mutedIconId = button.querySelector('svg[id^="icon-muted"]')?.id;
        const unmutedIconId = button.querySelector('svg[id^="icon-unmuted"]')?.id;
        if (mutedIconId && unmutedIconId) {
            const mutedIcon = document.getElementById(mutedIconId);
            const unmutedIcon = document.getElementById(unmutedIconId);
            if (mutedIcon && unmutedIcon) {
                if (isMuted) {
                    mutedIcon.classList.remove('hidden');
                    unmutedIcon.classList.add('hidden');
                } else {
                    mutedIcon.classList.add('hidden');
                    unmutedIcon.classList.remove('hidden');
                }
            } else { console.warn(`Icons not found within button ${buttonId}`); }
        } else { console.warn(`Could not find icon IDs within button ${buttonId}`); }
    }
}

// User interaction (click) එක handle කිරීම
function handleUserInteraction() {
    if (!userInteracted) {
        console.log("User interaction detected.");
        userInteracted = true;
        Object.keys(players).forEach(playerKey => {
            const config = players[playerKey];
            if (config.ready && config.sectionVisible && config.player && typeof config.player.unMute === 'function') {
                console.log(`Attempting to unmute ${playerKey} (visible).`);
                try {
                    config.player.unMute();
                    updateGenericSoundIcon(playerKey, false);
                } catch (e) { console.error(`Error unmuting ${playerKey}:`, e); }
            } else if (config.ready && !config.sectionVisible && config.player && typeof config.player.mute === 'function') {
                console.log(`Ensuring ${playerKey} muted (not visible).`);
                try {
                    config.player.mute();
                    updateGenericSoundIcon(playerKey, true);
                } catch (e) { console.error(`Error muting ${playerKey}:`, e); }
            }
        });
    }
}

// YouTube API එක ready වූ විට call වේ
function onYouTubeIframeAPIReady() {
    console.log("YouTube API Ready.");
    apiReady = true;
    initPlayersIfReady();
}

// DOM සහ API දෙකම ready වූ විට player සෑදීම
function initPlayersIfReady() {
    if (!apiReady || (document.readyState !== 'interactive' && document.readyState !== 'complete')) {
        console.log(`API Ready: ${apiReady}, DOM State: ${document.readyState}. Waiting...`);
        if (apiReady && document.readyState === 'loading') { return; }
        if (!apiReady && (document.readyState === 'interactive' || document.readyState === 'complete')) { return; }
        return;
    }

    console.log("DOM ready and API ready. Initializing players.");
    Object.keys(players).forEach(playerKey => {
        const config = players[playerKey];
        const element = document.getElementById(config.elementId);
        if (!config.player && element) {
            console.log(`Creating ${playerKey} Player.`);
            try {
                // Define specific event handlers for debugging religion player
                let playerEvents = {
                    'onReady': (event) => onPlayerReady(event, playerKey),
                    // Pass playerKey to error handler
                    'onError': (event) => onPlayerError(event, playerKey)
                };

                // === Add specific logging for religion player inside its handlers ===
                if (playerKey === 'religion') {
                    console.log(`Attaching specific listeners for ${playerKey}`);
                    playerEvents = {
                        'onReady': (event) => {
                            console.log("%c>>>> RELIGION PLAYER: onReady event fired! <<<<", "color: green; font-weight: bold;"); // Specific log
                            onPlayerReady(event, playerKey); // Call the main handler
                        },
                        'onError': (event) => {
                            console.error(`%c>>>> RELIGION PLAYER: onError event fired! Data: ${event.data} <<<<`, "color: red; font-weight: bold;"); // Specific log
                            onPlayerError(event, playerKey); // Call the main handler
                        }
                    };
                }
                // === End specific logging setup ===

                // Create the player with potentially specific handlers
                config.player = new YT.Player(config.elementId, {
                    events: playerEvents
                });
                console.log(`YT.Player constructor called for ${playerKey}`); // Log constructor call

            } catch (e) { console.error(`Error creating YT Player for ${playerKey}: `, e); }
        } else if (!element) { console.warn(`Element with ID '${config.elementId}' not found for player '${playerKey}'.`); }
        else if (config.player) { /* console.log(`Player ${playerKey} already exists.`); */ } // Optional log
    });
}

// Player එක ready වූ විට...
function onPlayerReady(event, playerKey) {
    console.log(`${playerKey} Player Ready.`);
    if (!players[playerKey]) { console.error(`Player config for ${playerKey} not found.`); return; }
    const config = players[playerKey];
    config.ready = true;
    if (event.target && typeof event.target.mute === 'function') {
        try { event.target.mute(); } catch (e) { console.error(`Error muting ${playerKey} on ready:`, e); }
    } else { console.warn(`Could not mute ${playerKey} on ready.`); }
    
    // --- HERO OVERLAY LOGIC START ---
    if (playerKey === 'hero') {
        const welcomeOverlay = document.getElementById('welcome-overlay');
        let isSequenceTriggered = false; // Local flag for hero sequence
        const checkHeroTime = () => {
            const player = config.player;
            if (!player || typeof player.getCurrentTime !== 'function' || typeof player.getDuration !== 'function' || typeof player.getPlayerState !== 'function') {
                console.warn(`Hero player functions not ready for time check. Retrying soon.`);
                return;
            }
            try {
                const currentTime = player.getCurrentTime();
                const duration = player.getDuration();
                if (player.getPlayerState() !== YT.PlayerState.PLAYING) { return; }
                if (!isSequenceTriggered && duration > 0 && currentTime > 1 && currentTime >= duration - 3) {
                    console.log("Hero video near end, triggering sequence.");
                    isSequenceTriggered = true;
                    if (typeof player.pauseVideo === 'function') player.pauseVideo();
                    if (welcomeOverlay) welcomeOverlay.classList.add('visible');
                    setTimeout(() => {
                        if (welcomeOverlay) welcomeOverlay.classList.remove('visible');
                        setTimeout(() => {
                            const nextSection = document.getElementById('sri-lankan-hospitality');
                            if (nextSection) nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }, 500);
                    }, 10000);
                } else if (!isSequenceTriggered && duration > 0) {
                    requestAnimationFrame(checkHeroTime);
                }
            } catch (e) { console.error("Error during hero time check:", e); }
        };
        const startTimeChecker = () => {
            if (config.player && typeof config.player.getPlayerState === 'function') {
                try {
                    if (config.player.getPlayerState() === YT.PlayerState.PLAYING && !isSequenceTriggered) {
                        console.log("Hero video is playing, starting time check.");
                        requestAnimationFrame(checkHeroTime);
                    }
                } catch (e) { console.error("Error checking hero player state:", e); }
            } else { console.warn("Hero player or getPlayerState not ready for startTimeChecker."); }
        }
        if (config.player && typeof config.player.addEventListener === 'function') {
            const playStateListener = (event) => {
                try {
                    if (event.data === YT.PlayerState.PLAYING && !isSequenceTriggered) { startTimeChecker(); }
                } catch (e) { console.error("Error in hero playStateListener:", e); }
            };
            try {
                config.player.addEventListener('onStateChange', playStateListener);
                setTimeout(startTimeChecker, 500);
            } catch (e) { console.error("Error adding hero state change listener:", e); }
        } else { console.warn("Hero player or addEventListener not ready on time."); }
    }
    // --- HERO OVERLAY LOGIC END ---
    
    setupIntersectionObserver(playerKey);
}

// Player error වූ විට...
function onPlayerError(event, playerKey = 'Unknown') {
    let playerId = 'Unknown Player Iframe';
    try {
        const iframe = event.target.getIframe();
        if (iframe) {
            playerId = iframe.id || `Iframe for ${playerKey}`;
        } else {
            playerId = `Player object for ${playerKey} (no iframe?)`;
        }
    } catch (e) {
        playerId = `Player ${playerKey} (error getting iframe)`;
    }
    // Log different error codes with more meaning
    let errorMsg = `Youtube Error: [Player Key: ${playerKey}] [Iframe ID/Context: ${playerId}] Data: ${event.data}`;
    switch (event.data) {
        case 2: errorMsg += " (Invalid parameter)"; break;
        case 5: errorMsg += " (HTML5 player error)"; break;
        case 100: errorMsg += " (Video not found)"; break;
        case 101:
        case 150: errorMsg += " (Playback forbidden)"; break;
        default: errorMsg += " (Unknown error code)";
    }
    console.error(errorMsg);
}

// Intersection Observer (scroll කරන විට play/pause කිරීමට)
function setupIntersectionObserver(playerKey) {
    if (!players[playerKey]) { console.error(`Player config ${playerKey} not found.`); return; }
    const config = players[playerKey];
    if (config.observerSetup) return;
    const section = document.getElementById(config.sectionId);
    if (!section) { console.warn(`Section #${config.sectionId} not found.`); return; }
    const observerOptions = { threshold: 0.5 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const wasVisible = config.sectionVisible;
            config.sectionVisible = entry.isIntersecting;
            controlPlayerBasedOnVisibility(playerKey, config.sectionVisible);
            if (!wasVisible && config.sectionVisible && userInteracted && config.player && typeof config.player.unMute === 'function') {
                console.log(`Observer: Unmuting ${playerKey} (became visible).`);
                try {
                    config.player.unMute();
                    updateGenericSoundIcon(playerKey, false);
                } catch (e) { console.error(`Error unmuting ${playerKey} in observer:`, e); }
            }
            else if (wasVisible && !config.sectionVisible && userInteracted && config.player && typeof config.player.mute === 'function') {
                console.log(`Observer: Muting ${playerKey} (became hidden).`);
                try {
                    config.player.mute();
                    updateGenericSoundIcon(playerKey, true);
                } catch (e) { console.error(`Error muting ${playerKey} in observer:`, e); }
            }
        });
    }, observerOptions);
    observer.observe(section);
    config.observerSetup = true;
    console.log(`Observer started for #${config.sectionId}`);
    requestAnimationFrame(() => {
        try {
            const rect = section.getBoundingClientRect();
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            const topVisible = Math.max(0, rect.top);
            const bottomVisible = Math.min(viewportHeight, rect.bottom);
            const visibleHeight = Math.max(0, bottomVisible - topVisible);
            const intersectionRatio = rect.height > 0 ? visibleHeight / rect.height : 0;
            if (rect.height > 0 && intersectionRatio >= observerOptions.threshold) {
                console.log(`Section ${config.sectionId} initially intersecting.`);
                if (!config.sectionVisible) {
                    config.sectionVisible = true;
                    controlPlayerBasedOnVisibility(playerKey, true);
                }
                if (userInteracted && config.ready && config.player && typeof config.player.unMute === 'function') {
                    console.log(`Initial unmute check ${playerKey} passed.`);
                    try {
                        config.player.unMute();
                        updateGenericSoundIcon(playerKey, false);
                    } catch (e) { console.error(`Error initial unmute ${playerKey}:`, e); }
                }
            } else { config.sectionVisible = false; }
        } catch (e) { console.error("Error initial check:", playerKey, e); }
    });
}

// Player එක පාලනය කිරීම (visibility අනුව)
function controlPlayerBasedOnVisibility(playerKey, isIntersecting) {
    if (!players[playerKey]) { console.error(`Player config ${playerKey} not found.`); return; }
    const config = players[playerKey];
    if (!config.ready || !config.player || typeof config.player.playVideo !== 'function' || typeof config.player.pauseVideo !== 'function') { return; }
    if (isIntersecting) {
        try { config.player.playVideo(); config.hasPlayedOnce = true; } catch (e) { console.error(`Error playing ${playerKey}:`, e); }
        if (userInteracted && typeof config.player.unMute === 'function') {
            try { if (typeof config.player.isMuted === 'function' && config.player.isMuted()) { console.log(`Control: Unmuting ${playerKey}.`); config.player.unMute(); updateGenericSoundIcon(playerKey, false); } else { updateGenericSoundIcon(playerKey, false); } } catch (e) { console.error(`Error unmuting ${playerKey} in control:`, e); }
        } else if (!userInteracted && config.hasPlayedOnce && typeof config.player.mute === 'function') {
            try { if (typeof config.player.isMuted !== 'function' || !config.player.isMuted()) { console.log(`Control: Muting ${playerKey}.`); config.player.mute(); updateGenericSoundIcon(playerKey, true); } else { updateGenericSoundIcon(playerKey, true); } } catch (e) { console.error(`Error muting ${playerKey} in control:`, e); }
        }
    } else {
        if (config.hasPlayedOnce && typeof config.player.pauseVideo === 'function') {
            try { if (typeof config.player.getPlayerState === 'function' && config.player.getPlayerState() === YT.PlayerState.PLAYING) { console.log(`Control: Pausing ${playerKey}.`); config.player.pauseVideo(); } } catch (e) { console.error(`Error pausing ${playerKey}:`, e); }
        }
        if (config.ready && userInteracted) { updateGenericSoundIcon(playerKey, true); }
    }
}


/*
================================================================
| |
| --- 2. DOM-DEPENDENT SCRIPTS --- |
| (අනෙකුත් සියලුම scripts, DOM එක load වූ පසු ක්‍රියාත්මක වේ) |
| |
================================================================
*/

document.addEventListener('DOMContentLoaded', () => {

    // --- YouTube Player Init (DOM ready part) ---
    document.body.addEventListener('click', handleUserInteraction, { once: true });
    console.log("DOM fully loaded. Initializing players check.");
    initPlayersIfReady(); // API එක ready නම්, player සෑදීම අරඹයි

    // --- Tour Packages Swiper ---
    try {
        var swiper = new Swiper('.tour-packages-slider', {
            loop: true,
            autoHeight: true,
            grabCursor: true,
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            navigation: {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev',
            },
        });
    } catch (e) {
        console.warn("Swiper for .tour-packages-slider failed to initialize:", e);
    }

    // --- Preloader Logic (FIXED) ---
    const preloader = document.getElementById('preloader');
    let isVideoLoaded = false; // This will only be set by the fallback timer
    let isAnimationComplete = false;

    function attemptToHidePreloader() {
        if (isVideoLoaded && isAnimationComplete && preloader && preloader.style.opacity !== '0') {
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
                document.body.style.overflow = '';
                // Removed faulty heroVideo.play() logic
            }, 700);
        }
    }

    function onVideoLoadComplete() {
        if (!isVideoLoaded) {
            console.log("Preloader: Video fallback timer complete.");
            isVideoLoaded = true;
            attemptToHidePreloader();
        }
    }

    function onAnimationComplete() {
        if (!isAnimationComplete) {
            console.log("Preloader: Animation complete.");
            isAnimationComplete = true;
            attemptToHidePreloader();
        }
    }

    function startLoaderAnimation() {
        // Sets a minimum time for the preloader to be visible.
        setTimeout(onAnimationComplete, 3000); // Wait 3 seconds
    }

    if (preloader) {
        // Safety fallback 
        setTimeout(onVideoLoadComplete, 8000); // 8s fallback
        // Start the visual animation timer
        startLoaderAnimation();
    } else {
        console.warn("Preloader element (#preloader) not found.");
    }

    // --- Stats Counter ---
    const statsContainer = document.getElementById('stats-counter');
    if (statsContainer) {
        const animateCounters = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const counters = entry.target.querySelectorAll('span[data-target]');
                    counters.forEach(counter => {
                        const target = +counter.dataset.target;
                        let current = 0;
                        const duration = 2000; // 2 seconds
                        const stepTime = 20; // update every 20ms
                        const totalSteps = duration / stepTime;
                        const increment = Math.ceil(target / totalSteps);

                        const timer = setInterval(() => {
                            current += increment;
                            if (current >= target) {
                                counter.textContent = target.toLocaleString() + (target === 2500 || target === 10000 ? '+' : '');
                                clearInterval(timer);
                            } else {
                                counter.textContent = current.toLocaleString();
                            }
                        }, stepTime);
                    });
                    observer.unobserve(entry.target);
                }
            });
        };

        const statsObserver = new IntersectionObserver(animateCounters, {
            threshold: 0.5
        });
        statsObserver.observe(statsContainer);
    } else {
        console.warn("Stats counter element (#stats-counter) not found.");
    }

    // --- Dalada Maligawa Image Slider ---
    const sliderContainer = document.getElementById('dalada-image-slider');
    if (sliderContainer) {
        const slides = sliderContainer.querySelectorAll('.dalada-slide');
        let currentSlideIndex = 0;

        if (slides.length > 0) {
            setInterval(() => {
                slides[currentSlideIndex].classList.remove('opacity-100');
                slides[currentSlideIndex].classList.add('opacity-0');
                currentSlideIndex = (currentSlideIndex + 1) % slides.length;
                slides[currentSlideIndex].classList.remove('opacity-0');
                slides[currentSlideIndex].classList.add('opacity-100');
            }, 5000);
        }
    }
    // (Note: This element ID 'dalada-image-slider' does not exist in the HTML provided.)
    // (The script from line 822 is included, but it will not find the element.)

    // --- Historical Sites (Text/Image) Slider ---
    const textItems = document.querySelectorAll('.slider-text-item');
    const imageItems = document.querySelectorAll('.slider-image-item');
    const dotsContainer = document.getElementById('slider-dots');

    if (textItems.length > 0 && imageItems.length === textItems.length && dotsContainer) {
        let currentSlide = 0;
        const totalSlides = textItems.length;
        let slideInterval;

        textItems.forEach((item, index) => {
            const counterDiv = document.createElement('p');
            counterDiv.classList.add('counter-text', 'hidden', 'md:block');
            counterDiv.setAttribute('data-index', index);
            item.appendChild(counterDiv);
        });

        const counterElements = document.querySelectorAll('.slider-text-item .counter-text');

        const createDots = () => {
            for (let i = 0; i < totalSlides; i++) {
                const dot = document.createElement('button');
                dot.classList.add('slider-dot');
                dot.addEventListener('click', () => {
                    showSlide(i);
                    resetInterval();
                });
                dotsContainer.appendChild(dot);
            }
        };

        const dots = dotsContainer.getElementsByTagName('button');

        function showSlide(index) {
            textItems.forEach(item => item.classList.remove('active'));
            imageItems.forEach(item => item.classList.remove('active'));
            for (const dot of dots) {
                dot.classList.remove('active');
            }

            textItems[index].classList.add('active');
            imageItems[index].classList.add('active');
            dots[index].classList.add('active');

            const activeCounter = textItems[index].querySelector('.counter-text');
            if (activeCounter) {
                activeCounter.textContent = `${index + 1}/${totalSlides}`;
            }
            currentSlide = index;
        }

        function nextSlide() {
            const newIndex = (currentSlide + 1) % totalSlides;
            showSlide(newIndex);
        }

        function startInterval() {
            slideInterval = setInterval(nextSlide, 5000);
        }

        function resetInterval() {
            clearInterval(slideInterval);
            startInterval();
        }

        createDots();
        showSlide(0);
        startInterval();
    } else {
        console.warn("Historical sites slider elements not found or mismatched.");
    }

    // --- Map Hotspots ('Things to Do' Section) ---
    const locations = {
        'habarana': {
            name: 'Habarana',
            description: 'A central hub for cultural tourism, offering easy access to ancient cities and national parks. Famous for thrilling elephant back safaris.',
            imageSrc: 'habarana.png'
        },
        'sigiriya': {
            name: 'Sigiriya Rock Fortress',
            description: 'The magnificent Lion Rock Fortress, an ancient palace and fortress complex. Climb to the top for breathtaking views.',
            imageSrc: 'sigiriya.png'
        },
        'colombo': {
            name: 'Colombo',
            description: 'The vibrant commercial capital of Sri Lanka. A bustling city with a mix of modern life, colonial buildings, and ancient temples.',
            imageSrc: 'colombo.png'
        },
        'kandy': {
            name: 'Kandy',
            description: 'The last royal capital of Sri Lanka, home to the Temple of the Tooth Relic. A cultural hub surrounded by misty hills.',
            imageSrc: 'kandy.png'
        },
        'nuwaraeliya': {
            name: 'Ella', // Note: Original code has 'Ella' for 'nuwaraeliya' hotspot
            description: 'Known as "Little England," this hill country town is famous for its cool climate, picturesque tea plantations, and colonial-era bungalows.',
            imageSrc: 'ella.png'
        },
        'ella': {
            name: 'Nuwaraeliya', // Note: Original code has 'Nuwaraeliya' for 'ella' hotspot
            description: 'A charming town in the hill country, famous for its stunning views, tea plantations, and the iconic Nine Arch Bridge.',
            imageSrc: 'nuwaraeliya.png'
        },
        'galle': {
            name: 'Galle (South Coast)',
            description: 'A stunning coastal city famous for its Dutch Fort, a UNESCO World Heritage Site. Walk the ramparts and explore boutique shops.',
            imageSrc: 'south.png'
        }
    };
    const hotspots = document.querySelectorAll('.map-hotspot');
    const locationNameEl = document.getElementById('location-name');
    const locationDescriptionEl = document.getElementById('location-description');
    const locationImageWrapper = document.getElementById('location-image-wrapper');
    const locationImageEl = document.getElementById('location-image');
    let typingInterval = null;

    function typeEffect(element, text) {
        clearInterval(typingInterval);
        element.textContent = '';
        element.classList.remove('typing-done');
        let i = 0;
        typingInterval = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(typingInterval);
                element.classList.add('typing-done');
            }
        }, 15); // Typing speed
    }

    function updateLocationInfo(locationKey) {
        const data = locations[locationKey];
        if (!data) return;

        locationNameEl.textContent = data.name;
        typeEffect(locationDescriptionEl, data.description);

        locationImageWrapper.style.opacity = 0;
        setTimeout(() => {
            locationImageEl.src = data.imageSrc;
            locationImageEl.alt = `View of ${data.name}`;
            locationImageWrapper.style.opacity = 1;
        }, 300);
    }

    if (hotspots.length > 0 && locationNameEl && locationDescriptionEl && locationImageWrapper && locationImageEl) {
        hotspots.forEach(hotspot => {
            hotspot.addEventListener('click', () => {
                hotspots.forEach(h => h.classList.remove('active'));
                hotspot.classList.add('active');
                const locationKey = hotspot.dataset.location;
                updateLocationInfo(locationKey);
            });
        });

        const scrollObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    scrollObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.scroll-animate').forEach(el => scrollObserver.observe(el));
    } else {
        console.warn("Map hotspot elements not found.");
    }

    // --- Contact Form (WhatsApp Redirect) ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function (event) {
            event.preventDefault();
            const name = document.getElementById('form-name').value;
            const email = document.getElementById('form-email').value;
            const message = document.getElementById('form-message').value;
            const yourWhatsappNumber = '393513389757';
            let whatsappMessage = `New Tour Inquiry!\n\n`;
            whatsappMessage += `*Name:* ${name}\n`;
            whatsappMessage += `*Email:* ${email}\n`;
            whatsappMessage += `*Dream:* ${message}`;
            const encodedMessage = encodeURIComponent(whatsappMessage);
            const whatsappUrl = `https://wa.me/${yourWhatsappNumber}?text=${encodedMessage}`;
            window.open(whatsappUrl, '_blank');
        });
    } else {
        console.warn("Contact form (#contact-form) not found.");
    }

    // --- Header Scroll & General Scroll-Fade Effects ---
    const header = document.getElementById('main-header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    } else {
        console.warn("Main header (#main-header) not found.");
    }

    const scrollElements = document.querySelectorAll('.scroll-fade-in');
    if (scrollElements.length > 0) {
        const elementObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target); // Animate only once
                }
            });
        }, {
            threshold: 0.1 // Trigger when 10% is visible
        });

        scrollElements.forEach(el => {
            elementObserver.observe(el);
        });
    }
    // (Removed broken SVG map logic from footer script)

    // --- Floating Panel ('Explore Your Magical Tour') ---
    const openBtn = document.getElementById('open-packages-panel');
    const panel = document.getElementById('packages-panel');
    const closeBtn = document.getElementById('close-packages-panel');
    const mapPanelContainer = document.getElementById('map-container-panel');
    const targetSection = document.getElementById('things-to-do');

    function openPanel() {
        if (!openBtn || !panel) return;
        openBtn.style.display = 'none';
        panel.classList.remove('translate-y-full', 'opacity-0', 'pointer-events-none');
        panel.classList.add('opacity-100', 'pointer-events-auto');
        document.body.style.overflow = 'hidden';
    }

    function closePanel() {
        if (!panel) return;
        panel.classList.add('translate-y-full', 'opacity-0', 'pointer-events-none');
        panel.classList.remove('opacity-100', 'pointer-events-auto');

        setTimeout(() => {
            if (openBtn) {
                openBtn.style.display = 'flex';
            }
            document.body.style.overflow = '';
        }, 500);
    }

    if (openBtn) {
        openBtn.addEventListener('click', openPanel);
    } else {
        console.error("Open button ('open-packages-panel') not found.");
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closePanel);
    } else {
        console.error("Close button ('close-packages-panel') not found.");
    }

    if (mapPanelContainer && targetSection) {
        mapPanelContainer.addEventListener('click', () => {
            closePanel();
            setTimeout(() => {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        });
    } else {
        if (!mapPanelContainer) console.error("Map panel container ('map-container-panel') not found.");
        if (!targetSection) console.error("Target section ('things-to-do') not found.");
    }

    // --- Generic Sound Toggle Button Setup ---
    // (මෙය සියලුම player sound button සඳහා listener එකතු කරයි)
    function setupPlayerSoundToggle(buttonId, playerKey, mutedIconId, unmutedIconId) {
        const soundBtn = document.getElementById(buttonId);
        const iconMuted = document.getElementById(mutedIconId);
        const iconUnmuted = document.getElementById(unmutedIconId);

        if (!soundBtn) { console.warn(`Sound button missing for player: ${playerKey} (ID: ${buttonId})`); return; }
        if (!iconMuted) { console.warn(`Muted icon missing for player: ${playerKey} (ID: ${mutedIconId})`); return; }
        if (!iconUnmuted) { console.warn(`Unmuted icon missing for player: ${playerKey} (ID: ${unmutedIconId})`); return; }

        const updateIcon = (isMuted) => {
            if (!iconMuted || !iconUnmuted) return;
            if (isMuted) {
                iconMuted.classList.remove('hidden');
                iconUnmuted.classList.add('hidden');
            } else {
                iconUnmuted.classList.remove('hidden');
                iconMuted.classList.add('hidden');
            }
        };

        const ensurePlayerReady = setInterval(() => {
            const player = window.players?.[playerKey]?.player;
            if (window.players?.[playerKey]?.ready && player && typeof player.isMuted === 'function') {
                clearInterval(ensurePlayerReady);
                console.log(`${playerKey} player ready. Initializing sound icon via generic setup.`);
                try {
                    updateIcon(player.isMuted());
                } catch (e) {
                    console.error(`Error calling isMuted for ${playerKey}:`, e);
                }
            }
        }, 500);

        soundBtn.addEventListener('click', () => {
            const player = window.players?.[playerKey]?.player;
            if (!player || typeof player.isMuted !== 'function' || typeof player.unMute !== 'function' || typeof player.mute !== 'function') {
                console.warn(`${playerKey} player not ready for sound toggle or missing functions.`);
                return;
            }

            try {
                let newStateIsMuted;
                if (player.isMuted()) {
                    player.unMute();
                    newStateIsMuted = false;
                    console.log(`${playerKey} unmuted via generic button.`);
                } else {
                    player.mute();
                    newStateIsMuted = true;
                    console.log(`${playerKey} muted via generic button.`);
                }
                updateIcon(newStateIsMuted);

                if (typeof window.handleUserInteraction === 'function') {
                    window.handleUserInteraction();
                }
            } catch (e) {
                console.error(`Error toggling mute for ${playerKey}:`, e);
            }
        });
    }

    // Setup ALL sound buttons using the generic function
    setupPlayerSoundToggle('sound-toggle-btn', 'hero', 'icon-muted', 'icon-unmuted');
    setupPlayerSoundToggle('sound-toggle-btn-ella', 'ella', 'icon-muted-ella', 'icon-unmuted-ella');
    setupPlayerSoundToggle('sound-toggle-btn-perahera', 'perahera', 'icon-muted-perahera', 'icon-unmuted-perahera');
    setupPlayerSoundToggle('sound-toggle-btn-beach', 'beach', 'icon-muted-beach', 'icon-unmuted-beach');
    setupPlayerSoundToggle('sound-toggle-btn-religions', 'religion', 'icon-muted-religions', 'icon-unmuted-religions');

    // (අනවශ්‍ය, hero-specific sound toggle script එක ඉවත් කර ඇත)

});