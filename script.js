// --- Global Variables ---
        let player; // Holds the YT.Player object
        let loopInterval; // Holds the interval ID for checking loop end time
        let loopCount = 0; // Current number of loops executed
        let targetLoopCount = 3; // Default/initial target loop count
        let loopStartTime = 0;
        let loopEndTime = 0;
        let currentVideoId = null; // To track the loaded video

        // --- DOM Element References ---
        const videoUrlInput = document.getElementById('videoUrl');
        const loadVideoBtn = document.getElementById('loadVideoBtn');
        const loopStartInput = document.getElementById('loopStart');
        const loopEndInput = document.getElementById('loopEnd');
        const loopTypeSelect = document.getElementById('loopType');
        const loopCountGroup = document.getElementById('loopCountGroup'); // Container for count input
        const loopCountLabel = document.getElementById('loopCountLabel'); // Label for count input
        const loopCountInput = document.getElementById('loopCountInput'); // Actual count input
        const playLoopBtn = document.getElementById('playLoopBtn');
        const errorMessageDiv = document.getElementById('error-message');
        const controlsDiv = document.getElementById('controls');
        const playerContainer = document.getElementById('player-container');

        // --- YouTube IFrame Player API ---
        // Load the IFrame Player API code asynchronously.
        // IMPORTANT: Replace the placeholder URL if needed, but www.youtube.com should work.
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api"; // Correct API URL
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // This function creates an <iframe> (and YouTube player)
        // after the API code downloads.
        function onYouTubeIframeAPIReady() {
            console.log("YouTube IFrame API Ready.");
            // Player created on 'Load Video' click
        }

        // --- Event Listeners ---
        loadVideoBtn.addEventListener('click', loadVideoHandler);
        playLoopBtn.addEventListener('click', playLoopHandler);
        loopTypeSelect.addEventListener('change', handleLoopTypeChange); // Add listener for dropdown change


        // --- Functions ---

        function displayError(message) {
            errorMessageDiv.textContent = message;
            errorMessageDiv.style.display = 'block';
            console.error("Error:", message);
        }

        function clearError() {
            errorMessageDiv.textContent = '';
            errorMessageDiv.style.display = 'none';
        }

        function extractVideoID(url) {
            clearError();
            if (!url) return null;
            // Regex to handle various YouTube URL formats (watch, short URLs, embed, etc.)
            // IMPORTANT: Make sure this regex covers the URL formats you expect.
            const regExp = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
            const match = url.match(regExp);

            if (match && match[1].length === 11) {
                return match[1]; // Return the video ID
            } else {
                displayError("Invalid or unrecognized YouTube URL format.");
                return null; // URL is not a valid YouTube link or ID not found
            }
        }

        // Function to handle showing/hiding the custom loop count input
        function handleLoopTypeChange() {
            if (loopTypeSelect.value === 'custom') {
                 loopCountGroup.style.display = 'block'; // Show the group
            } else {
                 loopCountGroup.style.display = 'none'; // Hide the group
            }
        }

        function loadVideoHandler() {
            clearError();
            stopLoop(); // Stop any previous loop

            const url = videoUrlInput.value.trim();
            const videoId = extractVideoID(url);

            if (!videoId) {
                controlsDiv.style.display = 'none';
                playLoopBtn.disabled = true;
                handleLoopTypeChange(); // Ensure custom count is hidden if URL fails
                return;
            }

            currentVideoId = videoId;
            handleLoopTypeChange(); // Set visibility of count input based on default selection

            // If player exists, load new video; otherwise, create player
            if (player && typeof player.loadVideoById === 'function') {
                player.loadVideoById(videoId);
                console.log(`Loading new video: ${videoId}`);
            } else {
                if (player && typeof player.destroy === 'function') {
                    player.destroy();
                }
                console.log(`Creating player for video: ${videoId}`);
                player = new YT.Player('player', {
                    videoId: videoId,
                    playerVars: { 'playsinline': 1 },
                    events: {
                        'onReady': onPlayerReady,
                        'onStateChange': onPlayerStateChange,
                        'onError': onPlayerError
                    }
                });
            }
            controlsDiv.style.display = 'block';
            playLoopBtn.disabled = false; // Enable button initially
        }

        function onPlayerReady(event) {
            console.log("Player Ready. Video ID:", currentVideoId);
            player = event.target;
            playLoopBtn.disabled = false;
            // Allow decimal steps for time inputs
            loopStartInput.step = "any";
            loopEndInput.step = "any";

            // Consider setting default end time?
            // const duration = player.getDuration();
            // if (duration && !loopEndInput.value) {
            //     loopEndInput.value = duration.toFixed(2); // Use toFixed for floats
            // }
        }

        function onPlayerError(event) {
            clearError();
            let errorMsg = "An error occurred with the YouTube player.";
            // Use YT.PlayerError constants if available, otherwise use codes
             const ErrorCodes = window.YT?.PlayerError || {
                INVALID_PARAMETER: 2,
                HTML5_ERROR: 5,
                VIDEO_NOT_FOUND: 100,
                EMBED_NOT_ALLOWED: 101,
                EMBED_NOT_ALLOWED2: 150
             };
            switch (event.data) {
                case ErrorCodes.INVALID_PARAMETER:
                    errorMsg = "Player Error: Invalid video URL or parameters.";
                    break;
                case ErrorCodes.HTML5_ERROR:
                    errorMsg = "Player Error: Problem with the HTML5 player.";
                    break;
                case ErrorCodes.VIDEO_NOT_FOUND:
                     errorMsg = "Player Error: Video not found (removed or private).";
                    break;
                case ErrorCodes.EMBED_NOT_ALLOWED:
                case ErrorCodes.EMBED_NOT_ALLOWED2:
                    errorMsg = "Player Error: Playback disallowed by the video owner on embedded players.";
                    break;
                default:
                     errorMsg = `Player Error: Code ${event.data}`;
            }
             displayError(errorMsg);
             console.error('YouTube Player Error:', event.data);
             playLoopBtn.disabled = true;
             controlsDiv.style.display = 'none';
        }


        function onPlayerStateChange(event) {
            console.log("Player State Changed:", event.data);
            // If video ends naturally or is paused manually outside the loop, stop the loop interval
            if (event.data === YT.PlayerState.ENDED || event.data === YT.PlayerState.PAUSED) {
                 if (loopInterval) {
                      console.log("Player paused or ended, stopping loop check.");
                      stopLoop();
                 }
            }
            // If the video starts playing (could be manual play or seek), enable loop button
            if (event.data === YT.PlayerState.PLAYING) {
                  playLoopBtn.disabled = false;
            }
            // If video cued or ready, make sure button is enabled
            if (event.data === YT.PlayerState.CUED || event.data === YT.PlayerState.UNSTARTED){
                  playLoopBtn.disabled = false;
            }
        }

        function playLoopHandler() {
            clearError();

            if (!player || typeof player.seekTo !== 'function' || typeof player.getPlayerState !== 'function') {
                displayError("Player is not ready. Please load a video first.");
                return;
            }

            // Get loop times and type
            const start = parseFloat(loopStartInput.value);
            const end = parseFloat(loopEndInput.value);
            const loopType = loopTypeSelect.value;
            let customCount = 0;

            // Validation: Start Time
            if (isNaN(start) || start < 0) {
                displayError("Invalid Loop Start time. Please enter a non-negative number (seconds).");
                return;
            }
            // Validation: End Time
            if (isNaN(end) || end <= 0) {
                displayError("Invalid Loop End time. Please enter a positive number greater than zero (seconds).");
                return;
            }
            // Validation: End > Start
            if (end <= start) {
                displayError("Loop End time must be greater than Loop Start time.");
                return;
            }

            // Validation: Check against video duration
            const duration = player.getDuration();
            if(duration && (start >= duration || end > duration)) {
                 // Allow end time to be exactly duration
                 if (end === duration && start < duration) {
                     // This is okay
                 } else {
                    displayError(`Loop times must be within video duration (0 to ${duration.toFixed(2)} seconds).`);
                    return;
                 }
            }

            // Determine target loop count based on selection
            if (loopType === 'infinite') {
                targetLoopCount = Infinity;
            } else if (loopType === '1') {
                targetLoopCount = 1;
            } else if (loopType === 'custom') {
                customCount = parseInt(loopCountInput.value, 10);
                if (isNaN(customCount) || customCount <= 0) {
                    displayError("Invalid Number of Loops. Please enter a positive whole number.");
                    return;
                }
                targetLoopCount = customCount;
            } else {
                 displayError("Invalid loop type selected."); // Should not happen
                 return;
            }


            // Set global loop parameters
            loopStartTime = start;
            loopEndTime = end;
            loopCount = 0; // Reset loop count for the new session

            console.log(`Starting loop: Start=${loopStartTime}s, End=${loopEndTime}s, Target Loops=${targetLoopCount}`);

            // Stop any existing loop interval
            stopLoop();

            // Seek to start and play
            player.seekTo(loopStartTime, true); // true allows seek ahead
            player.playVideo();

            // Start the interval to check the current time
            loopInterval = setInterval(checkLoopTime, 150); // Check ~6-7 times per second

            playLoopBtn.textContent = "Looping..."; // Give feedback
            playLoopBtn.disabled = true; // Disable button while looping
        }

        function checkLoopTime() {
            if (!player || typeof player.getCurrentTime !== 'function' || !loopInterval) {
                 stopLoop(); // Stop if player is gone or interval cleared elsewhere
                 return;
            }

            // Ensure player is playing before checking time
            if (player.getPlayerState() !== YT.PlayerState.PLAYING) {
                 // If looping is supposed to be active but player isn't playing,
                 // don't automatically stop the interval here, user might resume.
                 // Just don't perform the check/seek action.
                 return;
            }

            const currentTime = player.getCurrentTime();

            // Add a small buffer (e.g., 0.15s) to prevent overshooting due to interval timing
            const checkEndTime = loopEndTime - 0.15;

            if (currentTime >= checkEndTime) {
                 // Double check actual time before seeking in case of lag
                 if (player.getCurrentTime() >= loopEndTime) {
                    loopCount++;
                    console.log(`Loop ${loopCount} completed.`);

                    if (loopCount < targetLoopCount) {
                        // Loop again: Seek back to start
                        console.log("Seeking back to start:", loopStartTime);
                        player.seekTo(loopStartTime, true);
                        // Ensure it plays if seek caused a pause
                        if(player.getPlayerState() !== YT.PlayerState.PLAYING) {
                            player.playVideo();
                        }
                    } else {
                        // Finished looping
                        console.log("Target loop count reached. Stopping.");
                        // Seek to end precisely before pausing for a cleaner stop
                        player.seekTo(loopEndTime, true);
                        player.pauseVideo(); // Pause at the end of the last loop
                        stopLoop(); // This will clear interval and reset button
                    }
                 }
            }
        }

        function stopLoop() {
            if (loopInterval) {
                clearInterval(loopInterval);
                loopInterval = null;
                console.log("Loop interval cleared.");
                 playLoopBtn.textContent = "Play Loop"; // Reset button text
                 // Re-enable button only if player is in a valid state
                 if (player && typeof player.seekTo === 'function' && player.getPlayerState) {
                     const state = player.getPlayerState();
                     // Enable if ready, paused, playing, cued - disable on error/unstarted if desired
                     if (state !== YT.PlayerState.UNSTARTED && state !== -1 /* unstarted alias? */) {
                         playLoopBtn.disabled = false;
                     } else {
                         playLoopBtn.disabled = true; // Keep disabled if player isn't usable
                     }
                 } else {
                     playLoopBtn.disabled = true; // Keep disabled if no valid player
                 }
            }
             // Ensure button is enabled if loop wasn't active but player is ready
             else if (player && typeof player.seekTo === 'function' && !playLoopBtn.disabled) {
                 // If stopLoop was called without an active interval (e.g. on pause), ensure btn state is correct
                 const state = player.getPlayerState();
                 if (state !== YT.PlayerState.UNSTARTED && state !== -1) {
                     playLoopBtn.disabled = false;
                 }
             }
        }

        // Initial setup on script load
        handleLoopTypeChange(); // Set initial visibility of custom loop input