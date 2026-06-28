import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD3NascTq7EPJQOg1Hq-XllvZyFiGoQ2Ew",
  authDomain: "tesina-reportes.firebaseapp.com",
  projectId: "tesina-reportes",
  storageBucket: "tesina-reportes.firebasestorage.app",
  messagingSenderId: "777934312943",
  appId: "1:777934312943:web:d6a205db79770b45cb121a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, getDocs };

document.addEventListener('DOMContentLoaded', () => {
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            btn.classList.add('active');
            
            const filterValue = btn.getAttribute('data-filter');
        
            const cardsActualizadas = document.querySelectorAll('.report-card');

            cardsActualizadas.forEach(card => {
                if (filterValue === 'todos' || card.getAttribute('data-category') === filterValue) {
                    card.style.display = 'flex'; 
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
});

let coordenadasReales = { lat: null, lng: null }; // Variable para guardar el GPS

const contenedorMapa = document.getElementById('mapa');

if (contenedorMapa) {
    const map = L.map('mapa').setView([19.4326, -99.1332], 13); 
    document.getElementById('btn-limpiar')?.addEventListener('click', () => {
        map.setView([19.4326, -99.1332], 13); 
        marcador.setLatLng([19.4326, -99.1332]);
        coordenadasReales = { lat: null, lng: null };
        alert("Datos de navegación borrados.");
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
    let marcador = L.marker([19.4326, -99.1332], { draggable: true }).addTo(map);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            coordenadasReales = { lat, lng }; // Guardamos las coordenadas reales
            map.setView([lat, lng], 17);
            marcador.setLatLng([lat, lng]);
        }, () => {
            console.log("El usuario no dio permisos de GPS o falló.");
        });
    }
    marcador.on('dragend', function (e) {
        const posicion = marcador.getLatLng();
        coordenadasReales = { lat: posicion.lat, lng: posicion.lng };
    });
}

let archivoFoto = null; 

const btnFoto = document.getElementById('btn-foto');
const inputFoto = document.getElementById('input-foto');
const previewFoto = document.getElementById('preview-foto');
const iconoCamara = document.getElementById('icono-camara');
const textoCamara = document.getElementById('texto-camara');

if (btnFoto && inputFoto) {
    btnFoto.addEventListener('click', () => inputFoto.click());

    inputFoto.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            archivoFoto = e.target.files[0];
            const objectUrl = URL.createObjectURL(archivoFoto);
            previewFoto.src = objectUrl;
            previewFoto.style.display = 'block';
            iconoCamara.style.display = 'none';
            textoCamara.innerText = 'Toca para cambiar la foto';
            btnFoto.style.padding = '15px';
        }
    });
}

const formNuevoReporte = document.getElementById('form-nuevo-reporte');

if (formNuevoReporte) {
    formNuevoReporte.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnEnviar = document.getElementById('btn-enviar');
        const textoOriginal = btnEnviar.innerText;
        btnEnviar.innerText = "ENVIANDO...";
        btnEnviar.disabled = true;

        const categoriaSeleccionada = document.querySelector('input[name="categoria"]:checked').value;
        const detalles = document.querySelector('textarea').value;

        try {
            let urlDescarga = "sin-foto-aun";

            if (archivoFoto) {
                btnEnviar.innerText = "SUBIENDO FOTO...";
                
                const formData = new FormData();
                formData.append('image', archivoFoto);

                const respuestaImgbb = await fetch('https://api.imgbb.com/1/upload?key=e1a59a1f20ccbf652fea8d19ee19f467', {
                    method: 'POST',
                    body: formData
                });
                
                const datosImgbb = await respuestaImgbb.json();
                
                if (datosImgbb.success) {
                    urlDescarga = datosImgbb.data.url; 
                } else {
                    throw new Error("Fallo al subir a ImgBB");
                }
            }

            btnEnviar.innerText = "GUARDANDO REPORTE...";

            await addDoc(collection(db, "reportes"), {
                categoria: categoriaSeleccionada,
                detalles: detalles,
                estado: "En revisión",
                fecha: new Date(), 
                ubicacion: coordenadasReales, 
                fotoUrl: urlDescarga 
            });

            alert("¡Reporte ciudadano enviado con éxito!");
            window.location.href = 'index.html';

        } catch (error) {
            console.error("Error en el proceso: ", error);
            alert("Hubo un error al procesar el reporte.");
            btnEnviar.innerText = textoOriginal;
            btnEnviar.disabled = false;
        }
    });
}

const reportsList = document.querySelector('.reports-list');

if (reportsList) {
    const cargarReportes = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "reportes"));

            reportsList.innerHTML = ''; 
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                
                let icono = 'fa-circle-exclamation'; 
                if (data.categoria === 'agua') icono = 'fa-droplet';
                if (data.categoria === 'luz') icono = 'fa-bolt';
                if (data.categoria === 'basura') icono = 'fa-trash-can';
                // Reemplaza tu string literal de cardHTML por esto:
                const card = document.createElement('div');
                card.className = 'report-card';
                card.setAttribute('data-category', data.categoria);
                card.innerHTML = `
                    <span class="status-badge status-review">${data.estado}</span>
                    <div class="card-content">
                        <div class="card-text">
                            <h2 style="text-transform: capitalize;">${data.categoria}</h2>
                            <p>Toca para ver detalles</p>
                        </div>
                        <div class="card-icon"><i class="fa-solid ${icono}"></i></div>
                    </div>
                `;
                // Al hacer clic, llenamos el modal y lo abrimos
                card.addEventListener('click', () => {
                    document.getElementById('modal-cat').innerText = data.categoria;
                    document.getElementById('modal-det').innerText = data.detalles || 'Sin detalles';
                    document.getElementById('modal-img').src = data.fotoUrl !== 'sin-foto-aun' ? data.fotoUrl : '';
                    document.getElementById('modal-reporte').showModal();
                });
                reportsList.appendChild(card);
            });
        } catch (error) {
            console.error("Error al cargar los reportes: ", error);
        }
    };
    cargarReportes();
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        console.log('Service Worker soportado. Listo para PWA.');
    });
}