import { escapeHtml } from '../../services/utils.js';
import { router } from '../../core/router.js';
import { store } from '../../core/store.js';
import { createIcons } from 'lucide';

export async function renderLegal(container, params) {
    if (!container) return;
    const type = params.type || 'mentions';

    // Header / Back Button logic
    const backAction = store.state.user ? 'profile' : 'login';
    const backBtn = `
        <button class="mb-6 flex items-center gap-2 text-brand-600 font-bold text-sm hover:bg-brand-50 px-3 py-2 rounded-xl transition" onclick="document.dispatchEvent(new CustomEvent('nav-click', {detail: '${backAction}'}))">
            <i data-lucide="arrow-left" class="w-4 h-4"></i> Retour
        </button>
    `;

    let content = '';

    if (type === 'mentions') {
        content = `
            <h2 class="text-2xl font-extrabold text-slate-900 mb-6">Mentions Légales</h2>
            <div class="space-y-6 text-sm text-slate-600 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <section>
                    <h3 class="font-bold text-slate-900 text-base mb-2">1. Éditeur du site</h3>
                    <p><strong>Association COP1 Angers</strong></p>
                    <p>Association loi 1901 à but non lucratif.</p>
                    <p>Siège social : Angers, France</p>
                    <p>Contact : via la messagerie interne de l'application.</p>
                </section>
                <section>
                    <h3 class="font-bold text-slate-900 text-base mb-2">2. Hébergement & Données</h3>
                    <p>L'application est hébergée techniquement (Frontend) sur le navigateur client.</p>
                    <p>Les données et l'authentification sont hébergées par :</p>
                    <p><strong>Supabase Inc.</strong> (basé sur AWS)<br>
                    San Francisco, California, USA.<br>
                    Conforme RGPD (Data Processing Addendum).</p>
                </section>
                <section>
                    <h3 class="font-bold text-slate-900 text-base mb-2">3. Propriété intellectuelle</h3>
                    <p>Le logo et le nom COP1 Angers sont la propriété de l'association. Toute reproduction interdite.</p>
                </section>
            </div>
        `;
    } else if (type === 'privacy') {
        content = `
            <h2 class="text-2xl font-extrabold text-slate-900 mb-6">Politique de Confidentialité</h2>
            <div class="space-y-6 text-sm text-slate-600 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <section>
                    <h3 class="font-bold text-slate-900 text-base mb-2">1. Données collectées</h3>
                    <p>Dans le cadre de votre inscription bénévole, nous collectons via le formulaire :</p>
                    <ul class="list-disc pl-5 mt-1 space-y-1">
                        <li>Identité : Nom, Prénom.</li>
                        <li>Contact : Email, Téléphone.</li>
                        <li>Statut : Possession du Permis B (pour les missions de conduite).</li>
                        <li>Technique : Adresse IP (sécurité Supabase).</li>
                    </ul>
                </section>
                <section>
                    <h3 class="font-bold text-slate-900 text-base mb-2">2. Utilisation des données</h3>
                    <p>Ces données servent uniquement à :</p>
                    <ul class="list-disc pl-5 mt-1 space-y-1">
                        <li>Gérer le planning des distributions.</li>
                        <li>Valider vos heures de bénévolat (attestations écoles).</li>
                        <li>Vous contacter en cas d'urgence sur une mission.</li>
                    </ul>
                </section>
                <section>
                    <h3 class="font-bold text-slate-900 text-base mb-2">3. Durée de conservation</h3>
                    <p>Les comptes inactifs depuis plus de 3 ans sont anonymisés.</p>
                </section>
                <section>
                    <h3 class="font-bold text-slate-900 text-base mb-2">4. Cookies & Services Tiers</h3>
                    <p><strong>Essentiels :</strong> Cookies de session Supabase (connexion).</p>
                </section>
                <section>
                    <h3 class="font-bold text-slate-900 text-base mb-2">5. Vos droits</h3>
                    <p>Vous pouvez modifier vos informations directement dans l'onglet "Profil". Pour supprimer votre compte, contactez un administrateur via la messagerie.</p>
                </section>
            </div>
        `;
    } else if (type === 'cgu') {
        content = `
            <h2 class="text-2xl font-extrabold text-slate-900 mb-6">Conditions d'Utilisation</h2>
            <div class="space-y-6 text-sm text-slate-600 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <p>L'utilisation de l'Espace Bénévoles COP1 Angers implique l'acceptation de ces règles :</p>
                <div class="bg-orange-50 p-4 rounded-xl border border-orange-100 text-orange-800">
                    <h4 class="font-bold mb-1">Engagement Bénévole</h4>
                    <p>Toute inscription à une mission (distribution, collecte...) est un engagement ferme. En cas d'empêchement, vous devez vous désinscrire au moins 24h à l'avance pour ne pas pénaliser l'équipe.</p>
                </div>
                <ul class="list-disc pl-5 space-y-2 mt-4">
                    <li><strong>Respect :</strong> Courtoisie obligatoire envers les bénéficiaires et les autres bénévoles.</li>
                    <li><strong>Sécurité :</strong> Respect strict des consignes données par les référents lors des missions.</li>
                    <li><strong>Confidentialité :</strong> Interdiction de divulguer des informations sur les bénéficiaires rencontrés.</li>
                    <li><strong>Exactitude :</strong> Vous certifiez que les documents fournis sont authentiques.</li>
                </ul>
            </div>
        `;
    } else {
        content = `<div class="text-center py-10">Page introuvable</div>`;
    }

    container.innerHTML = `
        <div class="animate-fade-in max-w-2xl mx-auto pb-20">
            ${backBtn}
            ${content}
        </div>
    `;

    // Note: createIcons is usually handled by the caller or global observer, but strictness helps
    // We didn't import createIcons here to keep it lean, assuming router or Utils handles it? 
    // Wait, previous modules imported it. I should import it too.
    createIcons({ root: container });
}
