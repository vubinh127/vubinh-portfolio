(function () {
    var root = document.documentElement;
    root.classList.add('js');
    try {
        var mode = localStorage.getItem('theme');
        if (mode === 'dark' || mode === 'light') root.dataset.mode = mode;
    } catch (e) {}
})();
