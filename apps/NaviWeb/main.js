// Navi Landing Page - Main JavaScript

// GitHub releases base URL
const GITHUB_RELEASES_URL = 'https://github.com/Arkane-o7/Navi/releases/latest';

// Detect user's operating system and highlight the appropriate download button
function detectOS() {
    const userAgent = navigator.userAgent.toLowerCase();

    if (userAgent.includes('mac')) {
        return 'macos';
    } else if (userAgent.includes('win')) {
        return 'windows';
    } else if (userAgent.includes('linux')) {
        return 'linux';
    }

    return null;
}

// Highlight the detected OS button
function highlightPrimaryButton() {
    const detectedOS = detectOS();

    if (detectedOS) {
        const primaryBtn = document.querySelector(`.download-btn.${detectedOS}`);
        if (primaryBtn) {
            primaryBtn.classList.add('primary');
            // Move it to the top of the list
            const buttonsContainer = primaryBtn.parentElement;
            buttonsContainer.insertBefore(primaryBtn, buttonsContainer.firstChild);
        }
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    highlightPrimaryButton();

    // Add click tracking (optional - for analytics)
    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const platform = btn.classList.contains('macos') ? 'macOS' :
                btn.classList.contains('windows') ? 'Windows' : 'Linux';
            console.log(`Download clicked: ${platform}`);
        });
    });
});
