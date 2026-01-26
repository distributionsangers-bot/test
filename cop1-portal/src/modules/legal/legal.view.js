import { escapeHtml } from '../../services/utils.js';
import { router } from '../../core/router.js';
import { store } from '../../core/store.js';
import { createIcons, icons } from 'lucide';

const LEGAL_CONTENT = {
    mentions: {
        title: "Mentions Légales",
        subtitle: "Informations juridiques concernant l'association et la plateforme.",
        icon: "scale",
        gradient: "from-blue-600 via-blue-500 to-indigo-600",
        sections: [
            {
                title: "1. Éditeur du site",
                icon: "building-2",
                content: `
                    <p class="font-bold text-slate-800 text-base">Association COP1 Angers</p>
                    <p>Association loi 1901 à but non lucratif.</p>
                    <p>Siège social : Angers, France</p>
                    <p>Contact : via la messagerie interne de l'application.</p>
                `
            },
            {
                title: "2. Hébergement & Données",
                icon: "server",
                content: `
                    <p>L'application est hébergée techniquement (Frontend) sur le navigateur client.</p>
                    <p class="mt-3 font-medium text-slate-900">Les données et l'authentification sont hébergées par :</p>
                    <div class="bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2">
                        <p class="font-bold text-slate-800">Supabase Inc. (basé sur AWS)</p>
                        <p>San Francisco, California, USA.</p>
                    </div>
                    <p class="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <i data-lucide="shield-check" class="w-3 h-3"></i> Conforme RGPD (Data Processing Addendum).
                    </p>
                `
            },
            {
                title: "3. Propriété intellectuelle",
                icon: "copyright",
                content: `
                    <p>Le logo et le nom <span class="font-black text-brand-600">COP1 Angers</span> sont la propriété exclusive de l'association.</p>
                    <p class="mt-2">Toute reproduction, distribution ou modification sans autorisation est strictement interdite.</p>
                `
            }
        ]
    },
    privacy: {
        title: "Politique de Confidentialité",
        subtitle: "Protection et gestion de vos données personnelles.",
        icon: "shield-check",
        gradient: "from-emerald-500 via-emerald-600 to-teal-700",
        sections: [
            {
                title: "1. Données collectées",
                icon: "database",
                content: `
                    <p class="mb-2">Dans le cadre de votre inscription bénévole, nous collectons :</p>
                    <ul class="space-y-2">
                        <li class="flex items-start gap-2">
                            <i data-lucide="user" class="w-4 h-4 text-emerald-500 mt-1 shrink-0"></i>
                            <span><strong>Identité :</strong> Nom, Prénom.</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <i data-lucide="mail" class="w-4 h-4 text-emerald-500 mt-1 shrink-0"></i>
                            <span><strong>Contact :</strong> Email, Téléphone.</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <i data-lucide="graduation-cap" class="w-4 h-4 text-emerald-500 mt-1 shrink-0"></i>
                            <span><strong>Profil :</strong> Statut étudiant, préférences.</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <i data-lucide="globe" class="w-4 h-4 text-emerald-500 mt-1 shrink-0"></i>
                            <span><strong>Technique :</strong> Adresse IP (sécurité).</span>
                        </li>
                    </ul>
                `
            },
            {
                title: "2. Utilisation des données",
                icon: "file-text",
                content: `
                    <p class="mb-2">Vos données sont utilisées exclusivement pour :</p>
                    <ul class="space-y-2">
                        <li class="flex items-start gap-2">
                            <i data-lucide="calendar-check" class="w-4 h-4 text-emerald-500 mt-1 shrink-0"></i>
                            <span>Gérer le planning des distributions et collectes.</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <i data-lucide="award" class="w-4 h-4 text-emerald-500 mt-1 shrink-0"></i>
                            <span>Valider vos heures de bénévolat (attestations).</span>
                        </li>
                        <li class="flex items-start gap-2">
                            <i data-lucide="phone-call" class="w-4 h-4 text-emerald-500 mt-1 shrink-0"></i>
                            <span>Vous contacter en cas d'urgence ou d'annulation.</span>
                        </li>
                    </ul>
                `
            },
            {
                title: "3. Conservation & Droits",
                icon: "clock",
                content: `
                    <p>Les données des comptes inactifs depuis plus de <strong>3 ans</strong> sont anonymisées.</p>
                    <div class="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-900 text-sm">
                        <p class="font-medium mb-1">Vos droits</p>
                        <p>Vous disposez d'un droit d'accès, de modification et de suppression via votre profil ou sur demande aux administrateurs.</p>
                    </div>
                `
            }
        ]
    },
    cgu: {
        title: "Conditions d'Utilisation",
        subtitle: "Règles de bonne conduite et engagements.",
        icon: "scroll-text",
        gradient: "from-amber-500 via-orange-500 to-orange-600",
        alert: {
            title: "Engagement Bénévole",
            icon: "handshake",
            content: "Toute inscription à une mission est un engagement ferme. En cas d'empêchement, désinscrivez-vous au moins 24h à l'avance par respect pour l'équipe et les bénéficiaires."
        },
        sections: [
            {
                title: "Règles de bonne conduite",
                icon: "heart-handshake",
                content: `
                    <ul class="space-y-4">
                        <li class="flex gap-3">
                            <div class="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <i data-lucide="check" class="w-4 h-4 text-green-600"></i>
                            </div>
                            <div>
                                <strong class="text-slate-900">Respect & Courtoisie</strong>
                                <p class="text-sm">Indispensable envers les bénéficiaires, les autres bénévoles et les partenaires.</p>
                            </div>
                        </li>
                        <li class="flex gap-3">
                            <div class="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <i data-lucide="check" class="w-4 h-4 text-green-600"></i>
                            </div>
                            <div>
                                <strong class="text-slate-900">Sécurité</strong>
                                <p class="text-sm">Respect strict des consignes données par les référents lors des missions.</p>
                            </div>
                        </li>
                        <li class="flex gap-3">
                            <div class="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <i data-lucide="check" class="w-4 h-4 text-green-600"></i>
                            </div>
                            <div>
                                <strong class="text-slate-900">Confidentialité</strong>
                                <p class="text-sm">Interdiction formelle de divulguer des informations sur les bénéficiaires rencontrés.</p>
                            </div>
                        </li>
                        <li class="flex gap-3">
                            <div class="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                                <i data-lucide="check" class="w-4 h-4 text-green-600"></i>
                            </div>
                            <div>
                                <strong class="text-slate-900">Exactitude</strong>
                                <p class="text-sm">Vous certifiez que les documents fournis pour votre inscription sont authentiques.</p>
                            </div>
                        </li>
                    </ul>
                `
            }
        ]
    }
};

/**
 * Renders the legal pages with a premium UI
 */
export async function renderLegal(container, params) {
    if (!container) return;
    const type = params.type || 'mentions';
    const data = LEGAL_CONTENT[type] || LEGAL_CONTENT.mentions;

    // Determine back button destination
    const backAction = store.state.user ? 'profile' : 'login';

    const renderSection = (section, index) => `
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 animate-slide-up-subtle" style="animation-delay: ${index * 100}ms">
            <div class="flex items-start gap-5">
                <div class="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 shadow-inner">
                    <i data-lucide="${section.icon}" class="w-6 h-6 text-slate-700"></i>
                </div>
                <div class="flex-1 pt-1">
                    <h3 class="font-bold text-slate-900 text-lg mb-3">${section.title}</h3>
                    <div class="text-slate-600 text-sm leading-relaxed space-y-2">
                        ${section.content}
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = `
        <div class="min-h-screen bg-slate-50/50 pb-20">
            <!-- HERO HEADER with Curved Bottom -->
            <div class="relative bg-gradient-to-br ${data.gradient} pb-24 pt-12 px-6 rounded-b-[2.5rem] shadow-xl shadow-brand-900/10 mb-[-4rem]">
                 <!-- Background Pattern -->
                <div class="absolute inset-0 opacity-10" style="background-image: url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\' %3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\' %3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'1\\' %3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E');"></div>

                <button 
                    data-link="/${backAction}"
                    class="absolute top-6 left-6 flex items-center gap-2 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl transition-all text-sm font-semibold backdrop-blur-md border border-white/10"
                >
                    <i data-lucide="arrow-left" class="w-4 h-4 pointer-events-none"></i>
                    <span class="pointer-events-none">Retour</span>
                </button>

                <div class="max-w-3xl mx-auto text-center text-white mt-10 animate-fade-in relative z-10">
                    <div class="w-20 h-20 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/20 ring-4 ring-white/5">
                        <i data-lucide="${data.icon}" class="w-10 h-10 text-white"></i>
                    </div>
                    <h1 class="text-3xl md:text-5xl font-black mb-4 tracking-tight drop-shadow-sm">${data.title}</h1>
                    <p class="text-blue-50/90 text-lg font-medium max-w-xl mx-auto leading-relaxed">${data.subtitle}</p>
                </div>
            </div>

            <!-- CONTENT CONTAINER -->
            <div class="max-w-3xl mx-auto px-4 md:px-6 space-y-6 relative z-10 pt-4">
                ${data.alert ? `
                <div class="bg-white rounded-2xl p-1.5 shadow-lg shadow-orange-500/10 border border-orange-100 animate-slide-up-subtle">
                    <div class="bg-orange-50/50 rounded-xl p-6 flex flex-col md:flex-row gap-5 items-start">
                        <div class="w-12 h-12 bg-white rounded-xl flex items-center justify-center shrink-0 text-orange-600 shadow-sm border border-orange-100">
                            <i data-lucide="${data.alert.icon}" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-orange-900 text-lg mb-2">${data.alert.title}</h3>
                            <p class="text-orange-800/80 text-sm leading-relaxed">${data.alert.content}</p>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${data.sections.map((section, idx) => renderSection(section, idx)).join('')}
                
                <!-- Footer Note -->
                <div class="text-center pt-8 pb-4 opacity-50 text-xs text-slate-400">
                    &copy; ${new Date().getFullYear()} COP1 Angers. Tous droits réservés.
                </div>
            </div>
        </div>
    `;

    createIcons({ icons, root: container });
}
