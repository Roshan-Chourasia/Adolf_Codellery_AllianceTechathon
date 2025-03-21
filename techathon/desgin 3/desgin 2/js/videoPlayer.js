/**
 * Enhanced Video Player Module
 * Provides utilities for video playback from S3 or local storage
 */
class VideoPlayer {
    constructor() {
        this.API_URL = 'http://localhost:5001/api';
        this.playerInstances = [];
    }

    /**
     * Creates an enhanced video player element
     * @param {string} videoUrl - The URL of the video (can be S3 key or full URL)
     * @param {Object} options - Configuration options
     * @returns {HTMLElement} - The video player element
     */
    createPlayer(videoUrl, options = {}) {
        const defaults = {
            posterUrl: '',
            width: '100%',
            height: 'auto',
            autoplay: false,
            controls: true,
            muted: false,
            loop: false,
            playbackRate: 1,
            elementId: `video-player-${Date.now()}`,
            title: '',
            showTroubleshootLink: true
        };

        const settings = { ...defaults, ...options };
        
        // Create container
        const container = document.createElement('div');
        container.className = 'video-player-container';
        container.id = `${settings.elementId}-container`;
        container.style.width = settings.width;
        
        // Create title if provided
        if (settings.title) {
            const titleElement = document.createElement('h3');
            titleElement.className = 'video-player-title';
            titleElement.textContent = settings.title;
            container.appendChild(titleElement);
        }
        
        // Create video element
        const video = document.createElement('video');
        video.id = settings.elementId;
        video.className = 'video-player enhanced';
        video.controls = settings.controls;
        video.autoplay = settings.autoplay;
        video.muted = settings.muted;
        video.loop = settings.loop;
        video.preload = 'metadata';
        video.style.width = '100%';
        video.style.height = settings.height;
        video.playbackRate = settings.playbackRate;
        
        // Set poster if provided
        if (settings.posterUrl) {
            video.poster = settings.posterUrl;
        }
        
        // Format the video URL if it appears to be just an S3 key
        let formattedVideoUrl = videoUrl;
        if (!videoUrl.startsWith('http') && !videoUrl.startsWith('/')) {
            formattedVideoUrl = `${this.API_URL}/video/${videoUrl}`;
        }
        
        // Create source element
        const source = document.createElement('source');
        source.src = formattedVideoUrl;
        source.type = 'video/mp4';
        
        // Fallback text
        video.appendChild(document.createTextNode('Your browser does not support the video tag.'));
        video.insertBefore(source, video.firstChild);
        
        // Add video to container
        container.appendChild(video);
        
        // Add troubleshooting link if enabled
        if (settings.showTroubleshootLink) {
            const troubleshootDiv = document.createElement('div');
            troubleshootDiv.className = 'video-player-troubleshoot';
            troubleshootDiv.innerHTML = `
                <a href="s3-upload-test.html" target="_blank">
                    Having video playback issues? Try our diagnostic tool
                </a>
            `;
            container.appendChild(troubleshootDiv);
        }
        
        // Add to instances
        this.playerInstances.push({
            id: settings.elementId,
            element: video,
            container: container
        });
        
        return container;
    }
    
    /**
     * Get a video player HTML string
     * @param {string} videoUrl - The URL of the video
     * @param {string} posterUrl - The URL of the poster image (optional)
     * @returns {string} - HTML for the video player
     */
    getVideoPlayerHtml(videoUrl, posterUrl = '') {
        // Format the video URL if it appears to be just an S3 key
        let formattedVideoUrl = videoUrl;
        if (!videoUrl.startsWith('http') && !videoUrl.startsWith('/')) {
            formattedVideoUrl = `${this.API_URL}/video/${videoUrl}`;
        }
        
        return `
            <div class="video-player-container">
                <video controls preload="metadata" ${posterUrl ? `poster="${posterUrl}"` : ''} class="video-player enhanced">
                    <source src="${formattedVideoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <div class="video-player-troubleshoot">
                    <a href="s3-upload-test.html" target="_blank">
                        Having video playback issues? Try our diagnostic tool
                    </a>
                </div>
            </div>
        `;
    }
}

// Create global instance
window.videoPlayer = new VideoPlayer(); 