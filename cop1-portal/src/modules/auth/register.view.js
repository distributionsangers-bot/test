
import { AuthService } from '../../services/auth.js';
import { toggleLoader, showToast } from '../../services/utils.js';
import { createIcons } from 'lucide';
import { router } from '../../core/router.js';

const LOGO_URL = "logo.png";

/**
 * Renders the Register View HTML.
 */
export function renderRegister() {
    return `
        <div class="h-full w-full bg-white overflow-y-auto scroll-smooth">
            <div class="min-h-full flex flex-col justify-center px-6 py-10 max-w-md mx-auto">
                
                <div class="text-center mb-8"> 
                    <img src="${LOGO_URL}" class="w-20 h-20 mx-auto mb-4 object-contain" alt="Logo">
                    <h1 class="text-3xl font-extrabold text-slate-900">Espace Bénévoles</h1>
                    <p class="text-slate-500">COP1 Angers</p>
                </div>
                
                <div class="bg-slate-50 p-1 rounded-xl mb-6 flex shrink-0">
                    <button data-link="login" class="flex-1 py-3 rounded-lg text-sm font-bold text-slate-400 hover:text-slate-600 transition">Connexion</button>
                    <button class="flex-1 py-3 rounded-lg text-sm font-bold bg-white text-brand-600 shadow-sm transition default-cursor">Inscription</button>
                </div>

                <form id="form-register" class="space-y-3 animate-fade-in pb-4">
                    <div class="grid grid-cols-2 gap-3">
                        <input id="reg-fn" type="text" placeholder="Prénom" required class="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-brand-500">
                        <input id="reg-ln" type="text" placeholder="Nom" required class="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-brand-500">
                    </div>
                    <input id="reg-email" type="email" placeholder="Email" required class="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-brand-500">
                    <input id="reg-phone" type="tel" placeholder="Téléphone" required class="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-brand-500">
                    <input id="reg-pass" type="password" placeholder="Mot de passe" required class="w-full px-4 py-3 bg-slate-50 rounded-xl font-bold border-none outline-none focus:ring-2 focus:ring-brand-500">
                    
                    <label class="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                        <input type="checkbox" id="reg-permit" class="w-5 h-5 text-brand-600 rounded focus:ring-brand-500">
                        <span class="text-sm font-bold text-slate-600">J'ai le Permis B 🚗</span>
                    </label>

                    <div class="mb-4">
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Justificatif (Carte Étudiant)</label>
                        
                        <div id="upload-zone" class="relative group cursor-pointer bg-slate-50 hover:bg-white border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 transition-all text-center">
                            
                            <input id="reg-proof" type="file" required accept="image/*,.pdf" class="hidden">
                            
                            <div id="upload-default" class="flex flex-col items-center gap-2 pointer-events-none">
                                <div class="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-brand-600 group-hover:scale-110 transition">
                                    <i data-lucide="cloud-upload" class="w-6 h-6"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-slate-700">Cliquez pour ajouter</p>
                                    <p class="text-[10px] text-slate-400 font-medium mt-1">PDF, JPG ou PNG (Max 5 Mo)</p>
                                </div>
                            </div>

                            <div id="upload-success" class="hidden flex-col items-center gap-2 animate-fade-in pointer-events-none">
                                <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                    <i data-lucide="check" class="w-6 h-6"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-slate-900" id="file-name-display">Fichier.pdf</p>
                                    <p class="text-[10px] text-brand-600 font-bold mt-1">Changer le fichier</p>
                                </div>
                            </div>

                        </div>
                    </div>
                    
                    <label class="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl cursor-pointer hover:bg-orange-100 transition">
                        <input type="checkbox" id="reg-mandatory" class="w-5 h-5 text-orange-500 rounded mt-0.5 focus:ring-orange-500">
                        <div><span class="text-sm font-bold text-orange-900 block">Heures Obligatoires</span><span class="text-[10px] text-orange-700">Pour validation stage/école.</span></div>
                    </label>
                    <button type="submit" class="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-lg mt-2 active:scale-95 transition">Créer mon compte</button>
                    
                     <div class="pt-4 text-center">
                        <button type="button" data-link="login" class="text-xs font-bold text-slate-400 hover:text-brand-600 transition">Déjà un compte ? Connexion</button>
                    </div>

                </form>
            </div>
        </div>
    `;
}

/**
 * Initializes the Register View logic.
 */
export function initRegister() {
    createIcons();

    // File Upload UX
    const dropZone = document.getElementById('upload-zone');
    const input = document.getElementById('reg-proof');

    if (dropZone && input) {
        dropZone.addEventListener('click', () => input.click());
        input.addEventListener('change', () => handleFileSelect(input));
    }

    // Form Submit
    const form = document.getElementById('form-register');
    if (form) {
        form.addEventListener('submit', handleRegisterSubmit);
    }
}

function handleFileSelect(input) {
    const zone = document.getElementById('upload-zone');
    const def = document.getElementById('upload-default');
    const suc = document.getElementById('upload-success');
    const name = document.getElementById('file-name-display');

    if (input.files && input.files[0]) {
        const file = input.files[0];
        zone.classList.remove('border-slate-300', 'bg-slate-50');
        zone.classList.add('border-green-500', 'bg-green-50');
        def.classList.add('hidden');
        suc.classList.remove('hidden');
        suc.style.display = 'flex';
        name.innerText = file.name.length > 25 ? file.name.substring(0, 20) + '...' : file.name;
    } else {
        zone.classList.add('border-slate-300', 'bg-slate-50');
        zone.classList.remove('border-green-500', 'bg-green-50');
        def.classList.remove('hidden');
        suc.classList.add('hidden');
        suc.style.display = 'none';
    }
}

async function handleRegisterSubmit(e) {
    e.preventDefault();

    // UX : Clean errors
    const form = e.target;
    const inputs = form.querySelectorAll('input');
    inputs.forEach(i => i.classList.remove('ring-2', 'ring-red-500', 'bg-red-50'));

    const fn = document.getElementById('reg-fn').value.trim();
    const ln = document.getElementById('reg-ln').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();
    const has_permit = document.getElementById('reg-permit').checked;
    const mandatory_hours = document.getElementById('reg-mandatory').checked;
    const fileInput = document.getElementById('reg-proof');

    // Validation
    let hasError = false;
    if (!fn) { document.getElementById('reg-fn').classList.add('ring-2', 'ring-red-500'); hasError = true; }
    if (!ln) { document.getElementById('reg-ln').classList.add('ring-2', 'ring-red-500'); hasError = true; }
    if (!email) { document.getElementById('reg-email').classList.add('ring-2', 'ring-red-500'); hasError = true; }
    if (!pass) { document.getElementById('reg-pass').classList.add('ring-2', 'ring-red-500'); hasError = true; }
    if (!fileInput.files.length) { showToast("Justificatif requis", "error"); hasError = true; }

    if (hasError) return showToast('Veuillez remplir les champs rouges', 'error');

    toggleLoader(true);

    const file = fileInput.files[0];
    if (file.size > 5 * 1024 * 1024) {
        toggleLoader(false);
        return showToast("Fichier trop lourd (Max 5 Mo)", "error");
    }

    try {
        // 1. Register with metadata
        const { user, error } = await AuthService.register(email, pass, {
            first_name: fn,
            last_name: ln,
            phone: phone,
            has_permit: has_permit,
            mandatory_hours: mandatory_hours
        });

        if (error) throw error;
        if (!user) throw new Error("Erreur session.");

        // 2. Upload Proof (User exists now)
        const { error: uploadError } = await AuthService.uploadProof(user.id, file);

        if (uploadError) {
            console.error("Upload Error:", uploadError);
            showToast("Compte créé mais erreur d'envoi fichier.", "warning");
        } else {
            showToast("Inscription réussie ! Bienvenue.", "success");
        }

        // 3. Reload to enter app logic
        setTimeout(() => window.location.reload(), 1000);

    } catch (err) {
        console.error(err);
        showToast(err.message || "Erreur inscription", "error");
    } finally {
        toggleLoader(false);
    }
}
