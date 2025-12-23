// Load shared header and footer so every page stays in sync
async function loadFragment(targetId, path) {
    const target = document.getElementById(targetId);
    if (!target) return;

    try {
        const response = await fetch(path, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
        const html = await response.text();
        target.innerHTML = html;
    } catch (error) {
        console.error(`[Layout] ${error.message}`);
    }
}

window.layoutReady = Promise.all([
    loadFragment('site-header', 'header.html'),
    loadFragment('site-footer', 'footer.html')
]).catch(error => {
    console.error('[Layout] Error loading shared fragments', error);
});
