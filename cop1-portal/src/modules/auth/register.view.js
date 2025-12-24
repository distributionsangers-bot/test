
import { supabase } from '../../services/supabase.js'; // Import direct nécessaire pour upload
import { toggleLoader, showToast } from '../../services/utils.js';
import { createIcons } from 'lucide';

export function renderRegister() {
    return `
        <div class="h-full w-full bg-white overflow-y-auto scroll-smooth">
            <div class="min-h-full flex flex-col justify-center px-6 py-10 max-w-md mx-auto">
                <div class="text-center mb-8"> 
                    <img src="logo.png" class="w-20 h-20 mx-auto mb-4 object-contain">
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
                    
                    <label class="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" id="reg-permit" class="w-5 h-5 text-brand-600 rounded">
                        <span class="text-sm font-bold text-slate-600">J'ai le Permis B 🚗</span>
                    </label>

                    <div class="mb-4">
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Justificatif (Carte Étudiant)</label>
                        <div id="upload-zone" class="relative group cursor-pointer bg-slate-50 border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center transition">
                            <input id="reg-proof" type="file" required accept="image/*,.pdf" class="hidden">
                            <div id="upload-default" class="flex flex-col items-center gap-2">
                                <i data-lucide="cloud-upload" class="w-8 h-8 text-brand-600"></i>
                                <p class="text-sm font-bold text-slate-700">Cliquez pour ajouter</p>
                            </div>
                            <div id="upload-success" class="hidden flex-col items-center gap-2">
                                <i data-lucide="check" class="w-8 h-8 text-green-600"></i>
                                <p class="text-sm font-bold text-slate-900" id="file-name-display"></p>
                            </div>
                        </div>
                    </div>
                    
                    <label class="flex items-start gap-3 p-3 bg-orange-50 border border-orange-100 rounded-xl cursor-pointer">
                        <input type="checkbox" id="reg-mandatory" class="w-5 h-5 text-orange-500 rounded mt-0.5">
                        <div><span class="text-sm font-bold text-orange-900 block">Heures Obligatoires</span><span class="text-[10px] text-orange-700">Pour validation stage/école.</span></div>
                    </label>
                    <button type="submit" class="w-full py-4 bg-brand-600 text-white font-bold rounded-2xl shadow-lg mt-2 hover:bg-brand-700">Créer mon compte</button>
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

    uploadZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) {
            const file = fileInput.files[0];
            uploadZone.classList.add('border-green-500', 'bg-green-50');
            document.getElementById('upload-default').classList.add('hidden');
            document.getElementById('upload-success').classList.remove('hidden');
            document.getElementById('upload-success').style.display = 'flex';
            document.getElementById('file-name-display').innerText = file.name;
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputs = {
            fn: document.getElementById('reg-fn').value.trim(),
            ln: document.getElementById('reg-ln').value.trim(),
            email: document.getElementById('reg-email').value.trim(),
            phone: document.getElementById('reg-phone').value.trim(),
            pass: document.getElementById('reg-pass').value.trim(),
            permit: document.getElementById('reg-permit').checked,
            mandatory: document.getElementById('reg-mandatory').checked
        };
        const file = fileInput.files[0];

        if (!inputs.fn || !inputs.ln || !inputs.email || !inputs.pass) return showToast("Champs manquants", "error");
        if (!file) return showToast("Justificatif requis", "error");

        toggleLoader(true);
        try {
            const { data, error } = await supabase.auth.signUp({
                email: inputs.email,
                password: inputs.pass,
                options: {
                    data: {
                        first_name: inputs.fn,
                        last_name: inputs.ln,
                        phone: inputs.phone,
                        has_permit: inputs.permit,
                        mandatory_hours: inputs.mandatory
                    }
                }
            });
            if (error) throw error;

            if (data.user) {
                await supabase.storage.from('proofs').upload(data.user.id, file, { upsert: true });
            }
            showToast("Inscription réussie ! Redirection...", "success");
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            toggleLoader(false);
        }
    });
}
