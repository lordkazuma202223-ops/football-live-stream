// ✰ webmeji helper ✰
// hides the bottom companions whenever the player (or anything else) is
// shown in fullscreen, and brings them back when fullscreen is exited.
(function () {
    var root = document.documentElement;

    function isFullscreen() {
        return !!(document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement);
    }

    function pause(on) {
        root.classList.toggle('webmeji-paused', !!on);
    }

    function sync() { pause(isFullscreen()); }

    ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']
        .forEach(function (ev) { document.addEventListener(ev, sync); });

    // iOS Safari plays <video> in a native fullscreen that does not raise
    // the standard fullscreenchange event.
    function hookVideo(v) {
        if (!v || v.__webmejiHooked) return;
        v.__webmejiHooked = true;
        v.addEventListener('webkitbeginfullscreen', function () { pause(true); }, true);
        v.addEventListener('webkitendfullscreen', function () { sync(); }, true);
    }

    function hookAll() {
        var vids = document.getElementsByTagName('video');
        for (var i = 0; i < vids.length; i++) hookVideo(vids[i]);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hookAll);
    } else {
        hookAll();
    }

    // the player swaps the <video> in once a stream resolves; watch for it
    if (window.MutationObserver) {
        new MutationObserver(hookAll).observe(document.documentElement, { childList: true, subtree: true });
    }

    sync();
})();
