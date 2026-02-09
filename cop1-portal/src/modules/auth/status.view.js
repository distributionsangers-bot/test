
import { APP_CONFIG } from '../../core/constants.js';
import { createIcons, icons } from 'lucide';
import { supabase } from '../../services/supabase.js';

const { LOGO_URL } = APP_CONFIG;

// ==========================================
// PENDING VIEW
// ==========================================
export function renderPending() {
    return `
        <div class="min-h-[100dvh] w-full bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center p-6">
            
            <!-- Background Decorations -->
            <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div class="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] bg-amber-400/20 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div class="absolute top-[40%] -left-[10%] w-[60vw] h-[60vw] bg-brand-400/20 rounded-full blur-[100px] animate-pulse-slow" style="animation-delay: 1s;"></div>
            </div>

            <!-- Card -->
            <div class="relative w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 p-8 z-10 animate-slide-up text-center">
                
                <!-- Icon -->
                <div class="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-white">
                    <div class="relative">
                        <i data-lucide="hourglass" class="w-10 h-10 text-amber-500 animate-pulse"></i>
                        <div class="absolute top-0 right-0 w-3 h-3 bg-amber-500 rounded-full animate-ping"></div>
                    </div>
                </div>

                <h1 class="text-3xl font-black text-slate-800 mb-3 tracking-tight">Inscription en cours</h1>
                
                <p class="text-slate-500 font-medium leading-relaxed mb-8">
                    Votre dossier est bien reçu ! Notre équipe examine actuellement votre profil ! 
                </p>

                <!-- Steps -->
                <div class="bg-slate-50 rounded-2xl p-4 mb-8 text-left space-y-3 border border-slate-100/50">
                    <div class="flex items-center gap-3 opacity-50">
                        <div class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">✓</div>
                        <span class="text-sm font-bold text-slate-800">Compte créé</span>
                    </div>
                    <div class="flex items-center gap-3 opacity-50">
                        <div class="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">✓</div>
                        <span class="text-sm font-bold text-slate-800">Justificatif envoyé</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center animate-pulse">
                            <i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i>
                        </div>
                        <span class="text-sm font-bold text-amber-600">Validation administrateur</span>
                    </div>
                </div>

                <div class="space-y-3">
                    <button data-action="refresh" class="w-full py-4 bg-gradient-to-r from-brand-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/30 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all transform flex items-center justify-center gap-2">
                        <i data-lucide="refresh-cw" class="w-5 h-5"></i>
                        Actualiser la page
                    </button>
                    <button data-action="logout" class="w-full py-4 bg-white border-2 border-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-[0.98]">
                        Me déconnecter
                    </button>
                    <div class="text-[10px] text-slate-400 font-medium">
                        Une question ? <a href="mailto:angers@cop1.fr" class="text-brand-600 hover:underline">Contacter le support</a>
                    </div>
                </div>
            </div>
            
            <!-- Branding Footer -->
            <div class="absolute bottom-6 flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                <img src="${LOGO_URL}" class="w-6 h-6 object-contain" alt="Logo">
                <span class="text-xs font-bold text-slate-400">COP1 Angers</span>
            </div>
        </div>
    `;
}

export function initPending() {
    createIcons({ icons });

    // Gestionnaire pour le bouton Actualiser
    document.querySelector('[data-action="refresh"]')?.addEventListener('click', () => {
        window.location.reload();
    });
}


// ==========================================
// REFUSED VIEW
// ==========================================
export function renderRejected() {
    return `
        <div class="min-h-[100dvh] w-full bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center p-6">
            
            <!-- Background Decorations -->
            <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div class="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] bg-red-400/20 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div class="absolute bottom-0 left-0 w-[50vw] h-[50vw] bg-slate-400/20 rounded-full blur-[100px]"></div>
            </div>

            <!-- Card -->
            <div class="relative w-full max-w-md bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/50 p-8 z-10 animate-slide-up text-center">
                
                <!-- Icon -->
                <div class="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-white">
                    <i data-lucide="shield-alert" class="w-10 h-10 text-red-500"></i>
                </div>

                <h1 class="text-3xl font-black text-slate-800 mb-3 tracking-tight">Inscription non validée</h1>
                
                <p class="text-slate-500 font-medium leading-relaxed mb-8">
                    Nous sommes désolés, mais votre inscription n'a pas pu être validée pour le moment. Cela peut être dû à un justificatif non conforme ou à des critères d'éligibilité.
                </p>

                <div class="space-y-4">
                    <a href="mailto:angers@cop1.fr" class="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all transform">
                        <i data-lucide="mail" class="w-5 h-5"></i>
                        Contacter l'équipe
                    </a>
                    
                    <button data-action="logout" class="w-full py-4 bg-transparent text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors">
                        Se déconnecter
                    </button>
                </div>
            </div>

             <!-- Branding Footer -->
            <div class="absolute bottom-6 flex items-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                <img src="${LOGO_URL}" class="w-6 h-6 object-contain" alt="Logo">
                <span class="text-xs font-bold text-slate-400">COP1 Angers</span>
            </div>
        </div>
    `;
}

export function initRejected() {
    createIcons({ icons });
}
