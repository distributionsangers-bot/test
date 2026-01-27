
export const CookieConsent = {
    init() {
        if (!localStorage.getItem('cookie_consent')) {
            this.showBanner();
        }
    },

    showBanner() {
        // Prevent duplicates
        if (document.getElementById('cookie-banner')) return;

        const b = document.createElement('div');
        b.id = 'cookie-banner';
        b.className = 'fixed bottom-0 w-full bg-white p-6 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-[100] animate-slide-up flex flex-col md:flex-row gap-4 items-center justify-between';

        b.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-2xl">🍪</span>
                <div class="text-sm text-slate-500 font-medium">
                    Nous utilisons des cookies essentiels pour l'authentification.
                </div>
            </div>
            <button id="btn-accept-cookies" class="px-6 py-3 bg-slate-900 text-white font-bold rounded-xl text-sm hover:bg-slate-800 transition shadow-lg w-full md:w-auto">
                Accepter
            </button>
        `;

        document.body.appendChild(b);

        const btn = b.querySelector('#btn-accept-cookies');
        btn.addEventListener('click', () => {
            localStorage.setItem('cookie_consent', 'ok');
            b.remove();
        });
    }
};
