
import { supabase } from '../../services/supabase.js';
import { toggleLoader, showToast } from '../../services/utils.js';
import { createIcons, icons } from 'lucide';
import { APP_CONFIG } from '../../core/constants.js';

const { LOGO_URL, BUCKET_PROOF } = APP_CONFIG;

export function renderRegister() {
    return `
        <div class="min-h-screen w-full bg-slate-50 relative overflow-hidden flex flex-col items-center justify-center p-4">
            <!-- Background Decorations -->
            <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div class="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] bg-blue-400/20 rounded-full blur-[100px] animate-pulse-slow"></div>
                <div class="absolute top-[40%] -left-[10%] w-[60vw] h-[60vw] bg-brand-400/20 rounded-full blur-[100px] animate-pulse-slow" style="animation-delay: 1s;"></div>
            </div>

            <!-- Card -->
            <div class="relative w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-6 sm:p-8 z-10 animate-fade-in max-h-[90vh] overflow-y-auto no-scrollbar">
                
                <!-- Header -->
                <div class="text-center mb-6"> 
                    <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-50 to-white shadow-sm mb-3 border border-brand-100/50">
                        <img src="${LOGO_URL}" class="w-10 h-10 object-contain" alt="Logo">
                    </div>
                    <h1 class="text-2xl font-extrabold text-slate-800 tracking-tight">Inscription</h1>
                    <p class="text-slate-500 text-sm font-medium">Rejoignez la communauté COP1</p>
                </div>

                <!-- Segmented Control -->
                <div class="bg-slate-100/80 p-1.5 rounded-2xl mb-6 flex relative">
                    <button data-link="/login" class="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-all duration-300">Connexion</button>
                    <button class="flex-1 py-2.5 rounded-xl text-sm font-bold bg-white text-brand-600 shadow-sm transition-all duration-300 cursor-default">Inscription</button>
                </div>

                <!-- Form -->
                <form id="form-register" class="space-y-4 pb-4">
                    <div class="grid grid-cols-2 gap-3">
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-slate-500 uppercase ml-1">Prénom</label>
                            <input id="reg-fn" type="text" required class="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="Prénom">
                        </div>
                        <div class="space-y-1">
                            <label class="text-[10px] font-bold text-slate-500 uppercase ml-1">Nom</label>
                            <input id="reg-ln" type="text" required class="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="Nom">
                        </div>
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] font-bold text-slate-500 uppercase ml-1">Email</label>
                        <div class="relative">
                            <i data-lucide="mail" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                            <input id="reg-email" type="email" autocomplete="username" required class="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="exemple@email.com">
                        </div>
                    </div>

                     <div class="space-y-1">
                        <label class="text-[10px] font-bold text-slate-500 uppercase ml-1">Téléphone</label>
                        <div class="relative">
                            <i data-lucide="phone" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                            <input id="reg-phone" type="tel" required class="w-full pl-10 pr-4 py-3 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="06 12 34 56 78">
                        </div>
                    </div>

                    <div class="space-y-1">
                        <label class="text-[10px] font-bold text-slate-500 uppercase ml-1">Mot de passe</label>
                        <div class="relative group">
                            <i data-lucide="lock" class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                            <input id="reg-pass" type="password" autocomplete="new-password" required class="w-full pl-10 pr-12 py-3 bg-slate-50/50 border border-slate-200 rounded-xl font-semibold text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all duration-300" placeholder="••••••••">
                            <button type="button" id="toggle-reg-password" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors" tabindex="-1">
                                <i data-lucide="eye" class="w-5 h-5"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Checkboxes -->
                    <label class="flex items-center gap-3 p-3 bg-white/50 border border-slate-200 rounded-xl cursor-pointer hover:bg-white transition-all shadow-sm group">
                        <input type="checkbox" id="reg-permit" class="w-5 h-5 text-brand-600 rounded border-slate-300 focus:ring-brand-500 transition-all">
                        <span class="text-sm font-semibold text-slate-600 group-hover:text-slate-800 transition-colors">J'ai le Permis B 🚗</span>
                    </label>

                    <div class="space-y-2 pt-2">
                        <label class="block text-xs font-bold text-slate-500 uppercase ml-1">Justificatif (Carte Étudiant)</label>
                        
                        <div id="upload-zone" class="relative group cursor-pointer bg-slate-50/50 border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center transition-all hover:bg-white/80 hover:shadow-lg hover:shadow-brand-500/5">
                            
                            <input id="reg-proof" type="file" required accept="image/*,.pdf" class="hidden">
                            
                            <div id="upload-default" class="flex flex-col items-center gap-2">
                                <div class="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-brand-600 group-hover:scale-110 group-hover:text-brand-700 transition-all duration-300 ring-4 ring-slate-50 group-hover:ring-brand-50">
                                    <i data-lucide="cloud-upload" class="w-6 h-6"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-slate-700 group-hover:text-brand-700 transition-colors">Cliquez pour ajouter</p>
                                    <p class="text-[10px] text-slate-400 font-medium mt-1">PDF, JPG ou PNG (Max 5 Mo)</p>
                                </div>
                            </div>

                            <div id="upload-success" class="hidden flex-col items-center gap-2 animate-fade-in">
                                <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-sm ring-4 ring-green-50">
                                    <i data-lucide="check" class="w-6 h-6"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-slate-900" id="file-name-display"></p>
                                    <p class="text-[10px] text-brand-600 font-bold mt-1 hover:underline">Changer le fichier</p>
                                </div>
                            </div>

                        </div>
                    </div>
                    
                    <label class="flex items-start gap-3 p-3 bg-orange-50/80 border border-orange-100 rounded-xl cursor-pointer hover:bg-orange-100 transition-all shadow-sm mt-2">
                        <input type="checkbox" id="reg-mandatory" class="w-5 h-5 text-orange-500 rounded mt-0.5 border-orange-200 focus:ring-orange-500">
                        <div><span class="text-sm font-bold text-orange-900 block">Heures Obligatoires</span><span class="text-[10px] text-orange-700">Pour validation stage/école.</span></div>
                    </label>

                    <button type="submit" class="w-full py-4 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold rounded-2xl shadow-lg shadow-brand-500/30 mt-4 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                        Créer mon compte
                    </button>
                    
                    <div class="pt-4 text-center flex justify-center gap-4 text-[10px] text-slate-400 font-bold">
                        <button type="button" data-link="/legal/mentions" class="hover:text-slate-600 transition-colors">Mentions</button> •
                        <button type="button" data-link="/legal/privacy" class="hover:text-slate-600 transition-colors">Données</button> •
                        <button type="button" data-link="/legal/cgu" class="hover:text-slate-600 transition-colors">CGU</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

export function initRegister() {
    createIcons({ icons });

    const form = document.getElementById('form-register');
    const fileInput = document.getElementById('reg-proof');
    const uploadZone = document.getElementById('upload-zone');
    const def = document.getElementById('upload-default');
    const suc = document.getElementById('upload-success');
    const nameDisplay = document.getElementById('file-name-display');

    // 0. Password Toggle
    const toggleBtn = document.getElementById('toggle-reg-password');
    const passInput = document.getElementById('reg-pass');
    if (toggleBtn && passInput) {
        toggleBtn.addEventListener('click', () => {
            const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passInput.setAttribute('type', type);

            // Update Icon
            toggleBtn.innerHTML = `<i data-lucide="${type === 'password' ? 'eye' : 'eye-off'}" class="w-5 h-5"></i>`;
            createIcons({ icons, nameAttr: 'data-lucide', attrs: { class: "w-5 h-5" } });
        });
    }

    // 1. Gestion du clic sur la zone d'upload
    if (uploadZone && fileInput) {
        uploadZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];

                // UX : Mise à jour du design (Vert = Succès)
                uploadZone.classList.remove('border-slate-300', 'bg-slate-50/50');
                uploadZone.classList.add('border-green-500', 'bg-green-50/50');

                def.classList.add('hidden');
                suc.classList.remove('hidden');
                suc.style.display = 'flex';

                // Affichage du nom (tronqué si trop long)
                nameDisplay.innerText = file.name.length > 25 ? file.name.substring(0, 20) + '...' : file.name;

            } else {
                // Reset si annulation
                uploadZone.classList.add('border-slate-300', 'bg-slate-50/50');
                uploadZone.classList.remove('border-green-500', 'bg-green-50/50');

                def.classList.remove('hidden');
                suc.classList.add('hidden');
                suc.style.display = 'none';
            }
        });
    }

    // 2. Gestion du Submit
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Gather inputs
            const fn = document.getElementById('reg-fn').value.trim();
            const ln = document.getElementById('reg-ln').value.trim();
            const email = document.getElementById('reg-email').value.trim();
            const phone = document.getElementById('reg-phone').value.trim();
            const pass = document.getElementById('reg-pass').value.trim();
            const permit = document.getElementById('reg-permit').checked;
            const mandatory = document.getElementById('reg-mandatory').checked;

            const file = fileInput.files[0];

            if (!fn || !ln || !email || !pass || !phone) return showToast("Veuillez remplir tous les champs", "error");
            if (!file) return showToast("Le justificatif étudiant est obligatoire", "error");

            toggleLoader(true);
            try {
                // A. CREATION DU COMPTE
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: pass,
                    options: {
                        data: {
                            first_name: fn,
                            last_name: ln,
                            phone: phone,
                            has_permit: permit,
                            mandatory_hours: mandatory
                        }
                    }
                });

                if (error) throw error;

                // B. UPLOAD DU FICHIER
                if (data.user) {
                    const { error: uploadError } = await supabase.storage
                        .from(BUCKET_PROOF)
                        .upload(data.user.id, file, { upsert: true });

                    if (uploadError) {
                        console.error('Upload error:', uploadError);
                        // On ne bloque pas l'inscription mais on prévient
                        showToast("Compte créé mais erreur d'upload. Contactez un admin.", "warning");
                    }
                }

                showToast("Inscription réussie ! Redirection...", "success");

                // C. REDIRECTION (Reload pour initier la session proprement)
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (err) {
                console.error(err);
                showToast(err.message, "error");
                toggleLoader(false);
            }
        });
    }
}
