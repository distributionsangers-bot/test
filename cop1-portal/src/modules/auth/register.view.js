
import { supabase } from '../../services/supabase.js';
import { toggleLoader, showToast } from '../../services/utils.js';
import { createIcons } from 'lucide';

const LOGO_URL = "logo.png";

export function renderRegister() {
    return `
        <div class="h-full w-full bg-white overflow-y-auto scroll-smooth">
            <div class="min-h-full flex flex-col justify-center px-6 py-10 max-w-md mx-auto">
                <div class="text-center mb-8"> 
                    <img src="${LOGO_URL}" class="w-20 h-20 mx-auto mb-4 object-contain" alt="Logo">
                    <h1 class="text-3xl font-extrabold text-slate-900">Inscription</h1>
                </div>

                <div class="bg-slate-50 p-1 rounded-xl mb-6 flex shrink-0">
                    <button data-link="/login" class="flex-1 py-3 rounded-lg text-sm font-bold text-slate-400 hover:text-slate-600 transition">Connexion</button>
                    <button class="flex-1 py-3 rounded-lg text-sm font-bold bg-white text-brand-600 shadow-sm transition cursor-default">Inscription</button>
                </div>

                <form id="form-register" class="space-y-3 animate-fade-in pb-4">
                    <div class="grid grid-cols-2 gap-3">
                        <input id="reg-fn" type="text" placeholder="Prénom" required class="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold outline-none border focus:border-brand-500">
                        <input id="reg-ln" type="text" placeholder="Nom" required class="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold outline-none border focus:border-brand-500">
                    </div>
                    <input id="reg-email" type="email" placeholder="Email" required class="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold outline-none border focus:border-brand-500">
                    <input id="reg-phone" type="tel" placeholder="Téléphone" required class="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold outline-none border focus:border-brand-500">
                    <input id="reg-pass" type="password" placeholder="Mot de passe" required class="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold outline-none border focus:border-brand-500">
                    
                    <label class="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                        <input type="checkbox" id="reg-permit" class="w-5 h-5 text-brand-600 rounded">
                        <span class="text-sm font-bold text-slate-600">J'ai le Permis B 🚗</span>
                    </label>

                    <div class="mb-4">
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Justificatif (Carte Étudiant)</label>
                        
                        <div id="upload-zone" class="relative group cursor-pointer bg-slate-50 border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center transition-all hover:bg-white">
                            
                            <input id="reg-proof" type="file" required accept="image/*,.pdf" class="hidden">
                            
                            <div id="upload-default" class="flex flex-col items-center gap-2">
                                <div class="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-brand-600 group-hover:scale-110 transition">
                                    <i data-lucide="cloud-upload" class="w-6 h-6"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-slate-700">Cliquez pour ajouter</p>
                                    <p class="text-[10px] text-slate-400 font-medium mt-1">PDF, JPG ou PNG (Max 5 Mo)</p>
                                </div>
                            </div>

                            <div id="upload-success" class="hidden flex-col items-center gap-2 animate-fade-in">
                                <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                    <i data-lucide="check" class="w-6 h-6"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-slate-900" id="file-name-display"></p>
                                    <p class="text-[10px] text-brand-600 font-bold mt-1">Changer le fichier</p>
                                </div>
                            </div>

                        </div>
                    </div>
                    
                    <label class="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl cursor-pointer hover:bg-orange-100 transition">
                        <input type="checkbox" id="reg-mandatory" class="w-5 h-5 text-orange-500 rounded mt-0.5">
                        <div><span class="text-sm font-bold text-orange-900 block">Heures Obligatoires</span><span class="text-[10px] text-orange-700">Pour validation stage/école.</span></div>
                    </label>
                    <button type="submit" class="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-lg mt-2 hover:bg-brand-700 active:scale-95 transition">Créer mon compte</button>
                    
                    <div class="pt-4 text-center flex justify-center gap-4 text-[10px] text-slate-400 font-bold">
                        <button type="button" data-link="/legal/mentions" class="hover:text-slate-600">Mentions</button> •
                        <button type="button" data-link="/legal/privacy" class="hover:text-slate-600">Données</button> •
                        <button type="button" data-link="/legal/cgu" class="hover:text-slate-600">CGU</button>
                    </div>
                </form>
            </div>
        </div>
    `;
}

export function initRegister() {
    createIcons();

    const form = document.getElementById('form-register');
    const fileInput = document.getElementById('reg-proof');
    const uploadZone = document.getElementById('upload-zone');
    const def = document.getElementById('upload-default');
    const suc = document.getElementById('upload-success');
    const nameDisplay = document.getElementById('file-name-display');

    // 1. Gestion du clic sur la zone d'upload
    if (uploadZone && fileInput) {
        uploadZone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];

                // UX : Mise à jour du design (Vert = Succès)
                uploadZone.classList.remove('border-slate-300', 'bg-slate-50');
                uploadZone.classList.add('border-green-500', 'bg-green-50');

                def.classList.add('hidden');
                suc.classList.remove('hidden');
                suc.style.display = 'flex';

                // Affichage du nom (tronqué si trop long)
                nameDisplay.innerText = file.name.length > 25 ? file.name.substring(0, 20) + '...' : file.name;

            } else {
                // Reset si annulation
                uploadZone.classList.add('border-slate-300', 'bg-slate-50');
                uploadZone.classList.remove('border-green-500', 'bg-green-50');

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
                        .from('proofs')
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
