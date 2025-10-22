// === YouTube IFrame Player API Logic ===
// (මේ Variables ටික Global තියෙන්න ඕන API එක call කරන නිසා)
var players = {
    ella: { player: null, ready: false, sectionVisible: false, sectionId: 'ella-beauty', elementId: 'ella-youtube-video', hasPlayedOnce: false, observerSetup: false },
    perahera: { player: null, ready: false, sectionVisible: false, sectionId: 'perahera-youtube', elementId: 'perahera-youtube-video', hasPlayedOnce: false, observerSetup: false },
    beach: { player: null, ready: false, sectionVisible: false, sectionId: 'beaches-youtube', elementId: 'beach-youtube-video', hasPlayedOnce: false, observerSetup: false }
};
var apiReady = false;
var userInteracted = false;

function handleUserInteraction() {
    if (!userInteracted) {
        console.log("User interaction detected.");
        userInteracted = true;
        Object.keys(players).forEach(playerKey => {
            const config = players[playerKey];
            if (config.ready && config.sectionVisible && config.player && typeof config.player.unMute === 'function') {
                console.log(`Attempting to unmute ${playerKey} after interaction.`);
                config.player.unMute();
            }
        });
    }
}

// YouTube API එක load උනාම මේ function එක call කරයි
function onYouTubeIframeAPIReady() {
    console.log("YouTube API Ready.");
    apiReady = true;
    initPlayersIfReady(); // Try initializing players if DOM is already ready
}

function initPlayersIfReady() {
    // Only proceed if API is ready AND DOM is ready (or very close to it)
    if (!apiReady || (document.readyState !== 'interactive' && document.readyState !== 'complete')) {
         console.log(`API Ready: ${apiReady}, DOM State: ${document.readyState}. Waiting...`);
        // If API is ready but DOM isn't, add listener. If DOM ready but API isn't, onYouTubeIframeAPIReady will call this again.
        if (apiReady && (document.readyState === 'loading' || document.readyState === 'interactive')) {
             document.addEventListener('DOMContentLoaded', initPlayersIfReady);
        }
        return;
    }

    console.log("DOM ready and API ready. Initializing players.");
    Object.keys(players).forEach(playerKey => {
        const config = players[playerKey];
        const element = document.getElementById(config.elementId);
        if (!config.player && element) {
            console.log(`Creating ${playerKey} Player.`);
            try {
                config.player = new YT.Player(config.elementId, {
                    events: {
                        'onReady': (event) => onPlayerReady(event, playerKey),
                        'onError': onPlayerError
                    }
                });
            } catch (error) {
                 console.error(`Error creating YouTube player for ${playerKey}:`, error);
            }
        } else if (!element) {
             console.warn(`Element with ID ${config.elementId} not found for ${playerKey} player.`);
        }
    });
}

function onPlayerReady(event, playerKey) {
    console.log(`${playerKey} Player Ready.`);
    players[playerKey].ready = true;
    if (event.target && typeof event.target.mute === 'function') {
        event.target.mute();
    }
    setupIntersectionObserver(playerKey); // Setup observer AFTER player is ready
}

function onPlayerError(event) {
    let playerId = 'Unknown Player';
    try { playerId = event.target.getIframe().id || playerId; } catch (e) {}
    console.error("YouTube Player Error:", playerId, "Data:", event.data);
}

function setupIntersectionObserver(playerKey) {
    const config = players[playerKey];
    if (config.observerSetup || !config.ready) return; // Setup only once per ready player

    const section = document.getElementById(config.sectionId);
    if (!section) {
        console.warn(`Section #${config.sectionId} not found for Observer setup for ${playerKey}.`);
        return;
    }

    const observerOptions = { threshold: 0.5 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            config.sectionVisible = entry.isIntersecting;
            controlPlayerBasedOnVisibility(playerKey, entry.isIntersecting);
        });
    }, observerOptions);

    observer.observe(section);
    config.observerSetup = true; // Mark as setup
    console.log(`Observer started for #${config.sectionId}`);

    // Check initial visibility right after setup
    // Use requestAnimationFrame to ensure layout is stable
    requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const initiallyVisible = rect.top < window.innerHeight && rect.bottom >= 0 && rect.width > 0 && rect.height > 0;
         // Check intersection ratio manually for the threshold
         const intersectionRatio = calculateIntersectionRatio(rect, window.innerHeight, window.innerWidth);

        if (initiallyVisible && intersectionRatio >= observerOptions.threshold) {
            console.log(`Section ${config.sectionId} was initially intersecting at threshold.`);
            if (!config.sectionVisible) { // If observer didn't trigger yet
                 config.sectionVisible = true;
                 controlPlayerBasedOnVisibility(playerKey, true);
            }
        } else {
             console.log(`Section ${config.sectionId} initially visible: ${initiallyVisible}, ratio: ${intersectionRatio.toFixed(2)}`);
        }
    });
}

// Helper to calculate intersection ratio manually (simplified)
function calculateIntersectionRatio(rect, viewportHeight, viewportWidth) {
     const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
     const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
     const visibleArea = visibleWidth * visibleHeight;
     const totalArea = rect.width * rect.height;
     return totalArea > 0 ? visibleArea / totalArea : 0;
}


function controlPlayerBasedOnVisibility(playerKey, isIntersecting) {
    const config = players[playerKey];
    // Check if player exists and has the required methods
    if (!config || !config.ready || !config.player || typeof config.player.playVideo !== 'function') {
         console.warn(`Player ${playerKey} not ready or invalid for visibility control.`);
        return;
    }

    if (isIntersecting) {
        console.log(`Section ${playerKey} intersecting. Playing video.`);
        config.player.playVideo();
        config.hasPlayedOnce = true;
        if (userInteracted && typeof config.player.unMute === 'function') {
            config.player.unMute();
        } else if (!userInteracted && config.hasPlayedOnce && typeof config.player.mute === 'function') {
            config.player.mute(); // Ensure it stays muted if no interaction
        }
    } else {
        // Only pause if it has played at least once
        if (config.hasPlayedOnce && typeof config.player.pauseVideo === 'function') {
             console.log(`Section ${playerKey} not intersecting. Pausing video.`);
            config.player.pauseVideo();
        }
    }
}

// Add the initial interaction listener (should be global)
document.addEventListener('click', handleUserInteraction, { once: true });


// === Main Application Logic (Runs after DOM is loaded) ===
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Running main application logic.");

    // Attempt to initialize YouTube players if API might be ready already
    initPlayersIfReady();

    // --- 1. Swiper Slider Initialization ---
    try {
         const packageSlider = document.querySelector('.tour-packages-slider');
         if (packageSlider) {
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
         } else {
              console.warn("Tour packages slider container (.tour-packages-slider) not found.");
         }
    } catch (error) {
        console.error("Error initializing Swiper slider:", error);
    }


    // --- 2. Preloader Logic ---
    const preloader = document.getElementById('preloader');
    const heroVideoForPreloader = document.getElementById('hero-video'); // Use a distinct name if needed elsewhere
    let isVideoLoaded = false;
    let isAnimationComplete = false;

    function attemptToHidePreloader() {
        if (isVideoLoaded && isAnimationComplete && preloader && preloader.style.opacity !== '0') {
            console.log("Hiding preloader...");
            preloader.style.opacity = '0';
            setTimeout(() => {
                preloader.style.display = 'none';
                document.body.style.overflow = ''; // Allow scrolling
                // Try playing the main hero video after preloader hides
                if (heroVideoForPreloader && typeof heroVideoForPreloader.play === 'function' && heroVideoForPreloader.paused) {
                    heroVideoForPreloader.play().catch(error => {
                        console.log("Hero video playback failed after preloader:", error);
                        // Maybe show a play button or message if autoplay fails critically
                    });
                }
            }, 700); // Match opacity transition duration
        }
    }

    function onVideoLoadComplete() {
         console.log("Preloader video load complete triggered.");
        if (!isVideoLoaded) {
            isVideoLoaded = true;
            // No need to pause here, let the hero logic handle it
            attemptToHidePreloader();
        }
    }

    function onAnimationComplete() {
         console.log("Preloader animation complete.");
        if (!isAnimationComplete) {
            isAnimationComplete = true;
            attemptToHidePreloader();
        }
    }

    function startLoaderAnimation() {
         console.log("Starting preloader animation timer.");
        // Minimum display time for the preloader animation
        setTimeout(onAnimationComplete, 3000); // Wait 3 seconds
    }

    if (preloader) {
         if (heroVideoForPreloader && typeof heroVideoForPreloader.play === 'function') { // Check if it's a valid video element
              // Check if video is already loaded (might happen quickly from cache)
              if (heroVideoForPreloader.readyState >= 3) { // HAVE_FUTURE_DATA or more
                  console.log("Preloader video already loaded.");
                  onVideoLoadComplete();
              } else {
                  heroVideoForPreloader.onloadeddata = onVideoLoadComplete;
                  heroVideoForPreloader.onerror = () => {
                       console.error("Hero video failed to load for preloader.");
                       onVideoLoadComplete(); // Treat error as 'loaded' to hide preloader
                  };
              }
         } else {
              console.warn("Hero video element not found or invalid for preloader check. Assuming video loaded.");
              isVideoLoaded = true; // Assume video is 'loaded' if not found, to eventually hide preloader
         }

        // Safety fallback if video events don't fire
        setTimeout(() => {
             console.log("Preloader video load fallback timer triggered.");
             onVideoLoadComplete();
        }, 8000);

        startLoaderAnimation(); // Start the minimum display timer
    } else {
         console.warn("Preloader element not found.");
         // If no preloader, ensure body overflow is correct
         document.body.style.overflow = '';
    }


    // --- 3. Hero Video Sound & Scroll Logic ---
    const heroSection = document.getElementById('hero-section');
    const video = document.getElementById('hero-video'); // Reuse variable, refers to the main hero video
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const soundBtn = document.getElementById('sound-toggle-btn');
    const iconMuted = document.getElementById('icon-muted');
    const iconUnmuted = document.getElementById('icon-unmuted');

    if (heroSection && video && typeof video.play === 'function' && welcomeOverlay && soundBtn && iconMuted && iconUnmuted) {
        function updateSoundIcon(isMuted) {
            if (isMuted) {
                iconMuted.classList.remove('hidden');
                iconUnmuted.classList.add('hidden');
            } else {
                iconUnmuted.classList.remove('hidden');
                iconMuted.classList.add('hidden');
            }
        }

        // Attempt to autoplay with sound, fallback to muted
        video.muted = false; // Try unmuted first
        let playPromise = video.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log("Hero video autoplay with sound successful!");
                updateSoundIcon(false);
            }).catch(error => {
                console.log("Hero video autoplay with sound prevented. Playing muted.", error);
                video.muted = true;
                video.play().catch(err => console.error("Hero video failed to play even when muted:", err)); // Try playing muted
                updateSoundIcon(true);
            });
        } else {
             // Fallback for browsers that don't return a promise (older?)
             // Assume muted autoplay might work
             console.log("video.play() did not return a promise. Attempting muted play.");
             video.muted = true;
             video.play().catch(err => console.error("Hero video failed to play (no promise fallback):", err));
             updateSoundIcon(true);
        }

        soundBtn.addEventListener('click', () => {
            video.muted = !video.muted;
            updateSoundIcon(video.muted);
             console.log("Hero video muted state:", video.muted);
        });

        // Welcome overlay and scroll logic
        let isSequenceTriggered = false;
        video.addEventListener('timeupdate', () => {
            if (isNaN(video.duration) || video.duration <= 0) return; // Ignore if duration is invalid

            // Check if near the end (e.g., last 2 seconds)
            if (!isSequenceTriggered && video.currentTime >= video.duration - 2) {
                isSequenceTriggered = true;
                 console.log("Hero video near end. Pausing and showing overlay.");
                video.pause();
                welcomeOverlay.classList.add('visible');

                // Hide overlay after 10 seconds and scroll
                setTimeout(() => {
                     console.log("Hiding welcome overlay.");
                    welcomeOverlay.classList.remove('visible');
                    setTimeout(() => {
                        const nextSection = document.getElementById('sri-lankan-hospitality'); // Corrected target ID
                        if (nextSection) {
                             console.log("Scrolling to next section.");
                            nextSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        } else {
                             console.warn("Next section for scroll ('sri-lankan-hospitality') not found.");
                        }
                    }, 500); // Wait for fade-out before scrolling
                }, 10000); // Overlay display duration
            }
        });

        // Intersection Observer for Hero Video Play/Pause on Scroll
        const heroObserverCallback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isSequenceTriggered) {
                     // Check if video is already playing to avoid unnecessary calls
                     if (video.paused) {
                          console.log("Hero section intersecting, playing video.");
                          video.play().catch(error => {
                              // Autoplay might still fail here if user hasn't interacted yet
                              console.log("Hero video play failed on intersection:", error);
                          });
                     }
                } else {
                     // Check if video is playing before pausing
                     if (!video.paused) {
                          console.log("Hero section not intersecting, pausing video.");
                          video.pause();
                     }
                }
            });
        };

        const heroObserver = new IntersectionObserver(heroObserverCallback, { threshold: 0.1 }); // Play when 10% visible
        heroObserver.observe(heroSection);

    } else {
        console.warn("One or more Hero section elements are missing or invalid (video, overlay, sound button, icons).");
    }

    // --- 4. Stats Counter Animation ---
    const statsContainer = document.getElementById('stats-counter');
    if (statsContainer) {
        const animateCounters = (entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                     console.log("Stats counter intersecting.");
                    const counters = entry.target.querySelectorAll('span[data-target]');
                    counters.forEach(counter => {
                         // Check if already animated
                         if (counter.dataset.animated) return;
                         counter.dataset.animated = 'true'; // Mark as animated

                        const target = +counter.dataset.target;
                        if (isNaN(target)) return; // Skip if target is not a number

                        let current = 0;
                        const duration = 2000; // 2 seconds
                        const stepTime = 20; // Update every 20ms
                        const totalSteps = duration / stepTime;
                        const increment = Math.max(1, Math.ceil(target / totalSteps)); // Ensure increment is at least 1

                        const updateCounter = () => {
                            current += increment;
                            if (current >= target) {
                                counter.textContent = target.toLocaleString() + (target === 2500 || target === 10000 ? '+' : ''); // Add '+' for specific targets
                            } else {
                                counter.textContent = current.toLocaleString();
                                setTimeout(updateCounter, stepTime); // Continue animation
                            }
                        };
                        updateCounter(); // Start the animation
                    });
                    observer.unobserve(entry.target); // Animate only once
                }
            });
        };

        const statsObserver = new IntersectionObserver(animateCounters, {
            threshold: 0.5 // Trigger when 50% visible
        });
        statsObserver.observe(statsContainer);
    } else {
        console.warn("Stats counter container (#stats-counter) not found.");
    }

    // --- 5. Religions Video Logic ---
    const religionsData = [
         { name: "Buddhism", description: "Buddhism is the most widely practiced religion...", videoUrl: "regi.mp4" },
         { name: "Hinduism", description: "A vibrant and ancient faith, Hinduism in Sri Lanka...", videoUrl: "hindu.mp4" },
         { name: "Islam", description: "Introduced by Arab traders centuries ago, Islam...", videoUrl: "islam.mp4" }
    ];
    const religionSection = document.getElementById('religions');
    const religionVideoPlayer = document.getElementById('religion-video'); // Use unique name
    const religionContent = document.getElementById('religion-content');
    const religionNameEl = document.getElementById('religion-name');
    const religionDescriptionEl = document.getElementById('religion-description');
    const soundBtnReligions = document.getElementById('sound-toggle-btn-religions');
    const iconMutedReligions = document.getElementById('icon-muted-religions');
    const iconUnmutedReligions = document.getElementById('icon-unmuted-religions');

    if (religionSection && religionVideoPlayer && typeof religionVideoPlayer.play === 'function' && religionContent && religionNameEl && religionDescriptionEl && soundBtnReligions && iconMutedReligions && iconUnmutedReligions) {
        let currentReligionIndex = 0;

        function updateReligionSoundIcon(isMuted) {
            if (isMuted) {
                iconMutedReligions.classList.remove('hidden');
                iconUnmutedReligions.classList.add('hidden');
            } else {
                iconUnmutedReligions.classList.remove('hidden');
                iconMutedReligions.classList.add('hidden');
            }
        }

        function updateReligion(index) {
            currentReligionIndex = index;
            const religion = religionsData[index];
             console.log(`Updating religion to: ${religion.name}`);

            religionVideoPlayer.src = religion.videoUrl;
            religionVideoPlayer.load(); // Important to load the new source
            let religionPlayPromise = religionVideoPlayer.play();

             if (religionPlayPromise !== undefined) {
                 religionPlayPromise.catch(error => {
                      console.log(`Autoplay for religion video ${religion.name} prevented:`, error);
                      // If autoplay fails, it might need user interaction.
                      // We still update the text content.
                 });
             }


            // Fade out text, update, fade in
            religionContent.style.opacity = 0;
            setTimeout(() => {
                religionNameEl.textContent = religion.name;
                religionDescriptionEl.textContent = religion.description;
                religionContent.style.opacity = 1;
            }, 500); // Adjust timing as needed
        }

        // Cycle through videos when one ends
        religionVideoPlayer.addEventListener('ended', () => {
             console.log("Religion video ended. Loading next.");
            const nextIndex = (currentReligionIndex + 1) % religionsData.length;
            updateReligion(nextIndex);
        });

        // Manual sound toggle
        soundBtnReligions.addEventListener('click', () => {
            religionVideoPlayer.muted = !religionVideoPlayer.muted;
            updateReligionSoundIcon(religionVideoPlayer.muted);
             console.log("Religion video muted state:", religionVideoPlayer.muted);
        });

        // Intersection Observer for Religion Video Mute/Unmute on Scroll
        const religionObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                     console.log("Religion section intersecting. Unmuting video.");
                     // Only unmute if user has interacted with the page globally
                     if (userInteracted) {
                           religionVideoPlayer.muted = false;
                           updateReligionSoundIcon(false);
                     } else {
                          // Keep it muted if no interaction yet
                          religionVideoPlayer.muted = true;
                          updateReligionSoundIcon(true);
                     }
                } else {
                     console.log("Religion section not intersecting. Muting video.");
                    religionVideoPlayer.muted = true;
                    updateReligionSoundIcon(true);
                }
            });
        }, {
            threshold: 0.5 // Trigger when 50% visible
        });

        religionObserver.observe(religionSection);

        // Initial load - start muted
        religionVideoPlayer.muted = true;
        updateReligionSoundIcon(true);
        updateReligion(0); // Load the first religion video

    } else {
        console.warn("One or more Religion section elements are missing or invalid.");
    }


    // --- 6. Historical Sites Slider ---
    const textItems = document.querySelectorAll('#historical-sites .slider-text-item'); // More specific selector
    const imageItems = document.querySelectorAll('#historical-sites .slider-image-item'); // More specific selector
    const dotsContainer = document.getElementById('slider-dots');
    let historicalSlideInterval = null; // Use unique interval variable

    if (textItems.length > 0 && imageItems.length === textItems.length && dotsContainer) {
        let currentHistoricalSlide = 0; // Use unique current slide variable
        const totalHistoricalSlides = textItems.length;

        // Add counter element only if not already present
        textItems.forEach((item, index) => {
             if (!item.querySelector('.counter-text')) {
                  const counterDiv = document.createElement('p');
                  counterDiv.classList.add('counter-text', 'hidden', 'md:block', 'text-sm', 'text-gray-500', 'mt-4'); // Added some styling
                  counterDiv.setAttribute('data-index', index);
                  item.appendChild(counterDiv);
             }
        });

        const createDots = () => {
            dotsContainer.innerHTML = ''; // Clear existing dots first
            for (let i = 0; i < totalHistoricalSlides; i++) {
                const dot = document.createElement('button');
                dot.classList.add('slider-dot', 'w-3', 'h-3', 'bg-gray-300', 'rounded-full', 'transition-colors', 'duration-300', 'hover:bg-gray-400'); // Add base styles
                 dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
                dot.addEventListener('click', () => {
                    showHistoricalSlide(i); // Use specific function name
                    resetHistoricalInterval(); // Use specific function name
                });
                dotsContainer.appendChild(dot);
            }
        };

        const dots = dotsContainer.children; // Get live collection

        function showHistoricalSlide(index) {
            if (index < 0 || index >= totalHistoricalSlides) {
                 console.error("Invalid slide index requested:", index);
                 return;
            }

            // Deactivate all
            textItems.forEach(item => item.classList.remove('active'));
            imageItems.forEach(item => item.classList.remove('active'));
             Array.from(dots).forEach(dot => dot.classList.remove('active', 'bg-brand-orange')); // Deactivate dots

            // Activate current
            textItems[index].classList.add('active');
            imageItems[index].classList.add('active');
            if (dots[index]) {
                 dots[index].classList.add('active', 'bg-brand-orange'); // Activate dot
                 dots[index].classList.remove('bg-gray-300');
            } else {
                 console.warn(`Dot element for index ${index} not found.`);
            }


            // Update counter text
            const activeCounter = textItems[index].querySelector('.counter-text');
            if (activeCounter) {
                activeCounter.textContent = `${index + 1} / ${totalHistoricalSlides}`;
            }

            currentHistoricalSlide = index;
        }

        function nextHistoricalSlide() {
            const newIndex = (currentHistoricalSlide + 1) % totalHistoricalSlides;
            showHistoricalSlide(newIndex);
        }

        function startHistoricalInterval() {
             clearInterval(historicalSlideInterval); // Clear any existing interval first
            historicalSlideInterval = setInterval(nextHistoricalSlide, 5000); // 5 seconds
        }

        function resetHistoricalInterval() {
            clearInterval(historicalSlideInterval);
            startHistoricalInterval();
        }

        createDots(); // Create dots dynamically
        showHistoricalSlide(0); // Show the first slide initially
        startHistoricalInterval(); // Start the automatic sliding

         // Pause on hover
         const sliderElement = document.getElementById('historical-sites');
         if(sliderElement){
              sliderElement.addEventListener('mouseenter', () => clearInterval(historicalSlideInterval));
              sliderElement.addEventListener('mouseleave', startHistoricalInterval);
         }


    } else {
        console.warn("Historical sites slider elements (text, image, or dots container) not found or counts mismatch.");
    }


    // --- 7. Interactive Map ('Things to Do' Section) ---
    const locations = {
        'habarana': { name: 'Habarana', description: 'A central hub for cultural tourism...', imageSrc: 'habarana.png' },
        'sigiriya': { name: 'Sigiriya Rock Fortress', description: 'The magnificent Lion Rock Fortress...', imageSrc: 'sigiriya.png' },
        'colombo': { name: 'Colombo', description: 'The vibrant commercial capital...', imageSrc: 'colombo.png' },
        'kandy': { name: 'Kandy', description: 'The last royal capital...', imageSrc: 'kandy.png' },
        'nuwaraeliya': { name: 'Nuwara Eliya', description: 'Known as "Little England,"...', imageSrc: 'nuwaraeliya.png' }, // Corrected name
        'ella': { name: 'Ella', description: 'A charming town in the hill country...', imageSrc: 'ella.png' }, // Corrected name
        'galle': { name: 'Galle (South Coast)', description: 'A stunning coastal city famous...', imageSrc: 'south.png' }
    };
    const mapHotspots = document.querySelectorAll('#map-container .map-hotspot'); // Specific selector
    const locationNameEl = document.getElementById('location-name');
    const locationDescriptionEl = document.getElementById('location-description');
    const locationImageWrapper = document.getElementById('location-image-wrapper');
    const locationImageEl = document.getElementById('location-image');
    let typingInterval = null; // Unique variable for this typing effect

    if (mapHotspots.length > 0 && locationNameEl && locationDescriptionEl && locationImageWrapper && locationImageEl) {
        function typeEffectLocation(element, text) { // Specific function name
            clearInterval(typingInterval);
            element.textContent = '';
            element.classList.remove('typing-done');
            let i = 0;
            const speed = 20; // Typing speed (milliseconds)
            typingInterval = setInterval(() => {
                if (i < text.length) {
                    element.textContent += text.charAt(i);
                    i++;
                } else {
                    clearInterval(typingInterval);
                    element.classList.add('typing-done');
                }
            }, speed);
        }

        function updateLocationInfo(locationKey) {
            const data = locations[locationKey];
            if (!data) {
                 console.warn(`Location data not found for key: ${locationKey}`);
                 return;
            }

            locationNameEl.textContent = data.name;
            typeEffectLocation(locationDescriptionEl, data.description);

            // Fade image out, change src, fade in
            locationImageWrapper.style.opacity = 0;
            setTimeout(() => {
                locationImageEl.src = data.imageSrc;
                locationImageEl.alt = `View of ${data.name}`; // Update alt text
                locationImageWrapper.style.opacity = 1;
            }, 300); // Wait for fade out
        }

        mapHotspots.forEach(hotspot => {
            hotspot.addEventListener('click', (e) => {
                 // Prevent default button behavior if needed
                 e.preventDefault();

                // Remove active class from all hotspots
                mapHotspots.forEach(h => h.classList.remove('active'));
                // Add active class to the clicked one
                hotspot.classList.add('active');

                const locationKey = hotspot.dataset.location;
                 console.log(`Hotspot clicked: ${locationKey}`);
                updateLocationInfo(locationKey);
            });
        });

        // Optional: Show default location on load?
         // updateLocationInfo('sigiriya'); // Example: show Sigiriya info first

    } else {
        console.warn("Interactive map elements (hotspots, name, description, image) not found.");
    }

    // --- 8. Contact Form (WhatsApp Redirect) ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent actual form submission
             console.log("Contact form submitted.");

            // Get form values
            const nameInput = document.getElementById('form-name');
            const emailInput = document.getElementById('form-email');
            const messageInput = document.getElementById('form-message');

            const name = nameInput ? nameInput.value.trim() : 'N/A';
            const email = emailInput ? emailInput.value.trim() : 'N/A';
            const message = messageInput ? messageInput.value.trim() : 'N/A';
            const yourWhatsappNumber = '393513389757'; // Your number without '+' or spaces

            // Basic validation
             if (!name || !email) {
                  alert('Please fill in your name and email address.');
                  return;
             }

            // Construct WhatsApp message
            let whatsappMessage = `*New Tour Inquiry!*\n\n`;
            whatsappMessage += `*Name:* ${name}\n`;
            whatsappMessage += `*Email:* ${email}\n`;
            if (message) {
                 whatsappMessage += `*Dream/Message:* ${message}`;
            } else {
                 whatsappMessage += `*Dream/Message:* _Not provided_`;
            }


            const encodedMessage = encodeURIComponent(whatsappMessage);
            const whatsappUrl = `https://wa.me/${yourWhatsappNumber}?text=${encodedMessage}`;

             console.log(`Opening WhatsApp URL: ${whatsappUrl}`);
            window.open(whatsappUrl, '_blank'); // Open in a new tab

            // Optional: Clear form after submission
            // contactForm.reset();
        });
    } else {
        console.warn("Contact form (#contact-form) not found.");
    }

    // --- 9. Floating Panel Logic ---
    const openBtn = document.getElementById('open-packages-panel');
    const panel = document.getElementById('packages-panel');
    const closeBtn = document.getElementById('close-packages-panel');
    const mapPanelContainer = document.getElementById('map-container-panel');
    const targetSection = document.getElementById('things-to-do'); // Section to scroll to

    function openPanel() {
        if (!panel || !openBtn) return;
         console.log("Opening floating panel.");
        openBtn.style.display = 'none'; // Hide the open button
        panel.classList.remove('translate-y-full', 'opacity-0', 'pointer-events-none');
        panel.classList.add('opacity-100', 'pointer-events-auto');
        // Optional: Prevent body scroll when panel is open
        // document.body.style.overflow = 'hidden';
    }

    function closePanel() {
        if (!panel || !openBtn) return;
         console.log("Closing floating panel.");
        panel.classList.add('translate-y-full', 'opacity-0', 'pointer-events-none');
        panel.classList.remove('opacity-100', 'pointer-events-auto');
        // Restore body scroll after transition
        setTimeout(() => {
            openBtn.style.display = 'flex'; // Show the open button again
            // document.body.style.overflow = '';
        }, 500); // Match transition duration
    }

    if (openBtn) {
        openBtn.addEventListener('click', openPanel);
    } else {
        console.error("Floating panel open button ('#open-packages-panel') not found.");
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closePanel);
    } else {
        console.error("Floating panel close button ('#close-packages-panel') not found.");
    }

    // Add click listener to the map inside the panel to scroll
    if (mapPanelContainer && targetSection) {
        mapPanelContainer.addEventListener('click', () => {
             console.log("Map inside panel clicked. Closing panel and scrolling.");
            closePanel();
            // Wait a bit for the panel to close before scrolling
            setTimeout(() => {
                targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300); // Adjust delay if needed
        });
    } else {
        if (!mapPanelContainer) console.error("Map container inside panel ('#map-container-panel') not found.");
        if (!targetSection) console.error("Target section for panel map click ('#things-to-do') not found.");
    }

    // --- 10. Header Scroll Effect ---
    const header = document.getElementById('main-header');
    if (header) {
        const scrollThreshold = 50; // Pixels to scroll before changing header style
        window.addEventListener('scroll', () => {
            if (window.scrollY > scrollThreshold) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        }, { passive: true }); // Improve scroll performance
    } else {
         console.warn("Main header element ('#main-header') not found.");
    }

    // --- 11. General Scroll-triggered Fade-in Animations ---
    const scrollFadeElements = document.querySelectorAll('.scroll-fade-in'); // Specific class for this effect
    if (scrollFadeElements.length > 0) {
        const scrollFadeObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                     console.log("Element became visible:", entry.target.id || entry.target.tagName);
                    observer.unobserve(entry.target); // Animate only once
                }
            });
        }, {
            threshold: 0.1 // Trigger when 10% is visible
        });

        scrollFadeElements.forEach(el => {
            scrollFadeObserver.observe(el);
        });
    } else {
         console.log("No elements found with the '.scroll-fade-in' class for animation.");
    }

    // --- 12. Scroll-animate class handling (used in Hospitality and Map sections) ---
     const scrollAnimateElements = document.querySelectorAll('.scroll-animate');
     if (scrollAnimateElements.length > 0) {
          const scrollAnimateObserver = new IntersectionObserver((entries, observer) => {
               entries.forEach(entry => {
                    if (entry.isIntersecting) {
                         entry.target.classList.add('visible');
                          console.log("Scroll-animate element became visible:", entry.target.id || entry.target.tagName);
                         observer.unobserve(entry.target); // Animate only once
                    }
               });
          }, {
               threshold: 0.1 // Adjust threshold as needed
          });

          scrollAnimateElements.forEach(el => {
               scrollAnimateObserver.observe(el);
          });
     } else {
          console.log("No elements found with the '.scroll-animate' class.");
     }


    console.log("Main application logic setup complete.");

}); // --- End of DOMContentLoaded ---